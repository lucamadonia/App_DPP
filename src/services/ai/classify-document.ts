/**
 * Orchestrator: classifyDocument()
 *
 * 1. Extract content from file (PDF text + image, or image, or plain text)
 * 2. Pre-match products heuristically (top-25)
 * 3. Build multimodal messages
 * 4. Call OpenRouter proxy (json response mode)
 * 5. Parse JSON result
 * 6. Return typed result OR normalised error
 */

import { supabase } from '@/lib/supabase';
import i18n from '@/i18n';
import { extractDocument, type ExtractedDocument } from '@/services/document-extraction';
import { prematchProducts, type PrematchProduct } from '@/lib/product-prematch';
import {
  buildUserMessages,
  parseClassificationResponse,
  type DocumentClassificationResult,
} from '@/services/openrouter/document-classification-prompts';
import { AI_CREDIT_COSTS } from '@/types/billing';

export type ClassifyOutcome =
  | {
      ok: true;
      result: DocumentClassificationResult;
      visionUsed: boolean;
      creditsCosted: number;
      extractionWarnings: string[];
    }
  | {
      ok: false;
      error: string;
      code:
        | 'no_session'
        | 'unsupported_file'
        | 'extraction_failed'
        | 'insufficient_credits'
        | 'rate_limit'
        | 'ai_error'
        | 'parse_error'
        | 'network_error';
      extractionWarnings?: string[];
    };

export interface ClassifyDocumentOptions {
  file: File;
  /** Current tenant's product list (full, we'll pre-filter) */
  products: PrematchProduct[];
  /** Optional caller-supplied AbortSignal */
  signal?: AbortSignal;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function classifyDocument(
  options: ClassifyDocumentOptions
): Promise<ClassifyOutcome> {
  const { file, products, signal } = options;

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      code: 'unsupported_file',
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    };
  }

  // 1. Extract
  let extracted: ExtractedDocument;
  try {
    extracted = await extractDocument(file);
  } catch (err) {
    return {
      ok: false,
      code: 'extraction_failed',
      error: err instanceof Error ? err.message : 'Extraction failed',
    };
  }

  if (extracted.kind === 'unsupported') {
    return {
      ok: false,
      code: 'unsupported_file',
      error: extracted.warnings.join(' '),
      extractionWarnings: extracted.warnings,
    };
  }

  const visionUsed = Boolean(extracted.pageImage);
  const creditCost = visionUsed
    ? AI_CREDIT_COSTS.document_classify_vision
    : AI_CREDIT_COSTS.document_classify_text;

  // 2. Pre-match products
  const candidates = prematchProducts(products, file.name, extracted.text, {
    limit: 25,
    minScore: 1,
  });

  // 3. Build messages
  const locale = i18n.language === 'de' ? 'de' : 'en';
  const messages = buildUserMessages({
    locale,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSizeKb: file.size / 1024,
    candidateProducts: candidates,
    extractedText: extracted.text,
    pageImage: extracted.pageImage || undefined,
    extractionWarnings: extracted.warnings,
  });

  // 4. Session + proxy call (JSON mode, non-streaming)
  // Ensure we have a fresh session (auto-refresh if stale)
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    // Try to refresh once
    const refreshResult = await supabase.auth.refreshSession();
    session = refreshResult.data.session;
  }
  if (!session?.access_token) {
    return { ok: false, code: 'no_session', error: 'Not signed in.' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/openrouter-proxy`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        messages,
        maxTokens: 1500,
        temperature: 0.1,
        creditCost,
        operationLabel: visionUsed
          ? 'Document classification (vision)'
          : 'Document classification',
        responseFormat: 'json',
      }),
    });
  } catch (err) {
    return {
      ok: false,
      code: 'network_error',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }

  if (!response.ok) {
    let errorBody: { error?: string; message?: string; code?: string; remaining?: number } = {};
    let rawBody = '';
    try {
      rawBody = await response.text();
      errorBody = JSON.parse(rawBody);
    } catch {
      /* not JSON */
    }
    const errorMessage = errorBody.error || errorBody.message || rawBody.slice(0, 200);

    // Log full error details for easier debugging
    console.error('[classifyDocument] Edge Function error:', {
      status: response.status,
      code: errorBody.code,
      message: errorMessage,
      rawBody: rawBody.slice(0, 500),
    });

    if (response.status === 401) {
      return {
        ok: false,
        code: 'no_session',
        error: `Auth error (${errorMessage || 'session expired'}). Please reload or sign in again.`,
      };
    }
    if (response.status === 402 || errorBody.code === 'INSUFFICIENT_CREDITS') {
      return {
        ok: false,
        code: 'insufficient_credits',
        error: errorMessage || 'Not enough AI credits.',
      };
    }
    if (response.status === 429) {
      return { ok: false, code: 'rate_limit', error: 'Rate limit exceeded. Try again in a minute.' };
    }
    return {
      ok: false,
      code: 'ai_error',
      error: errorMessage || `AI service error (${response.status})`,
    };
  }

  // 5. Parse OpenRouter envelope → extract content string → parse JSON
  type OpenRouterJsonResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let envelope: OpenRouterJsonResponse;
  try {
    envelope = (await response.json()) as OpenRouterJsonResponse;
  } catch (err) {
    return {
      ok: false,
      code: 'parse_error',
      error: err instanceof Error ? err.message : 'Failed to parse AI response',
    };
  }

  const rawContent = envelope.choices?.[0]?.message?.content ?? '';
  const parsed = parseClassificationResponse(rawContent);
  if (!parsed.ok) {
    console.error('Classification parse error:', parsed.error, parsed.rawPreview);
    return { ok: false, code: 'parse_error', error: parsed.error };
  }

  return {
    ok: true,
    result: parsed.data,
    visionUsed,
    creditsCosted: creditCost,
    extractionWarnings: extracted.warnings,
  };
}
