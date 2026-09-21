import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderWorkflowBody, renderWorkflowValue } from '../_shared/workflow-webhook.ts';

// Exact host allowlist is configured by the operator, never supplied by a rule.
// This prevents tenant-authored URLs from reaching internal services or arbitrary
// hosts. HTTPS only, no redirects, finite timeout, and no ambiguous retries.
const allowedHosts = new Set((Deno.env.get('WORKFLOW_WEBHOOK_HOSTS') || '').split(',').map(host => host.trim().toLowerCase()).filter(Boolean));
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(Deno.env.get('SUPABASE_URL') || '', serviceKey);

Deno.serve(async request => {
  if (request.method !== 'POST' || !serviceKey || request.headers.get('authorization') !== `Bearer ${serviceKey}`) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data: jobs, error } = await db.rpc('workflow_claim_webhooks');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let processed = 0;
  for (const job of jobs || []) {
    let failure: string | null = null;
    try {
      const params = job.params as Record<string, unknown>;
      const url = new URL(String(params.url || ''));
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowedHosts.has(url.hostname.toLowerCase())) {
        throw new Error('Webhook host is not approved. Configure WORKFLOW_WEBHOOK_HOSTS before enabling this action.');
      }
      const method = String(params.method || 'POST').toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported webhook method');
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (typeof params.headers === 'string') {
        for (const line of params.headers.split('\n')) {
          const colon = line.indexOf(':');
          if (colon > 0) headers.set(line.slice(0, colon).trim(), renderWorkflowValue(line.slice(colon + 1).trim(), job.context));
        }
      } else if (params.headers && typeof params.headers === 'object') {
        for (const [key, value] of Object.entries(params.headers)) headers.set(key, renderWorkflowValue(String(value), job.context));
      }
      for (const forbidden of ['Host', 'Connection', 'Content-Length']) headers.delete(forbidden);
      headers.set('Idempotency-Key', `trackbliss-workflow-${job.id}`);
      const body = renderWorkflowBody(params.body || {
        event: job.context.eventType, returnId: job.context.returnId, ticketId: job.context.ticketId, customerId: job.context.customerId,
      }, job.context);
      const response = await fetch(url, { method, headers, body: method === 'GET' ? undefined : body, redirect: 'error', signal: AbortSignal.timeout(10000) });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    } catch (err) { failure = err instanceof Error ? err.message : 'Webhook failed'; }
    const { error: finishError } = await db.rpc('workflow_finish_webhook', { p_id: job.id, p_error: failure });
    if (finishError) return Response.json({ error: finishError.message, processed }, { status: 500 });
    processed++;
  }
  return Response.json({ processed });
});
