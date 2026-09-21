-- Deploy workflow-webhooks before applying. Existing rules remain opted out.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='service_role_jwt') THEN
    RAISE EXCEPTION 'Missing service_role_jwt in Vault';
  END IF;
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='trackbliss-workflow-runner') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='trackbliss-workflow-runner';
  END IF;
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='trackbliss-workflow-webhooks') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='trackbliss-workflow-webhooks';
  END IF;
END $$;
SELECT cron.schedule('trackbliss-workflow-runner','* * * * *',
  $cron$SET statement_timeout='25s'; SELECT public.workflow_tick();$cron$);
SELECT cron.schedule('trackbliss-workflow-webhooks','* * * * *', $cron$
  SELECT net.http_post(
    url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/workflow-webhooks',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='service_role_jwt' LIMIT 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) WHERE EXISTS(SELECT 1 FROM public.rh_workflow_webhooks WHERE status IN ('pending','sending'));
$cron$);
