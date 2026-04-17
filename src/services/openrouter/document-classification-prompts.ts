/**
 * Prompt builders + response parser for AI document classification.
 *
 * The AI must output a strict JSON object (no prose, no markdown fences).
 * We post-process with fence-stripping + shape validation so small model
 * deviations don't crash the UI.
 */

import { DOCUMENT_CATEGORIES, type DocumentCategory } from '@/lib/document-categories';
import type { ScoredProduct } from '@/lib/product-prematch';
import type {
  OpenRouterMessage,
  OpenRouterContentPart,
} from './types';

// ============================================
// RESULT TYPES
// ============================================

export type DocumentVisibility = 'internal' | 'customs' | 'consumer';
export type HintType =
  | 'expiry_soon'
  | 'already_expired'
  | 'no_expiry_date_found'
  | 'product_match_unsure'
  | 'no_product_match'
  | 'scanned_low_quality'
  | 'svhc_detected'
  | 'hazardous_substances'
  | 'multilingual_document'
  | 'unclear_content'
  | 'missing_required_info'
  | 'other';

export interface DocumentHint {
  /** Stable ID generated on save, used for acknowledge tracking */
  id?: string;
  type: HintType;
  message: string;
  /** ISO timestamp when the hint was marked as acknowledged (dismissed from dashboard) */
  acknowledgedAt?: string;
  /** User ID who acknowledged */
  acknowledgedBy?: string;
}

export interface DocumentClassificationResult {
  name: string;
  category: DocumentCategory;
  description: string;
  visibility: DocumentVisibility;
  validUntil: string | null; // ISO YYYY-MM-DD
  suggestedProductId: string | null;
  productMatchReason: string | null;
  certificationHints: string[];
  hints: DocumentHint[];
  confidence: {
    name: number;
    category: number;
    visibility: number;
    validUntil: number;
    product: number;
    overall: number;
  };
  unclear: boolean;
  unclearReason: string | null;
}

// ============================================
// SYSTEM PROMPT
// ============================================

export function buildSystemPrompt(locale: 'en' | 'de'): string {
  const categoriesList = DOCUMENT_CATEGORIES.map((c) => `"${c}"`).join(' | ');

  const outputLang = locale === 'de' ? 'German (Deutsch)' : 'English';

  return `You are an expert classifier for EU product-compliance documents (ESPR 2024/1781, GPSR, REACH, CLP, CE-marking directives, WEEE, BattG, VerpackG, ELV). You also understand invoices, quality reports, NDAs, contracts, and supplier-side documents.

TASK
Analyze ONE uploaded document (any source language) and return a single JSON object with its metadata.

OUTPUT LANGUAGE
\`name\`, \`description\`, \`productMatchReason\`, \`unclearReason\` and every hint \`message\` MUST be in: ${outputLang}.
The source document may be in any language — you understand all of them.

OUTPUT FORMAT
Return ONLY a single JSON object, no prose, no markdown fences, no explanation. The root object MUST conform to this schema:

{
  "name": string,                      // 3-80 chars, human-readable title (NOT the filename)
  "category": Category,                // exactly one of the enum below
  "description": string,               // 1-3 sentences summarising content
  "visibility": "internal" | "customs" | "consumer",
  "validUntil": string | null,         // ISO date "YYYY-MM-DD" or null
  "suggestedProductId": string | null, // product id from candidate list, or null
  "productMatchReason": string | null, // short reason why that product matches
  "certificationHints": string[],      // tokens like ["CE","ISO 9001","OEKO-TEX"] max 6
  "hints": [                           // ACTIONABLE HINTS for the user (see rules below)
    { "type": HintType, "message": string }
  ],
  "confidence": {
    "name": number,                    // 0..1
    "category": number,
    "visibility": number,
    "validUntil": number,
    "product": number,
    "overall": number
  },
  "unclear": boolean,                  // true only if doc is unreadable or unrelated
  "unclearReason": string | null
}

CATEGORY ENUM (choose exactly one):
${categoriesList}

VISIBILITY RULES
- "consumer": user-facing docs — manuals, warranties, consumer datasheets, how-to videos, declarations for the public passport.
- "customs": cross-border trade — CoO, invoices that are customs-relevant, export declarations, HS-code documentation.
- "internal": default — audits, NDAs, contracts, internal reports, price lists, supplier quality records, test reports not intended for the public.

VALID-UNTIL EXTRACTION
Scan for "Valid until", "Expiry", "Expires", "Date of expiry", "Gültig bis", "Ablaufdatum", "Gültigkeit". Normalise to YYYY-MM-DD. If a range is given, use the end date. If not found or ambiguous → null.

PRODUCT MATCHING
You receive a list of CANDIDATE PRODUCTS (may be empty). Match using:
1. Exact GTIN/EAN present in document → highest confidence.
2. Exact serial number match.
3. Manufacturer name + product-name substring.
4. Model number or distinct product descriptor.
If no confident match → suggestedProductId: null, confidence.product < 0.5, and ADD a hint {type: "no_product_match", ...}.
If weak match (confidence 0.5–0.7) → return the id but ADD hint {type: "product_match_unsure", ...}.

CERTIFICATION HINTS (short tokens)
Detect mentions of: CE, UKCA, FCC, RoHS, REACH, SVHC, ISO 9001, ISO 14001, ISO 45001, ISO 50001, ISO 27001, OEKO-TEX, GOTS, FSC, PEFC, Energy Star, EPEAT, Blue Angel, EU Ecolabel, Nordic Swan, Fairtrade, Rainforest Alliance, Cradle to Cradle, BPI, TÜV, UL, GS, CB, VDE, Intertek. Max 6 tokens.

HINTS (PROACTIVE WARNINGS) — this is important
Always scan for these conditions and add entries to the \`hints\` array when they apply:
- If validUntil is within the next 90 days → {type: "expiry_soon", message: "..."}
- If validUntil has already passed → {type: "already_expired", message: "..."}
- If no expiry date could be found in the document → {type: "no_expiry_date_found", message: "..."}
- If you matched a product with confidence < 0.7 → {type: "product_match_unsure", message: "... suggest user verify"}
- If no product match at all → {type: "no_product_match", message: "..."}
- If the scan/image quality is poor, partial, or rotated → {type: "scanned_low_quality", message: "..."}
- If SVHC substances are mentioned → {type: "svhc_detected", message: "Substances of Very High Concern detected: [list names]"}
- If hazardous-substance labels or H-phrases appear → {type: "hazardous_substances", message: "..."}
- If the document is in several languages → {type: "multilingual_document", message: "..."}
- If parts are unreadable/illegible → {type: "unclear_content", message: "..."}
- If required fields for its document-type are missing (e.g. a certificate without issuing body) → {type: "missing_required_info", message: "..."}
Each message should be 1 short sentence, actionable, in the output language.

CONFIDENCE CALIBRATION
- 0.95+ only when the document literally states the information (e.g. title "Safety Data Sheet" or "Issued by: TÜV Rheinland").
- 0.70–0.90 for strong heuristic matches.
- Below 0.50 = guessing; return the field but ALWAYS add an explanatory hint.
- \`confidence.overall\` = weighted average of all fields.

UNCLEAR HANDLING
If the document is unreadable, too small, a screenshot of an admin UI, a blank page, or clearly not a product/compliance document:
  unclear: true, unclearReason: "<short reason>", category: "Other", confidence.overall < 0.3,
  add hint {type: "unclear_content", ...}.

Remember: OUTPUT JSON ONLY. No explanations, no markdown fences, no leading/trailing text.`;
}

// ============================================
// USER PROMPT (multimodal builder)
// ============================================

export interface BuildUserPromptParams {
  locale: 'en' | 'de';
  fileName: string;
  mimeType: string;
  fileSizeKb: number;
  candidateProducts: ScoredProduct[];
  extractedText: string;
  pageImage?: string; // data:image/...;base64,...
  extractionWarnings: string[];
}

export function buildUserMessages(params: BuildUserPromptParams): OpenRouterMessage[] {
  const {
    locale,
    fileName,
    mimeType,
    fileSizeKb,
    candidateProducts,
    extractedText,
    pageImage,
    extractionWarnings,
  } = params;

  const slimProducts = candidateProducts.map((p) => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer ?? null,
    gtin: p.gtin ?? null,
    serial: p.serialNumber ?? null,
    category: p.category ?? null,
    prematchScore: p.score,
    prematchReason: p.reason,
  }));

  const hasImage = Boolean(pageImage);
  const hasText = extractedText.length > 20;

  const contextBlock = [
    `LOCALE: ${locale}`,
    `FILE_NAME: ${fileName}`,
    `MIME: ${mimeType}`,
    `FILE_SIZE_KB: ${fileSizeKb.toFixed(1)}`,
    extractionWarnings.length > 0
      ? `EXTRACTION_WARNINGS: ${JSON.stringify(extractionWarnings)}`
      : null,
    '',
    `CANDIDATE_PRODUCTS (pre-matched, top ${slimProducts.length}, may be empty):`,
    JSON.stringify(slimProducts, null, 2),
    '',
    hasText
      ? `DOCUMENT_TEXT_EXTRACT (first pages; may be truncated):\n--- BEGIN ---\n${extractedText}\n--- END ---`
      : `DOCUMENT_TEXT_EXTRACT: [no extractable text — rely on the image]`,
    '',
    hasImage
      ? 'An image of page 1 is attached. Inspect it visually for content the text layer missed (layout, stamps, signatures, language).'
      : 'No image attached — classify from text only.',
    '',
    'Classify this document and respond with the JSON object ONLY.',
  ]
    .filter(Boolean)
    .join('\n');

  const userContent: OpenRouterContentPart[] = [
    { type: 'text', text: contextBlock },
  ];

  if (pageImage) {
    userContent.push({
      type: 'image_url',
      image_url: { url: pageImage },
    });
  }

  return [
    { role: 'system', content: buildSystemPrompt(locale) },
    { role: 'user', content: userContent },
  ];
}

// ============================================
// RESPONSE PARSER
// ============================================

/**
 * Robust parser: strips markdown fences, extracts first {...} block,
 * validates required shape, clamps confidences 0..1.
 */
export function parseClassificationResponse(
  raw: string
):
  | { ok: true; data: DocumentClassificationResult }
  | { ok: false; error: string; rawPreview: string } {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Empty response', rawPreview: '' };
  }

  let text = raw.trim();

  // 1. Strip markdown fences ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    text = fenced[1].trim();
  }

  // 2. Extract first balanced JSON object
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last <= first) {
    return {
      ok: false,
      error: 'No JSON object found in response',
      rawPreview: raw.slice(0, 200),
    };
  }
  const jsonCandidate = text.slice(first, last + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : 'parse error'}`,
      rawPreview: jsonCandidate.slice(0, 300),
    };
  }

  // 3. Shape validation + coercion
  const validated = validateAndCoerce(parsed);
  if (!validated.ok) {
    return { ok: false, error: validated.error, rawPreview: jsonCandidate.slice(0, 300) };
  }

  return { ok: true, data: validated.data };
}

function clamp01(n: unknown, fallback = 0.5): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function validateAndCoerce(
  obj: unknown
):
  | { ok: true; data: DocumentClassificationResult }
  | { ok: false; error: string } {
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'Response is not an object' };
  }
  const r = obj as Record<string, unknown>;

  const name = typeof r.name === 'string' ? r.name.slice(0, 120) : '';
  if (!name) return { ok: false, error: 'Missing or invalid `name`' };

  const category: DocumentCategory = DOCUMENT_CATEGORIES.includes(
    r.category as DocumentCategory
  )
    ? (r.category as DocumentCategory)
    : 'Other';

  const description =
    typeof r.description === 'string' ? r.description.slice(0, 800) : '';

  const visibility: DocumentVisibility = ['internal', 'customs', 'consumer'].includes(
    r.visibility as string
  )
    ? (r.visibility as DocumentVisibility)
    : 'internal';

  let validUntil: string | null = null;
  if (typeof r.validUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.validUntil)) {
    validUntil = r.validUntil;
  }

  const suggestedProductId =
    typeof r.suggestedProductId === 'string' && r.suggestedProductId.length > 0
      ? r.suggestedProductId
      : null;
  const productMatchReason =
    typeof r.productMatchReason === 'string' ? r.productMatchReason : null;

  const certificationHints = Array.isArray(r.certificationHints)
    ? (r.certificationHints as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .slice(0, 6)
    : [];

  const hints: DocumentHint[] = Array.isArray(r.hints)
    ? (r.hints as unknown[])
        .filter(
          (h): h is DocumentHint =>
            !!h &&
            typeof h === 'object' &&
            typeof (h as Record<string, unknown>).type === 'string' &&
            typeof (h as Record<string, unknown>).message === 'string'
        )
        .slice(0, 10)
        .map((h) => ({
          id:
            typeof h.id === 'string' && h.id.length > 0
              ? h.id
              : `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          type: h.type,
          message: h.message,
        }))
    : [];

  const confObj = (r.confidence && typeof r.confidence === 'object'
    ? (r.confidence as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const confidence = {
    name: clamp01(confObj.name),
    category: clamp01(confObj.category),
    visibility: clamp01(confObj.visibility),
    validUntil: clamp01(confObj.validUntil),
    product: clamp01(confObj.product),
    overall: clamp01(confObj.overall),
  };

  const unclear = Boolean(r.unclear);
  const unclearReason = typeof r.unclearReason === 'string' ? r.unclearReason : null;

  return {
    ok: true,
    data: {
      name,
      category,
      description,
      visibility,
      validUntil,
      suggestedProductId,
      productMatchReason,
      certificationHints,
      hints,
      confidence,
      unclear,
      unclearReason,
    },
  };
}
