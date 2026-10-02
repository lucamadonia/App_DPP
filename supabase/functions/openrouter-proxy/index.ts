/**
 * Supabase Edge Function: openrouter-proxy
 *
 * Proxies AI requests to OpenRouter API so the API key never reaches the client.
 * Includes JWT auth, per-user rate limiting, and credit consumption.
 *
 * Credit handling (go-live hardening DB-03/SEC-06, QA-2/SEC-12):
 *   - Credits are consumed via the atomic SECURITY DEFINER RPC
 *     `consume_credits` (row lock, monthly first, then purchased) which also
 *     enforces a durable per-tenant rate limit.
 *   - If the upstream call fails before any output is streamed, the credits
 *     are refunded via the service-role-only RPC `refund_credits`.
 *   - EF-05: the charge is priced by size, never below the per-operation
 *     floor: estimated input tokens (text chars / 3, images at a fixed
 *     per-part estimate) plus 5x the requested
 *     max_tokens (output is ~5x the input price), 1 credit per started
 *     40k token units, times the model multiplier (allowlisted models only).
 *     Hard caps: 400k text chars, 15 MB attachments, 12 attachment parts,
 *     100 messages, 8000 output tokens; a call that would price above
 *     MAX_CHARGED_CREDITS is rejected rather than undercharged.
 *   - `file` parts (PDF/documents) are rejected with 400: OpenRouter accepts a
 *     plain URL in file_data and bills PDFs per page, so their cost cannot be
 *     bounded from the request size. No in-app caller sends them.
 *   - A durable per-user limit (rate_limit_hit) backs up the in-memory one.
 *
 * Deployment:
 *   supabase functions deploy openrouter-proxy
 *   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
 *
 * Required Supabase Secrets:
 *   - OPENROUTER_API_KEY
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimits } from '../_shared/rate-limit.ts';
import { estimateInputTokens, priceCall, type UsageEstimate } from './pricing.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MODEL = 'anthropic/claude-sonnet-4';
const MAX_REQUESTS_PER_MINUTE = 10;

if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY is not configured');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiter (per-function instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale entries periodically (prevent memory leak)
function cleanRateLimitMap() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Multimodal content parts (Claude Vision / document attachments)
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type MessageContent = string | ContentPart[];

interface ProxyRequestBody {
  messages: Array<{ role: string; content: MessageContent }>;
  maxTokens?: number;
  temperature?: number;
  creditCost?: number;
  operationLabel?: string;
  /** If 'json', response is non-streaming JSON. Default: streaming SSE. */
  responseFormat?: 'stream' | 'json';
  /** Optional model override (must be in allowed list). */
  model?: string;
}

// --- EF-05 hard caps -------------------------------------------------------
// Plain text (system prompts, product context, chat history). The largest
// legitimate prompt (compliance check with full product context) is well
// below 100 KB; 400k chars is ~130k tokens.
const MAX_TEXT_CHARS = 400_000;
// Base64 image / PDF attachments (document classification, vision).
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_ATTACHMENT_PARTS = 12;
const MAX_MESSAGES = 100;
// Reject request bodies larger than this before parsing them.
const MAX_BODY_BYTES = MAX_ATTACHMENT_BYTES + MAX_TEXT_CHARS * 4 + 256 * 1024;
const MAX_OUTPUT_TOKENS = 8000; // hard output cap per call (SEC-12)

// Allowed models (if client overrides) → credit multiplier. Anything else,
// including 1M-context variants, is rejected.
const MODEL_COST_MULTIPLIER: Record<string, number> = {
  'anthropic/claude-sonnet-4': 1,
  'anthropic/claude-opus-4': 5,
};

// A call priced above this is refused (with the caps above a Sonnet call
// tops out around 25 credits; Opus x5).
const MAX_CHARGED_CREDITS = 150;
const USER_LIMIT_PER_10_MIN = 40;

// Server-side minimum credit cost per operation. The client sends the
// requested creditCost, but it can never undercut these minimums — a
// tampered client sending creditCost=0 still pays at least the floor.
// Keys match the operationLabel values the app sends; everything else
// falls back to the global minimum of 1.
const GLOBAL_MIN_CREDIT_COST = 1;
const MAX_CREDIT_COST = 20;
const MIN_CREDIT_COST_BY_OPERATION: Record<string, number> = {
  'AI analysis': 1,
  'Warehouse AI Chat': 1,
  // compliance-check phases / chat / document classification all cost >= 1
};

function resolveCreditCost(requested: unknown, operationLabel: string): number {
  const floor = MIN_CREDIT_COST_BY_OPERATION[operationLabel] ?? GLOBAL_MIN_CREDIT_COST;
  const req = typeof requested === 'number' && Number.isFinite(requested)
    ? Math.floor(requested)
    : floor;
  return Math.min(MAX_CREDIT_COST, Math.max(req, floor, GLOBAL_MIN_CREDIT_COST));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify JWT auth explicitly against the Auth server.
    // supabase.auth.getUser(token) validates the token server-side (Auth
    // /user endpoint), so it is robust across Supabase JWT-key migrations
    // (HS256 vs ES256) AND rejects revoked/forged tokens — unlike a local
    // payload decode.
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '').trim();

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return jsonResponse({ error: 'Unauthorized (invalid or expired token)' }, 401);
    }

    // Reject anon/service tokens that don't represent a real user
    if (userData.user.aud !== 'authenticated' && userData.user.role !== 'authenticated') {
      return jsonResponse({ error: 'Unauthorized (not an authenticated user token)' }, 401);
    }

    const user = { id: userData.user.id, email: userData.user.email };

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return jsonResponse({ error: 'Rate limit exceeded. Maximum 10 requests per minute.' }, 429);
    }

    // Periodic cleanup
    if (rateLimitMap.size > 1000) {
      cleanRateLimitMap();
    }

    // 2b. Durable per-user limit (the in-memory map resets on cold start).
    // Fails open: consume_credits enforces its own durable tenant limit.
    const userVerdict = await enforceRateLimits(supabase, [
      { bucket: `ai:user:${user.id}`, limit: USER_LIMIT_PER_10_MIN, windowSeconds: 600 },
    ]);
    if (!userVerdict.allowed) {
      return jsonResponse({ error: 'Rate limit exceeded. Please wait a minute.', code: 'RATE_LIMITED' }, 429);
    }

    // 3. Get tenant ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: 'No tenant found' }, 400);
    }

    const tenantId = profile.tenant_id;

    // 4. Parse request (refuse oversized bodies before buffering them)
    const declaredLength = Number(req.headers.get('content-length') || '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request too large', code: 'INPUT_TOO_LARGE' }, 413);
    }
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request too large', code: 'INPUT_TOO_LARGE' }, 413);
    }
    let body: ProxyRequestBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
    const {
      messages,
      maxTokens = 2000,
      temperature = 0.3,
      creditCost: requestedCreditCost,
      operationLabel = 'AI analysis',
      responseFormat = 'stream',
      model: modelOverride,
    } = body;

    // Server-side authoritative credit cost — clamps the client-supplied
    // value to the per-operation minimum (>= 1) so a tampered client can
    // never request a free or discounted AI call.
    const creditCost = resolveCreditCost(requestedCreditCost, operationLabel);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages array is required and must not be empty' }, 400);
    }
    if (messages.length > MAX_MESSAGES) {
      return jsonResponse({ error: `Too many messages (max ${MAX_MESSAGES})`, code: 'INPUT_TOO_LARGE' }, 413);
    }

    // SEC-12: validate generation params BEFORE any credit is consumed. A
    // non-numeric maxTokens would serialise to null and drop the output cap.
    if (typeof maxTokens !== 'number' || !Number.isFinite(maxTokens) || maxTokens < 1) {
      return jsonResponse({ error: 'maxTokens must be a positive number' }, 400);
    }
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
      return jsonResponse({ error: 'temperature must be a finite number' }, 400);
    }
    const safeMaxTokens = Math.min(Math.floor(maxTokens), MAX_OUTPUT_TOKENS);
    const safeTemperature = Math.max(0, Math.min(temperature, 2));

    // Validate message structure (supports both string content and multimodal array content)
    const usage: UsageEstimate = { textChars: 0, attachmentBytes: 0, imageParts: 0 };
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') {
        return jsonResponse({ error: 'Each message must be an object' }, 400);
      }
      if (!msg.role || typeof msg.role !== 'string') {
        return jsonResponse({ error: 'Each message must have a string role' }, 400);
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        return jsonResponse({ error: `Invalid role: ${msg.role}. Must be system, user, or assistant.` }, 400);
      }
      if (msg.content === undefined || msg.content === null) {
        return jsonResponse({ error: 'Each message must have content' }, 400);
      }
      if (typeof msg.content === 'string') {
        usage.textChars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        // Validate multimodal parts
        for (const part of msg.content) {
          if (!part || typeof part !== 'object' || typeof part.type !== 'string') {
            return jsonResponse({ error: 'Invalid multimodal content part' }, 400);
          }
          if (part.type === 'text') {
            if (typeof part.text !== 'string') {
              return jsonResponse({ error: 'Text part must have string text' }, 400);
            }
            usage.textChars += part.text.length;
          } else if (part.type === 'image_url') {
            if (!part.image_url || typeof part.image_url.url !== 'string') {
              return jsonResponse({ error: 'image_url part must have image_url.url' }, 400);
            }
            usage.attachmentBytes += part.image_url.url.length;
            usage.imageParts += 1;
          } else if ((part as { type: string }).type === 'file') {
            // EF-05: file parts are not priceable from request size (URL file_data,
            // per-page PDF billing) -> refuse instead of undercharging.
            return jsonResponse(
              { error: 'File attachments are not supported. Send images as image_url parts.', code: 'UNSUPPORTED_PART' },
              400
            );
          } else {
            return jsonResponse({ error: `Unsupported content part type: ${(part as { type: string }).type}` }, 400);
          }
        }
      } else {
        return jsonResponse({ error: 'content must be string or array of parts' }, 400);
      }
    }

    if (usage.textChars > MAX_TEXT_CHARS) {
      return jsonResponse(
        { error: `Text content (${usage.textChars} chars) exceeds limit (${MAX_TEXT_CHARS} chars).`, code: 'INPUT_TOO_LARGE' },
        413
      );
    }
    if (usage.attachmentBytes > MAX_ATTACHMENT_BYTES) {
      return jsonResponse(
        { error: `Attachments (${usage.attachmentBytes} bytes) exceed limit (${MAX_ATTACHMENT_BYTES} bytes).`, code: 'INPUT_TOO_LARGE' },
        413
      );
    }
    if (usage.imageParts > MAX_ATTACHMENT_PARTS) {
      return jsonResponse(
        { error: `Too many attachments (max ${MAX_ATTACHMENT_PARTS}).`, code: 'INPUT_TOO_LARGE' },
        413
      );
    }
    const totalContentSize = usage.textChars + usage.attachmentBytes;

    // Validate model override
    let chosenModel = MODEL;
    if (modelOverride) {
      if (!Object.prototype.hasOwnProperty.call(MODEL_COST_MULTIPLIER, modelOverride)) {
        return jsonResponse({ error: `Model not allowed: ${modelOverride}` }, 400);
      }
      chosenModel = modelOverride;
    }

    const isJsonMode = responseFormat === 'json';

    // 5. Atomic credit consumption. Server-side price by size (EF-05), never
    // below the operation floor; refused instead of capped when too large.
    const chargedCredits = priceCall(
      usage,
      safeMaxTokens,
      creditCost,
      MODEL_COST_MULTIPLIER[chosenModel] ?? 1,
    );
    if (chargedCredits > MAX_CHARGED_CREDITS) {
      return jsonResponse({ error: 'Request too large for a single AI call', code: 'INPUT_TOO_LARGE' }, 413);
    }

    const { data: consumed, error: consumeErr } = await supabase.rpc('consume_credits', {
      p_amount: chargedCredits,
      p_description: String(operationLabel).slice(0, 200),
      p_metadata: {
        model: chosenModel,
        user_id: user.id,
        size_bytes: totalContentSize,
        est_input_tokens: estimateInputTokens(usage),
        max_tokens: safeMaxTokens,
      },
      p_tenant_id: tenantId,
    });

    if (consumeErr || !consumed) {
      console.error('consume_credits failed:', consumeErr);
      return jsonResponse({ error: 'Credit check failed' }, 500);
    }

    const consumption = consumed as {
      success: boolean;
      code?: string;
      remaining?: number;
      from_monthly?: number;
      from_purchased?: number;
    };

    if (!consumption.success) {
      if (consumption.code === 'RATE_LIMITED') {
        return jsonResponse({ error: 'Rate limit exceeded. Please wait a minute.', code: 'RATE_LIMITED' }, 429);
      }
      if (consumption.code === 'NO_CREDIT_ACCOUNT') {
        return jsonResponse({ error: 'No billing credits found for tenant' }, 402);
      }
      const remaining = consumption.remaining ?? 0;
      return jsonResponse({
        error: `Not enough AI credits (${remaining} remaining, need ${chargedCredits}). Purchase more credits or upgrade your plan.`,
        code: 'INSUFFICIENT_CREDITS',
        remaining,
      }, 402);
    }

    const refund = async (reason: string) => {
      const { error: refundErr } = await supabase.rpc('refund_credits', {
        p_tenant_id: tenantId,
        p_from_monthly: consumption.from_monthly ?? 0,
        p_from_purchased: consumption.from_purchased ?? 0,
        p_description: String(operationLabel).slice(0, 150),
        p_metadata: { reason, model: chosenModel, user_id: user.id },
      });
      if (refundErr) console.error('refund_credits failed:', refundErr);
    };

    // 6. Forward to OpenRouter
    const openRouterBody: Record<string, unknown> = {
      model: chosenModel,
      messages,
      max_tokens: safeMaxTokens,
      temperature: safeTemperature,
      stream: !isJsonMode,
    };
    if (isJsonMode) {
      openRouterBody.response_format = { type: 'json_object' };
    }

    let openRouterResponse: Response;
    try {
      openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SUPABASE_URL,
        'X-Title': 'Trackbliss',
      },
      body: JSON.stringify(openRouterBody),
      });
    } catch (fetchErr) {
      console.error('OpenRouter request failed:', fetchErr);
      await refund('upstream_unreachable');
      return jsonResponse({ error: 'AI service unreachable' }, 502);
    }

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText.slice(0, 500));
      await refund(`upstream_${openRouterResponse.status}`);
      return jsonResponse({ error: `AI service error: ${openRouterResponse.status}` }, 502);
    }

    // 7a. JSON mode: return parsed response body
    if (isJsonMode) {
      let json: unknown;
      try {
        json = await openRouterResponse.json();
      } catch (parseErr) {
        console.error('OpenRouter returned invalid JSON:', parseErr);
        await refund('upstream_invalid_json');
        return jsonResponse({ error: 'AI service returned an invalid response' }, 502);
      }
      return jsonResponse(json, 200);
    }

    // 7b. Streaming mode: pipe SSE back to client
    return new Response(openRouterResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('openrouter-proxy error:', error);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
