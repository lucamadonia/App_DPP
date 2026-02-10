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

interface ProxyRequestBody {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  creditCost?: number;
  operationLabel?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify JWT auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

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
    const { messages, maxTokens = 2000, temperature = 0.3, creditCost = 1, operationLabel = 'AI analysis' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: 'messages array is required and must not be empty' }, 400);
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        return jsonResponse({ error: 'Each message must have a string role and content' }, 400);
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        return jsonResponse({ error: `Invalid role: ${msg.role}. Must be system, user, or assistant.` }, 400);
      }
    }

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

    // 6. Forward to OpenRouter with streaming
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': SUPABASE_URL,
        'X-Title': 'Trackbliss',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: Math.min(maxTokens, 8000), // Cap to prevent abuse
        temperature: Math.max(0, Math.min(temperature, 2)), // Clamp 0-2
        stream: true,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText);
      return jsonResponse({ error: `AI service error: ${openRouterResponse.status}` }, 502);
    }

    // 7. Stream the response back to the client
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
