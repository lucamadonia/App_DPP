-- =============================================================================
-- Migration: workflow mails caused by public events are capped and sanitised
-- Date: 2026-10-01 (suffix g) — go-live re-audit RLS-2
--
-- Requires 20260921_durable_workflows.sql, 20261001c (customer-session helper)
-- and 20261001d (rate_limit_hit, sanitize_public_mail_text, insert guard).
--
-- Problem: anonymous visitors (public returns portal, public tickets, widerruf
-- button) and customer-portal users create returns/tickets that fire the
-- tenant's durable workflows. An email_send_* action then mailed the
-- visitor-chosen address with visitor-chosen free text, without any of the
-- public_enqueue_notification limits (IP/tenant/recipient/global caps,
-- sanitize_public_mail_text). 20261001c also moves existing return_* rules to
-- the durable engine, which made this reachable for every public return.
--
-- What this does:
--   1. workflow_capture_event() records the event origin in the run context:
--      'public' when the change comes from anon, a customer-portal session,
--      the creation of a row with a public metadata.source (e.g. widerruf
--      button via service role) or a run that is itself public; otherwise
--      'tenant'.
--   2. workflow_step() propagates the origin to chained runs and, for public
--      runs, passes visitor-controlled variables (customerName, firstName,
--      subject) through sanitize_public_mail_text() and applies the
--      public_enqueue_notification buckets (100/h per tenant, 5/h per
--      recipient and tenant, 1000/h global). A capped mail fails the run with
--      a visible error instead of being sent.
--   3. The rh_notifications insert guard (20261001d) additionally applies the
--      tenant tier caps to every workflow mail (metadata.source='workflow').
--
-- Both functions are full copies of 20260921 with the changes marked "RLS-2".
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.workflow_capture_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE events text[] := '{}'; evt text; rule public.rh_workflow_rules; ctx jsonb; chain uuid[];
  v_claims jsonb; v_role text; v_origin text := 'tenant';
BEGIN
  chain := coalesce(nullif(current_setting('trackbliss.workflow_chain',true),'')::uuid[],'{}');
  -- RLS-2: where did this change come from?
  BEGIN
    v_claims := nullif(current_setting('request.jwt.claims',true),'')::jsonb;
  EXCEPTION WHEN others THEN v_claims := NULL;
  END;
  v_role := coalesce(v_claims->>'role',nullif(current_setting('request.jwt.claim.role',true),''),'');
  IF coalesce(current_setting('trackbliss.workflow_origin',true),'')='public' OR v_role='anon' THEN
    v_origin := 'public';
  ELSIF v_role='authenticated' AND public._rh_is_customer_only_session() THEN
    v_origin := 'public';
  -- Rows created on behalf of visitors by edge functions (service role, e.g.
  -- widerruf-request). Only the creation event: later changes by tenant
  -- staff on such a return/ticket are tenant events.
  ELSIF TG_OP='INSERT' AND TG_TABLE_NAME IN ('rh_returns','rh_tickets')
    AND coalesce(to_jsonb(NEW)#>>'{metadata,source}','') IN
      ('public_portal','customer_portal','public_product_page','public_return_portal','public_tracking','widerruf_button') THEN
    v_origin := 'public';
  END IF;
  ctx := jsonb_build_object('tenantId',NEW.tenant_id,'origin',v_origin);
  IF TG_TABLE_NAME='rh_returns' THEN
    ctx := ctx || jsonb_build_object('returnId',NEW.id,'customerId',NEW.customer_id);
    IF TG_OP='INSERT' THEN events:=ARRAY['return_created'];
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN events:=ARRAY['return_status_changed']; ctx:=ctx||jsonb_build_object('previousStatus',OLD.status); END IF;
  ELSIF TG_TABLE_NAME='rh_tickets' THEN
    ctx := ctx || jsonb_build_object('ticketId',NEW.id,'returnId',NEW.return_id,'customerId',NEW.customer_id);
    IF TG_OP='INSERT' THEN events:=ARRAY['ticket_created'];
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN events:=ARRAY['ticket_status_changed']; ctx:=ctx||jsonb_build_object('previousStatus',OLD.status); END IF;
  ELSE
    ctx := ctx || jsonb_build_object('customerId',NEW.id);
    IF TG_OP='UPDATE' THEN
      IF NEW.risk_score IS DISTINCT FROM OLD.risk_score THEN events:=array_append(events,'customer_risk_changed'); END IF;
      IF NOT coalesce(OLD.tags,'{}') @> coalesce(NEW.tags,'{}') THEN events:=array_append(events,'customer_tag_added'); END IF;
      ctx:=ctx||jsonb_build_object('previousRiskScore',OLD.risk_score,'previousTags',OLD.tags);
    END IF;
  END IF;
  FOREACH evt IN ARRAY events LOOP
    FOR rule IN SELECT * FROM public.rh_workflow_rules WHERE tenant_id=NEW.tenant_id AND trigger_type=evt AND active AND server_execution LOOP
      PERFORM public.workflow_enqueue(rule,gen_random_uuid()::text,ctx||jsonb_build_object('eventType',evt),chain);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_step(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.rh_workflow_runs; node jsonb; cond jsonb; params jsonb; ctx jsonb; entity jsonb;
  node_id text; kind text; action text; branch text; matched boolean; logic text;
  rid uuid; tid uuid; cid uuid; assignee uuid; new_id uuid; old_status text; value text;
  seconds numeric; template public.rh_email_templates; subject text; body text; vars jsonb; k text; v text;
  recipient text; rest text[]; next_nodes text[]; current_chain text;
  current_origin text; is_public boolean; v_ok boolean;
BEGIN
  SELECT * INTO job FROM public.rh_workflow_runs WHERE id=p_id AND status IN ('queued','waiting') AND available_at<=now() FOR UPDATE SKIP LOCKED;
  IF job.id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rh_workflow_rules WHERE id=job.rule_id AND active AND server_execution)
    OR NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=job.tenant_id AND settings #>> '{returnsHub,features,workflowRules}'='true') THEN
    UPDATE public.rh_workflow_runs SET status='cancelled',updated_at=now() WHERE id=job.id; RETURN;
  END IF;
  current_chain:=current_setting('trackbliss.workflow_chain',true);
  -- RLS-2: runs started by public events stay public, also for the events
  -- their own actions fire (chained runs read this setting on capture).
  current_origin:=current_setting('trackbliss.workflow_origin',true);
  is_public:=coalesce(job.context->>'origin','')='public';
  BEGIN
    PERFORM set_config('trackbliss.workflow_chain',job.chain::text,true);
    PERFORM set_config('trackbliss.workflow_origin',CASE WHEN is_public THEN 'public' ELSE '' END,true);
    node_id:=job.pending[1]; rest:=job.pending[2:];
    IF node_id IS NULL THEN
      UPDATE public.rh_workflow_runs SET status='completed',updated_at=now() WHERE id=job.id;
      PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true);
      PERFORM set_config('trackbliss.workflow_origin',coalesce(current_origin,''),true); RETURN;
    END IF;
    IF node_id=ANY(job.visited) THEN
      UPDATE public.rh_workflow_runs SET pending=coalesce(rest,'{}'),status=CASE WHEN coalesce(cardinality(rest),0)=0 THEN 'completed' ELSE 'queued' END,updated_at=now() WHERE id=job.id;
      PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true);
      PERFORM set_config('trackbliss.workflow_origin',coalesce(current_origin,''),true); RETURN;
    END IF;
    SELECT n INTO node FROM jsonb_array_elements(job.graph->'nodes') n WHERE n->>'id'=node_id;
    IF node IS NULL THEN RAISE EXCEPTION 'Workflow node missing'; END IF;
    ctx:=job.context; rid:=(ctx->>'returnId')::uuid; tid:=(ctx->>'ticketId')::uuid; cid:=(ctx->>'customerId')::uuid;
    IF rid IS NOT NULL THEN
      SELECT to_jsonb(r) INTO entity FROM public.rh_returns r WHERE id=rid AND tenant_id=job.tenant_id;
      IF entity IS NULL THEN RAISE EXCEPTION 'Return no longer exists'; END IF;
      ctx:=ctx||jsonb_build_object('return',public.workflow_camel_json(entity)); cid:=coalesce(cid,(entity->>'customer_id')::uuid);
    END IF;
    IF tid IS NOT NULL THEN
      SELECT to_jsonb(t) INTO entity FROM public.rh_tickets t WHERE id=tid AND tenant_id=job.tenant_id;
      IF entity IS NULL THEN RAISE EXCEPTION 'Ticket no longer exists'; END IF;
      ctx:=ctx||jsonb_build_object('ticket',public.workflow_camel_json(entity)); cid:=coalesce(cid,(entity->>'customer_id')::uuid);
    END IF;
    IF cid IS NOT NULL THEN
      SELECT to_jsonb(c) INTO entity FROM public.rh_customers c WHERE id=cid AND tenant_id=job.tenant_id;
      IF entity IS NULL THEN RAISE EXCEPTION 'Customer no longer exists'; END IF;
      ctx:=ctx||jsonb_build_object('customer',public.workflow_camel_json(entity),'customerId',cid);
    END IF;
    kind:=node->>'type';
    IF kind IN ('trigger','condition') THEN
      logic:=coalesce(node#>>'{data,logicOperator}','AND'); matched:=(logic='AND');
      FOR cond IN SELECT * FROM jsonb_array_elements(coalesce(CASE WHEN kind='trigger' THEN node#>'{data,filters}' ELSE node#>'{data,conditions}' END,'[]')) LOOP
        IF logic='OR' THEN matched:=matched OR coalesce(public.workflow_match(ctx,cond->>'field',cond->>'operator',cond->'value'),false);
        ELSE matched:=matched AND coalesce(public.workflow_match(ctx,cond->>'field',cond->>'operator',cond->'value'),false); END IF;
      END LOOP;
      IF kind='trigger' AND NOT matched THEN
        UPDATE public.rh_workflow_runs SET status='completed',pending='{}',updated_at=now() WHERE id=job.id;
        PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true);
        PERFORM set_config('trackbliss.workflow_origin',coalesce(current_origin,''),true); RETURN;
      END IF;
      IF kind='condition' THEN branch:=CASE WHEN matched THEN 'true' ELSE 'false' END; END IF;
    ELSIF kind='delay' THEN
      seconds:=(node#>>'{data,amount}')::numeric * CASE node#>>'{data,unit}' WHEN 'minutes' THEN 60 WHEN 'hours' THEN 3600 WHEN 'days' THEN 86400 ELSE NULL END;
      IF seconds IS NULL OR seconds<0 OR seconds>31536000 THEN RAISE EXCEPTION 'Invalid delay'; END IF;
    ELSIF kind='action' THEN
      action:=node#>>'{data,actionType}'; params:=coalesce(node#>'{data,params}','{}');
      IF action IN ('set_status','set_priority','assign','approve','reject','add_note','update_field','timeline_add_entry') AND rid IS NULL THEN RAISE EXCEPTION 'Action requires a return'; END IF;
      IF action IN ('ticket_set_status','ticket_set_priority','ticket_assign','ticket_add_message','ticket_add_tag') AND tid IS NULL THEN RAISE EXCEPTION 'Action requires a ticket'; END IF;
      IF action IN ('customer_update_risk_score','customer_add_tag','customer_update_notes') AND cid IS NULL THEN RAISE EXCEPTION 'Action requires a customer'; END IF;
      IF action IN ('assign','ticket_assign') THEN
        assignee:=coalesce(params->>'assignTo',params->>'assignee')::uuid;
        IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=assignee AND tenant_id=job.tenant_id) THEN RAISE EXCEPTION 'Assignee not in tenant'; END IF;
      END IF;
      CASE action
        WHEN 'set_status','approve','reject' THEN
          value:=CASE action WHEN 'approve' THEN 'APPROVED' WHEN 'reject' THEN 'REJECTED' ELSE params->>'status' END;
          UPDATE public.rh_returns SET status=value,updated_at=now() WHERE id=rid AND tenant_id=job.tenant_id;
          INSERT INTO public.rh_return_timeline(tenant_id,return_id,status,comment,actor_type,metadata) VALUES(job.tenant_id,rid,value,coalesce(params->>'reason','Workflow automation'),'system',jsonb_build_object('workflowRunId',job.id));
        WHEN 'set_priority' THEN UPDATE public.rh_returns SET priority=params->>'priority',updated_at=now() WHERE id=rid AND tenant_id=job.tenant_id;
        WHEN 'assign' THEN UPDATE public.rh_returns SET assigned_to=assignee,updated_at=now() WHERE id=rid AND tenant_id=job.tenant_id;
        WHEN 'add_note','timeline_add_entry' THEN
          SELECT status INTO old_status FROM public.rh_returns WHERE id=rid AND tenant_id=job.tenant_id;
          INSERT INTO public.rh_return_timeline(tenant_id,return_id,status,comment,actor_type,metadata) VALUES(job.tenant_id,rid,old_status,coalesce(params->>'note',params->>'message',params->>'comment',''),'system',jsonb_build_object('workflowRunId',job.id));
        WHEN 'update_field' THEN
          -- Identity, tenant, financial and linkage fields must never be arbitrary writes.
          value:=CASE params->>'field' WHEN 'internalNotes' THEN 'internal_notes' WHEN 'reasonText' THEN 'reason_text' WHEN 'priority' THEN 'priority' WHEN 'trackingNumber' THEN 'tracking_number' WHEN 'shippingMethod' THEN 'shipping_method' END;
          IF value IS NULL THEN RAISE EXCEPTION 'Field is not editable by workflow'; END IF;
          EXECUTE format('UPDATE public.rh_returns SET %I=$1,updated_at=now() WHERE id=$2 AND tenant_id=$3',value) USING params->>'value',rid,job.tenant_id;
        WHEN 'ticket_create' THEN
          new_id:=gen_random_uuid();
          INSERT INTO public.rh_tickets(id,tenant_id,ticket_number,subject,customer_id,return_id,priority,category)
          VALUES(new_id,job.tenant_id,'WF-'||new_id::text,coalesce(params->>'subject','Workflow'),cid,rid,coalesce(params->>'priority','normal'),params->>'category');
          ctx:=ctx||jsonb_build_object('ticketId',new_id);
        WHEN 'ticket_set_status' THEN UPDATE public.rh_tickets SET status=params->>'status',resolved_at=CASE WHEN params->>'status' IN ('resolved','closed') THEN now() ELSE NULL END,updated_at=now() WHERE id=tid AND tenant_id=job.tenant_id;
        WHEN 'ticket_set_priority' THEN UPDATE public.rh_tickets SET priority=params->>'priority',updated_at=now() WHERE id=tid AND tenant_id=job.tenant_id;
        WHEN 'ticket_assign' THEN UPDATE public.rh_tickets SET assigned_to=assignee,updated_at=now() WHERE id=tid AND tenant_id=job.tenant_id;
        WHEN 'ticket_add_message' THEN INSERT INTO public.rh_ticket_messages(tenant_id,ticket_id,sender_type,content,is_internal) VALUES(job.tenant_id,tid,'system',coalesce(params->>'message',''),coalesce((params->>'isInternal')::boolean,true));
        WHEN 'ticket_add_tag' THEN UPDATE public.rh_tickets SET tags=ARRAY(SELECT DISTINCT unnest(coalesce(tags,'{}')||ARRAY[params->>'tag'])),updated_at=now() WHERE id=tid AND tenant_id=job.tenant_id;
        WHEN 'customer_update_risk_score' THEN
          IF (params->>'riskScore')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Risk score must be between 0 and 100'; END IF;
          UPDATE public.rh_customers SET risk_score=(params->>'riskScore')::integer,updated_at=now() WHERE id=cid AND tenant_id=job.tenant_id;
        WHEN 'customer_add_tag' THEN UPDATE public.rh_customers SET tags=ARRAY(SELECT DISTINCT unnest(coalesce(tags,'{}')||ARRAY[params->>'tag'])),updated_at=now() WHERE id=cid AND tenant_id=job.tenant_id;
        WHEN 'customer_update_notes' THEN UPDATE public.rh_customers SET notes=params->>'notes',updated_at=now() WHERE id=cid AND tenant_id=job.tenant_id;
        WHEN 'notification_internal' THEN
          INSERT INTO public.rh_notifications(tenant_id,return_id,ticket_id,customer_id,channel,content,metadata) VALUES(job.tenant_id,rid,tid,cid,'websocket',coalesce(params->>'message',params->>'content',''),jsonb_build_object('source','workflow','workflowRunId',job.id,'isInternal',true));
        WHEN 'email_send_custom','email_send_template' THEN
          recipient:=coalesce(nullif(params->>'recipientEmail',''),ctx#>>'{customer,email}');
          IF recipient IS NULL THEN RAISE EXCEPTION 'Email recipient missing'; END IF;
          subject:=coalesce(params->>'subject','Workflow'); body:=coalesce(params->>'content',params->>'body','');
          IF action='email_send_template' THEN
            SELECT * INTO template FROM public.rh_email_templates WHERE tenant_id=job.tenant_id AND enabled
            AND (id::text=params->>'templateId' OR event_type=params->>'templateEventType') ORDER BY id LIMIT 1;
            IF template.id IS NULL THEN RAISE EXCEPTION 'Enabled email template not found'; END IF;
            subject:=template.subject_template; body:=coalesce(nullif(template.html_template,''),template.body_template);
          END IF;
          vars:=jsonb_build_object('customerName',concat_ws(' ',ctx#>>'{customer,firstName}',ctx#>>'{customer,lastName}'),'firstName',ctx#>>'{customer,firstName}','returnNumber',ctx#>>'{return,returnNumber}','ticketNumber',ctx#>>'{ticket,ticketNumber}','status',coalesce(ctx#>>'{return,status}',ctx#>>'{ticket,status}'),'subject',ctx#>>'{ticket,subject}','trackingUrl','https://dpp-app.fambliss.eu/returns/track/'||coalesce(ctx#>>'{return,returnNumber}',''));
          IF is_public THEN
            -- RLS-2: names and ticket subjects come from anonymous visitors.
            -- Same sanitising and the same buckets as public_enqueue_notification.
            vars:=vars||jsonb_build_object(
              'customerName',public.sanitize_public_mail_text(vars->>'customerName',60),
              'firstName',public.sanitize_public_mail_text(vars->>'firstName',60),
              'subject',public.sanitize_public_mail_text(vars->>'subject',80));
            SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:tenant:'||job.tenant_id::text,100,3600);
            IF NOT v_ok THEN RAISE EXCEPTION 'Public e-mail rate limit reached for this organisation (workflow mail not sent)'; END IF;
            SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:rcpt:'||job.tenant_id::text||':'||md5(lower(trim(recipient))),5,3600);
            IF NOT v_ok THEN RAISE EXCEPTION 'Public e-mail rate limit reached for this recipient (workflow mail not sent)'; END IF;
            SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:global',1000,3600);
            IF NOT v_ok THEN RAISE EXCEPTION 'Global public e-mail rate limit reached (workflow mail not sent)'; END IF;
          END IF;
          FOR k,v IN SELECT * FROM jsonb_each_text(vars) LOOP
            subject:=replace(subject,'{{'||k||'}}',coalesce(v,''));
            body:=replace(body,'{{'||k||'}}',CASE WHEN template.html_template IS NOT NULL THEN replace(replace(replace(replace(coalesce(v,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;') ELSE coalesce(v,'') END);
          END LOOP;
          INSERT INTO public.rh_notifications(tenant_id,return_id,ticket_id,customer_id,channel,template,recipient_email,subject,content,metadata)
          VALUES(job.tenant_id,rid,tid,cid,'email',template.event_type,recipient,subject,body,jsonb_build_object('source','workflow','workflowRunId',job.id,'isHtml',template.html_template IS NOT NULL,'origin',CASE WHEN is_public THEN 'public' ELSE 'tenant' END));
        WHEN 'webhook_call' THEN
          INSERT INTO public.rh_workflow_webhooks(run_id,node_id,params,context) VALUES(job.id,node_id,params,ctx);
          UPDATE public.rh_workflow_runs SET status='waiting',available_at=now()+interval '5 minutes',updated_at=now() WHERE id=job.id;
          PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true);
          PERFORM set_config('trackbliss.workflow_origin',coalesce(current_origin,''),true); RETURN;
        ELSE RAISE EXCEPTION 'Unknown workflow action: %',action;
      END CASE;
    ELSE RAISE EXCEPTION 'Unknown node type: %',kind;
    END IF;
    SELECT coalesce(array_agg(e->>'target'),'{}') INTO next_nodes FROM jsonb_array_elements(job.graph->'edges') e WHERE e->>'source'=node_id AND (branch IS NULL OR e->>'sourceHandle'=branch);
    UPDATE public.rh_workflow_runs SET pending=next_nodes||coalesce(rest,'{}'),visited=visited||node_id,
      context=ctx-'return'-'ticket'-'customer',
      status=CASE WHEN cardinality(next_nodes||coalesce(rest,'{}'))=0 THEN 'completed' WHEN seconds>0 THEN 'waiting' ELSE 'queued' END,
      available_at=now()+coalesce(seconds,0)*interval '1 second',updated_at=now() WHERE id=job.id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.rh_workflow_runs SET status='failed',error=left(SQLERRM,1000),updated_at=now() WHERE id=job.id;
  END;
  PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true);
  PERFORM set_config('trackbliss.workflow_origin',coalesce(current_origin,''),true);
END $$;

REVOKE ALL ON FUNCTION public.workflow_capture_event(), public.workflow_step(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_step(uuid) TO service_role;
