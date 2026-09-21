-- Durable workflow runs. No existing rules are enabled by this migration.
-- Cron executes as the database owner; clients can only read their tenant's runs
-- and explicitly queue manual rules. Internal actions and checkpoints commit together.
CREATE TABLE IF NOT EXISTS public.rh_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.rh_workflow_rules(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  graph jsonb NOT NULL,
  context jsonb NOT NULL DEFAULT '{}',
  pending text[] NOT NULL DEFAULT '{}',
  visited text[] NOT NULL DEFAULT '{}',
  chain uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','waiting','completed','failed','cancelled')),
  available_at timestamptz NOT NULL DEFAULT now(),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rule_id,event_key)
);
CREATE INDEX IF NOT EXISTS rh_workflow_runs_due ON public.rh_workflow_runs(available_at) WHERE status IN ('queued','waiting');
ALTER TABLE public.rh_workflow_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_runs_read ON public.rh_workflow_runs;
CREATE POLICY workflow_runs_read ON public.rh_workflow_runs FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id=auth.uid()));
GRANT SELECT ON public.rh_workflow_runs TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.rh_workflow_runs FROM anon,authenticated;

-- Explicit opt-in prevents dormant schedules from unexpectedly sending old mail.
ALTER TABLE public.rh_workflow_rules ADD COLUMN IF NOT EXISTS server_execution boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.rh_workflow_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.rh_workflow_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  params jsonb NOT NULL,
  context jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','completed','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id,node_id)
);
ALTER TABLE public.rh_workflow_webhooks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rh_workflow_webhooks FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.workflow_validate_rule() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE n jsonb; schedule jsonb; all_ids text[]; remaining text[]; ready text;
BEGIN
  IF NOT NEW.server_execution THEN RETURN NEW; END IF;
  IF NEW.conditions->>'_graphVersion' IS DISTINCT FROM '2' OR jsonb_typeof(NEW.conditions->'nodes') IS DISTINCT FROM 'array'
    OR jsonb_typeof(NEW.conditions->'edges') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Save the rule in the visual builder first'; END IF;
  IF jsonb_array_length(NEW.conditions->'nodes')>200 OR jsonb_array_length(NEW.conditions->'edges')>400 THEN RAISE EXCEPTION 'Workflow is too large'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(NEW.conditions->'nodes') AS item(value) WHERE item.value->>'type'='trigger')<>1 THEN RAISE EXCEPTION 'Workflow needs exactly one trigger'; END IF;
  IF (SELECT count(DISTINCT item.value->>'id') FROM jsonb_array_elements(NEW.conditions->'nodes') AS item(value))<>jsonb_array_length(NEW.conditions->'nodes') THEN RAISE EXCEPTION 'Workflow node IDs must be unique'; END IF;
  SELECT array_agg(item.value->>'id') INTO all_ids FROM jsonb_array_elements(NEW.conditions->'nodes') AS item(value);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.conditions->'edges') e WHERE NOT (e->>'source'=ANY(all_ids)) OR NOT (e->>'target'=ANY(all_ids))) THEN RAISE EXCEPTION 'Workflow references a missing node'; END IF;
  remaining:=all_ids;
  WHILE cardinality(remaining)>0 LOOP
    SELECT candidate INTO ready FROM unnest(remaining) candidate WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.conditions->'edges') e WHERE e->>'target'=candidate AND e->>'source'=ANY(remaining)
    ) LIMIT 1;
    IF ready IS NULL THEN RAISE EXCEPTION 'Workflow contains a cycle'; END IF;
    remaining:=array_remove(remaining,ready);
  END LOOP;
  FOR n IN SELECT * FROM jsonb_array_elements(NEW.conditions->'nodes') LOOP
    IF n->>'type'='trigger' THEN
      IF n#>>'{data,eventType}' IS DISTINCT FROM NEW.trigger_type THEN RAISE EXCEPTION 'Workflow trigger does not match rule'; END IF;
      IF NEW.trigger_type LIKE 'scheduled_%' THEN
        schedule:=n#>'{data,schedule}';
        IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=coalesce(schedule->>'timezone','Europe/Berlin')) THEN RAISE EXCEPTION 'Unknown time zone'; END IF;
        PERFORM coalesce(schedule->>'time','09:00')::time;
        IF coalesce((schedule->>'dayOfWeek')::int,1) NOT BETWEEN 0 AND 6 OR coalesce((schedule->>'dayOfMonth')::int,1) NOT BETWEEN 1 AND 31 THEN RAISE EXCEPTION 'Invalid schedule day'; END IF;
      END IF;
      IF NEW.trigger_type='return_overdue' AND coalesce((n#>>'{data,overdueDays}')::int,7) NOT BETWEEN 1 AND 3650 THEN RAISE EXCEPTION 'Invalid overdue duration'; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workflow_validate ON public.rh_workflow_rules;
CREATE TRIGGER workflow_validate BEFORE INSERT OR UPDATE ON public.rh_workflow_rules FOR EACH ROW EXECUTE FUNCTION public.workflow_validate_rule();

CREATE OR REPLACE FUNCTION public.workflow_cancel_runs() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT NEW.active OR NOT NEW.server_execution THEN
    UPDATE public.rh_workflow_runs SET status='cancelled',updated_at=now()
      WHERE rule_id=NEW.id AND tenant_id=NEW.tenant_id AND status IN ('queued','waiting');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workflow_cancel ON public.rh_workflow_rules;
CREATE TRIGGER workflow_cancel AFTER UPDATE ON public.rh_workflow_rules FOR EACH ROW EXECUTE FUNCTION public.workflow_cancel_runs();

CREATE OR REPLACE FUNCTION public.workflow_camel_json(value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE k text; v jsonb; result jsonb := '{}'; parts text[]; camel text; i int;
BEGIN
  IF jsonb_typeof(value) <> 'object' THEN RETURN value; END IF;
  FOR k,v IN SELECT * FROM jsonb_each(value) LOOP
    parts := string_to_array(k,'_'); camel := parts[1];
    FOR i IN 2..coalesce(array_length(parts,1),1) LOOP camel := camel || initcap(parts[i]); END LOOP;
    result := result || jsonb_build_object(camel, public.workflow_camel_json(v));
  END LOOP;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_match(ctx jsonb, field text, op text, expected jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE actual jsonb; a text; b text; options jsonb;
BEGIN
  IF field LIKE 'return.%' OR field LIKE 'ticket.%' OR field LIKE 'customer.%' THEN actual := ctx #> string_to_array(field,'.');
  ELSE actual := coalesce(ctx->'return',ctx->'ticket') #> string_to_array(field,'.'); END IF;
  a := actual #>> '{}'; b := expected #>> '{}';
  CASE op
    WHEN 'equals' THEN RETURN a IS NOT DISTINCT FROM b;
    WHEN 'not_equals' THEN RETURN a IS DISTINCT FROM b;
    WHEN 'is_empty' THEN RETURN actual IS NULL OR actual='null' OR actual='""' OR actual='[]';
    WHEN 'is_not_empty' THEN RETURN NOT (actual IS NULL OR actual='null' OR actual='""' OR actual='[]');
    WHEN 'contains' THEN RETURN CASE WHEN jsonb_typeof(actual)='array' THEN actual @> jsonb_build_array(expected) ELSE position(lower(b) in lower(a))>0 END;
    WHEN 'not_contains' THEN RETURN NOT public.workflow_match(ctx,field,'contains',expected);
    WHEN 'greater_than' THEN RETURN a::numeric > b::numeric;
    WHEN 'less_than' THEN RETURN a::numeric < b::numeric;
    WHEN 'greater_or_equal' THEN RETURN a::numeric >= b::numeric;
    WHEN 'less_or_equal' THEN RETURN a::numeric <= b::numeric;
    WHEN 'in', 'not_in' THEN
      options := CASE WHEN jsonb_typeof(expected)='array' THEN expected ELSE to_jsonb(regexp_split_to_array(b,'\s*,\s*')) END;
      RETURN CASE WHEN op='in' THEN options @> jsonb_build_array(a) ELSE NOT options @> jsonb_build_array(a) END;
    WHEN 'matches_regex' THEN
      IF length(b)>256 OR length(a)>4096 THEN RETURN false; END IF;
      RETURN a ~ b;
    ELSE RETURN false;
  END CASE;
EXCEPTION WHEN invalid_text_representation OR invalid_regular_expression THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_enqueue(rule public.rh_workflow_rules, event_key text, ctx jsonb, chain uuid[] DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE graph jsonb := rule.conditions; start_id text; run_id uuid;
BEGIN
  IF NOT rule.active OR NOT rule.server_execution OR rule.id=ANY(chain) OR cardinality(chain)>=20 THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id=rule.tenant_id AND t.settings #>> '{returnsHub,features,workflowRules}'='true') THEN RETURN NULL; END IF;
  IF graph->>'_graphVersion'<>'2' OR graph->'nodes' IS NULL THEN RAISE EXCEPTION 'Save the rule in the visual builder first'; END IF;
  SELECT n->>'id' INTO start_id FROM jsonb_array_elements(graph->'nodes') n WHERE n->>'type'='trigger' LIMIT 1;
  IF start_id IS NULL THEN RAISE EXCEPTION 'Workflow trigger is missing'; END IF;
  INSERT INTO public.rh_workflow_runs(tenant_id,rule_id,event_key,graph,context,pending,chain)
  VALUES(rule.tenant_id,rule.id,event_key,graph,ctx,ARRAY[start_id],chain||rule.id)
  ON CONFLICT ON CONSTRAINT rh_workflow_runs_rule_id_event_key_key DO NOTHING RETURNING id INTO run_id;
  RETURN run_id;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_capture_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE events text[] := '{}'; evt text; rule public.rh_workflow_rules; ctx jsonb; chain uuid[];
BEGIN
  chain := coalesce(nullif(current_setting('trackbliss.workflow_chain',true),'')::uuid[],'{}');
  ctx := jsonb_build_object('tenantId',NEW.tenant_id);
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
DROP TRIGGER IF EXISTS workflow_capture ON public.rh_returns;
CREATE TRIGGER workflow_capture AFTER INSERT OR UPDATE ON public.rh_returns FOR EACH ROW EXECUTE FUNCTION public.workflow_capture_event();
DROP TRIGGER IF EXISTS workflow_capture ON public.rh_tickets;
CREATE TRIGGER workflow_capture AFTER INSERT OR UPDATE ON public.rh_tickets FOR EACH ROW EXECUTE FUNCTION public.workflow_capture_event();
DROP TRIGGER IF EXISTS workflow_capture ON public.rh_customers;
CREATE TRIGGER workflow_capture AFTER UPDATE ON public.rh_customers FOR EACH ROW EXECUTE FUNCTION public.workflow_capture_event();

CREATE OR REPLACE FUNCTION public.run_workflow_manually(p_rule_id uuid, p_return_id uuid DEFAULT NULL, p_ticket_id uuid DEFAULT NULL, p_customer_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rule public.rh_workflow_rules; tenant uuid;
BEGIN
  SELECT tenant_id INTO tenant FROM public.profiles WHERE id=auth.uid();
  SELECT * INTO rule FROM public.rh_workflow_rules WHERE id=p_rule_id AND tenant_id=tenant AND trigger_type='manual' AND active AND server_execution;
  IF rule.id IS NULL THEN RAISE EXCEPTION 'Active manual workflow not found'; END IF;
  IF p_return_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rh_returns WHERE id=p_return_id AND tenant_id=tenant) THEN RAISE EXCEPTION 'Return not found'; END IF;
  IF p_ticket_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rh_tickets WHERE id=p_ticket_id AND tenant_id=tenant) THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rh_customers WHERE id=p_customer_id AND tenant_id=tenant) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  RETURN public.workflow_enqueue(rule,gen_random_uuid()::text,jsonb_strip_nulls(jsonb_build_object('tenantId',tenant,'eventType','manual','returnId',p_return_id,'ticketId',p_ticket_id,'customerId',p_customer_id)));
END $$;

-- Job execution: all database actions, timeline entries, notification outbox rows
-- and the cursor are one transaction. A failed node is not silently reported successful.
CREATE OR REPLACE FUNCTION public.workflow_step(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.rh_workflow_runs; node jsonb; cond jsonb; params jsonb; ctx jsonb; entity jsonb;
  node_id text; kind text; action text; branch text; matched boolean; logic text;
  rid uuid; tid uuid; cid uuid; assignee uuid; new_id uuid; old_status text; value text;
  seconds numeric; template public.rh_email_templates; subject text; body text; vars jsonb; k text; v text;
  recipient text; rest text[]; next_nodes text[]; current_chain text;
BEGIN
  SELECT * INTO job FROM public.rh_workflow_runs WHERE id=p_id AND status IN ('queued','waiting') AND available_at<=now() FOR UPDATE SKIP LOCKED;
  IF job.id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.rh_workflow_rules WHERE id=job.rule_id AND active AND server_execution)
    OR NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=job.tenant_id AND settings #>> '{returnsHub,features,workflowRules}'='true') THEN
    UPDATE public.rh_workflow_runs SET status='cancelled',updated_at=now() WHERE id=job.id; RETURN;
  END IF;
  current_chain:=current_setting('trackbliss.workflow_chain',true);
  BEGIN
    PERFORM set_config('trackbliss.workflow_chain',job.chain::text,true);
    node_id:=job.pending[1]; rest:=job.pending[2:];
    IF node_id IS NULL THEN
      UPDATE public.rh_workflow_runs SET status='completed',updated_at=now() WHERE id=job.id;
      PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true); RETURN;
    END IF;
    IF node_id=ANY(job.visited) THEN
      UPDATE public.rh_workflow_runs SET pending=coalesce(rest,'{}'),status=CASE WHEN coalesce(cardinality(rest),0)=0 THEN 'completed' ELSE 'queued' END,updated_at=now() WHERE id=job.id;
      PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true); RETURN;
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
        PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true); RETURN;
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
          FOR k,v IN SELECT * FROM jsonb_each_text(vars) LOOP
            subject:=replace(subject,'{{'||k||'}}',coalesce(v,''));
            body:=replace(body,'{{'||k||'}}',CASE WHEN template.html_template IS NOT NULL THEN replace(replace(replace(replace(coalesce(v,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;') ELSE coalesce(v,'') END);
          END LOOP;
          INSERT INTO public.rh_notifications(tenant_id,return_id,ticket_id,customer_id,channel,template,recipient_email,subject,content,metadata)
          VALUES(job.tenant_id,rid,tid,cid,'email',template.event_type,recipient,subject,body,jsonb_build_object('source','workflow','workflowRunId',job.id,'isHtml',template.html_template IS NOT NULL));
        WHEN 'webhook_call' THEN
          INSERT INTO public.rh_workflow_webhooks(run_id,node_id,params,context) VALUES(job.id,node_id,params,ctx);
          UPDATE public.rh_workflow_runs SET status='waiting',available_at=now()+interval '5 minutes',updated_at=now() WHERE id=job.id;
          PERFORM set_config('trackbliss.workflow_chain',coalesce(current_chain,''),true); RETURN;
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
END $$;

CREATE OR REPLACE FUNCTION public.workflow_claim_webhooks() RETURNS SETOF public.rh_workflow_webhooks
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- A lost response is ambiguous: never replay a possibly accepted webhook.
  UPDATE public.rh_workflow_runs r SET status='failed',error='Webhook delivery interrupted; check the recipient before retrying',updated_at=now()
    FROM public.rh_workflow_webhooks w WHERE w.run_id=r.id AND w.status='sending' AND w.updated_at<now()-interval '2 minutes';
  UPDATE public.rh_workflow_webhooks SET status='failed',error='Delivery interrupted',updated_at=now() WHERE status='sending' AND updated_at<now()-interval '2 minutes';
  UPDATE public.rh_workflow_webhooks w SET status='failed',error='Workflow cancelled',updated_at=now()
    FROM public.rh_workflow_runs r,public.rh_workflow_rules rule WHERE w.run_id=r.id AND r.rule_id=rule.id AND w.status='pending' AND (NOT rule.active OR NOT rule.server_execution OR r.status<>'waiting'
      OR NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=r.tenant_id AND t.settings #>> '{returnsHub,features,workflowRules}'='true'));
  RETURN QUERY UPDATE public.rh_workflow_webhooks SET status='sending',updated_at=now()
    WHERE id IN (SELECT id FROM public.rh_workflow_webhooks WHERE status='pending' ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED) RETURNING *;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_finish_webhook(p_id uuid, p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE hook public.rh_workflow_webhooks; job public.rh_workflow_runs; next_nodes text[];
BEGIN
  SELECT * INTO hook FROM public.rh_workflow_webhooks WHERE id=p_id AND status='sending' FOR UPDATE;
  IF hook.id IS NULL THEN RETURN; END IF;
  SELECT * INTO job FROM public.rh_workflow_runs WHERE id=hook.run_id FOR UPDATE;
  UPDATE public.rh_workflow_webhooks SET status=CASE WHEN p_error IS NULL THEN 'completed' ELSE 'failed' END,error=left(p_error,1000),updated_at=now() WHERE id=p_id;
  IF job.status IN ('cancelled','failed','completed') THEN RETURN; END IF;
  IF p_error IS NOT NULL THEN UPDATE public.rh_workflow_runs SET status='failed',error=left(p_error,1000),updated_at=now() WHERE id=job.id; RETURN; END IF;
  SELECT coalesce(array_agg(e->>'target'),'{}') INTO next_nodes FROM jsonb_array_elements(job.graph->'edges') e WHERE e->>'source'=hook.node_id;
  UPDATE public.rh_workflow_runs SET pending=next_nodes||coalesce(job.pending[2:],'{}'),visited=visited||hook.node_id,
    status=CASE WHEN cardinality(next_nodes||coalesce(job.pending[2:],'{}'))=0 THEN 'completed' ELSE 'queued' END,available_at=now(),updated_at=now() WHERE id=job.id;
END $$;

CREATE OR REPLACE FUNCTION public.workflow_tick() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='20s' AS $$
DECLARE rule public.rh_workflow_rules; trigger_data jsonb; local_now timestamp; tz text; clock_time time; day_key text; run record; entity record; i int;
BEGIN
  -- Avoid overlap between cron invocations. Missed scheduled slots catch up once
  -- on the same local day, never replay historical days on first activation.
  IF NOT pg_try_advisory_xact_lock(hashtext('trackbliss.workflow_tick')) THEN RETURN; END IF;
  FOR rule IN SELECT * FROM public.rh_workflow_rules WHERE active AND server_execution AND trigger_type IN ('scheduled_daily','scheduled_weekly','scheduled_monthly','return_overdue','ticket_overdue') LOOP
    BEGIN
      SELECT n->'data' INTO trigger_data FROM jsonb_array_elements(rule.conditions->'nodes') n WHERE n->>'type'='trigger' LIMIT 1;
      IF rule.trigger_type LIKE 'scheduled_%' THEN
        tz:=coalesce(trigger_data#>>'{schedule,timezone}','Europe/Berlin');
        local_now:=now() AT TIME ZONE tz; clock_time:=coalesce(trigger_data#>>'{schedule,time}','09:00')::time;
        IF local_now::time<clock_time THEN CONTINUE; END IF;
        IF rule.trigger_type='scheduled_weekly' AND extract(dow FROM local_now)<>coalesce((trigger_data#>>'{schedule,dayOfWeek}')::int,1) THEN CONTINUE; END IF;
        IF rule.trigger_type='scheduled_monthly' AND extract(day FROM local_now)<>least(coalesce((trigger_data#>>'{schedule,dayOfMonth}')::int,1),extract(day FROM date_trunc('month',local_now)+interval '1 month - 1 day')) THEN CONTINUE; END IF;
        day_key:='schedule:'||local_now::date::text;
        PERFORM public.workflow_enqueue(rule,day_key,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type));
      ELSIF rule.trigger_type='ticket_overdue' THEN
        FOR entity IN SELECT id,customer_id,sla_resolution_at FROM public.rh_tickets t WHERE tenant_id=rule.tenant_id AND status NOT IN ('resolved','closed') AND sla_resolution_at<now()
          AND NOT EXISTS(SELECT 1 FROM public.rh_workflow_runs r WHERE r.rule_id=rule.id AND r.event_key='ticket-overdue:'||t.id::text||':'||t.sla_resolution_at::text) ORDER BY sla_resolution_at LIMIT 200 LOOP
          PERFORM public.workflow_enqueue(rule,'ticket-overdue:'||entity.id::text||':'||entity.sla_resolution_at::text,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type,'ticketId',entity.id,'customerId',entity.customer_id));
        END LOOP;
      ELSE
        -- Explicit processing age, configured on the trigger; independent of a
        -- customer's statutory return window. Default seven days after creation.
        FOR entity IN SELECT id,customer_id FROM public.rh_returns ret WHERE tenant_id=rule.tenant_id AND status NOT IN ('COMPLETED','REJECTED','CANCELLED','REFUND_COMPLETED') AND created_at<now()-greatest(1,coalesce((trigger_data->>'overdueDays')::int,7))*interval '1 day'
          AND NOT EXISTS(SELECT 1 FROM public.rh_workflow_runs r WHERE r.rule_id=rule.id AND r.event_key='return-overdue:'||ret.id::text) ORDER BY created_at LIMIT 200 LOOP
          PERFORM public.workflow_enqueue(rule,'return-overdue:'||entity.id::text,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type,'returnId',entity.id,'customerId',entity.customer_id));
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Workflow schedule % failed: %',rule.id,SQLERRM;
    END;
  END LOOP;
  FOR i IN 1..200 LOOP
    SELECT id INTO run FROM public.rh_workflow_runs WHERE status IN ('queued','waiting') AND available_at<=now() ORDER BY available_at,id LIMIT 1;
    EXIT WHEN NOT FOUND;
    PERFORM public.workflow_step(run.id);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.workflow_enqueue(public.rh_workflow_rules,text,jsonb,uuid[]), public.workflow_capture_event(),public.workflow_step(uuid),public.workflow_tick(), public.run_workflow_manually(uuid,uuid,uuid,uuid), public.workflow_claim_webhooks(),public.workflow_finish_webhook(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.workflow_camel_json(jsonb),public.workflow_match(jsonb,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.workflow_cancel_runs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.run_workflow_manually(uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_step(uuid),public.workflow_tick() TO service_role;
GRANT EXECUTE ON FUNCTION public.workflow_claim_webhooks(),public.workflow_finish_webhook(uuid,text) TO service_role;
-- Installed separately after database regression tests: cron.schedule(... workflow_tick()).
