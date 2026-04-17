/**
 * Supabase Edge Function: openrouter-proxy
 *
 * Proxies AI requests to OpenRouter API so the API key never reaches the client.
 * Includes JWT auth, per-user rate limiting, and credit consumption.
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
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

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

// Maximum total size (bytes) of all message content (approx) — guards against huge base64 uploads
const MAX_TOTAL_CONTENT_BYTES = 15 * 1024 * 1024; // 15 MB

// Allowed models (if client overrides)
const ALLOWED_MODELS = new Set([
  'anthropic/claude-sonnet-4',
  'anthropic/claude-opus-4',
]);

// Decode a JWT payload WITHOUT signature verification.
// We trust this because Supabase Gateway (verify_jwt=true) already
// verified the signature before forwarding to this function.
// This avoids algorithm-compatibility issues (HS256 vs ES256) in the
// supabase-js client across Supabase JWT-key migrations.
interface JwtPayload {
  sub?: string;
  email?: string;
  aud?: string | string[];
  exp?: number;
  role?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64-url decode
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad
    while (payload.length % 4) payload += '=';
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify JWT auth (manual decode; Gateway already validated signature)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = decodeJwtPayload(token);

    if (!payload?.sub) {
      return jsonResponse({ error: 'Invalid token (no sub claim)' }, 401);
    }

    // Reject anon/service tokens that don't represent a real user
    if (payload.role !== 'authenticated') {
      return jsonResponse({ error: 'Unauthorized (not an authenticated user token)' }, 401);
    }

    // Optional: explicit expiry check (Gateway does this but extra safety)
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return jsonResponse({ error: 'Token expired' }, 401);
    }

    const user = { id: payload.sub, email: payload.email };

    // 2. Rate limiting
    if (!checkRateLimit(user.id)) {
      return jsonResponse({ error: 'Rate limit exceeded. Maximum 10 requests per minute.' }, 429);
    }

    // Periodic cleanup
    if (rateLimitMap.size > 1000) {
      cleanRateLimitMap();
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

    // 4. Parse request
    const body: ProxyRequestBody = await req.json();
    const {
      messages,
      maxTokens = 2000,
      temperature = 0.3,
      creditCost = 1,
      operationLabel = 'AI analysis',
      responseFormat = 'stream',
      model: modelOverride,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages array is required and must not be empty' }, 400);
    }

    // Validate message structure (supports both string content and multimodal array content)
    let totalContentSize = 0;
    for (const msg of messages) {
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
        totalContentSize += msg.content.length;
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
            totalContentSize += part.text.length;
          } else if (part.type === 'image_url') {
            if (!part.image_url || typeof part.image_url.url !== 'string') {
              return jsonResponse({ error: 'image_url part must have image_url.url' }, 400);
            }
            totalContentSize += part.image_url.url.length;
          } else if (part.type === 'file') {
            if (!part.file || typeof part.file.file_data !== 'string' || typeof part.file.filename !== 'string') {
              return jsonResponse({ error: 'file part must have file.file_data and file.filename' }, 400);
            }
            totalContentSize += part.file.file_data.length;
          } else {
            return jsonResponse({ error: `Unsupported content part type: ${(part as { type: string }).type}` }, 400);
          }
        }
      } else {
        return jsonResponse({ error: 'content must be string or array of parts' }, 400);
      }
    }

    if (totalContentSize > MAX_TOTAL_CONTENT_BYTES) {
      return jsonResponse(
        { error: `Total content size (${totalContentSize} bytes) exceeds limit (${MAX_TOTAL_CONTENT_BYTES} bytes).` },
        413
      );
    }

    // Validate model override
    let chosenModel = MODEL;
    if (modelOverride) {
      if (!ALLOWED_MODELS.has(modelOverride)) {
        return jsonResponse({ error: `Model not allowed: ${modelOverride}` }, 400);
      }
      chosenModel = modelOverride;
    }

    const isJsonMode = responseFormat === 'json';

    // 5. Credit check and consumption
    if (creditCost > 0) {
      const { data: credits } = await supabase
        .from('billing_credits')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (!credits) {
        return jsonResponse({ error: 'No billing credits found for tenant' }, 402);
      }

      const monthlyRemaining = Math.max(0, credits.monthly_allowance - credits.monthly_used);
      const totalAvailable = monthlyRemaining + credits.purchased_balance;

      if (totalAvailable < creditCost) {
        return jsonResponse({
          error: `Not enough AI credits (${totalAvailable} remaining, need ${creditCost}). Purchase more credits or upgrade your plan.`,
          code: 'INSUFFICIENT_CREDITS',
          remaining: totalAvailable,
        }, 402);
      }

      // Consume credits
      const fromMonthly = Math.min(creditCost, monthlyRemaining);
      const fromPurchased = creditCost - fromMonthly;

      await supabase
        .from('billing_credits')
        .update({
          monthly_used: credits.monthly_used + fromMonthly,
          purchased_balance: credits.purchased_balance - fromPurchased,
          total_consumed: credits.total_consumed + creditCost,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      // Log transaction
      const transactions = [];
      if (fromMonthly > 0) {
        transactions.push({
          tenant_id: tenantId,
          type: 'consumption',
          amount: -fromMonthly,
          source: 'monthly',
          description: operationLabel,
          user_id: user.id,
          balance_after: monthlyRemaining - fromMonthly + credits.purchased_balance,
        });
      }
      if (fromPurchased > 0) {
        transactions.push({
          tenant_id: tenantId,
          type: 'consumption',
          amount: -fromPurchased,
          source: 'purchased',
          description: operationLabel,
          user_id: user.id,
          balance_after: credits.purchased_balance - fromPurchased,
        });
      }
      if (transactions.length > 0) {
        await supabase.from('billing_credit_transactions').insert(transactions);
      }
    }

    // 6. Forward to OpenRouter
    const openRouterBody: Record<string, unknown> = {
      model: chosenModel,
      messages,
      max_tokens: Math.min(maxTokens, 8000),
      temperature: Math.max(0, Math.min(temperature, 2)),
      stream: !isJsonMode,
    };
    if (isJsonMode) {
      openRouterBody.response_format = { type: 'json_object' };
    }

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SUPABASE_URL,
        'X-Title': 'Trackbliss',
      },
      body: JSON.stringify(openRouterBody),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText);
      return jsonResponse({ error: `AI service error: ${openRouterResponse.status}` }, 502);
    }

    // 7a. JSON mode: return parsed response body
    if (isJsonMode) {
      const json = await openRouterResponse.json();
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
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
