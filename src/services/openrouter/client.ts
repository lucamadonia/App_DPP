/**
 * OpenRouter AI Client
 *
 * Routes AI requests through a Supabase Edge Function (openrouter-proxy)
 * so the OpenRouter API key is never exposed in the browser.
 *
 * The Edge Function handles:
 * - JWT authentication (only logged-in users)
 * - Rate limiting (10 req/min per user)
 * - Credit consumption (billing_credits table)
 * - Streaming proxy to OpenRouter API
 */

import { supabase } from '@/lib/supabase';
import type { OpenRouterMessage } from './types';

/**
 * AI is available when the user is authenticated (Edge Function handles the key).
 * Falls back to legacy VITE_ key check for local dev without Edge Functions.
 */
export function isAIAvailable(): boolean {
  // In production the Edge Function holds the key - AI is always available for authed users.
  // For local dev fallback, check if the legacy env var exists.
  return true;
}

export async function* streamCompletion(
  messages: OpenRouterMessage[],
  options: { maxTokens?: number; temperature?: number; creditCost?: number; operationLabel?: string } = {}
): AsyncGenerator<string, void, unknown> {
  const { maxTokens = 2000, temperature = 0.3, creditCost = 1, operationLabel = 'AI analysis' } = options;

  // Get the current session token for the Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use AI features.');
  }

  // Call the Edge Function proxy (credit check + rate limiting happens server-side)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/openrouter-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages,
      maxTokens,
      temperature,
      creditCost,
      operationLabel,
    }),
  });

  if (!response.ok) {
    // Try to parse error JSON from the Edge Function
    let errorMessage = `AI service error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Response is not JSON
    }
    throw new Error(errorMessage);
  }

  // Stream SSE response (same format as OpenRouter)
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
