/**
 * Size-based AI credit pricing for openrouter-proxy (EF-05).
 *
 * Pure functions, no Deno APIs, so they are unit-testable from Node/vitest.
 * Token counts are conservative estimates (overestimate rather than
 * undercharge); the upstream bill is driven by input + output tokens.
 */

export const TEXT_CHARS_PER_TOKEN = 3; // German text averages ~3.5 chars/token
export const IMAGE_PART_TOKENS = 1_600; // Claude downscales images to <= ~1.15 MP
export const OUTPUT_TOKEN_WEIGHT = 5; // output price / input price (Sonnet: $15 vs $3 per M)
export const TOKEN_UNITS_PER_CREDIT = 40_000; // ~= USD 0.12 at Sonnet input price
export const MIN_CREDITS_PER_CALL = 1;

export interface UsageEstimate {
  /** Characters of plain text (string contents + text parts). */
  textChars: number;
  /** Length of image URLs / base64 image data (size cap only, not priced). */
  attachmentBytes: number;
  imageParts: number;
}

/** Estimated input tokens for a validated message list. */
export function estimateInputTokens(u: UsageEstimate): number {
  // Only text and image parts reach pricing: `file` parts are rejected by the
  // proxy because PDFs are billed per page (and may be passed by URL), so
  // their cost cannot be bounded from the request size.
  return (
    Math.ceil(Math.max(0, u.textChars) / TEXT_CHARS_PER_TOKEN) +
    Math.max(0, u.imageParts) * IMAGE_PART_TOKENS
  );
}

/**
 * Credits for one call: ceil((input tokens + 5 x max output tokens) / 40k),
 * never below the operation floor (>= 1), times the model multiplier.
 */
export function priceCall(
  u: UsageEstimate,
  maxOutputTokens: number,
  operationFloor: number,
  modelMultiplier: number,
): number {
  const units = estimateInputTokens(u) + OUTPUT_TOKEN_WEIGHT * Math.max(0, Math.floor(maxOutputTokens));
  const sizeCredits = Math.ceil(units / TOKEN_UNITS_PER_CREDIT);
  const floor = Number.isFinite(operationFloor) ? Math.floor(operationFloor) : MIN_CREDITS_PER_CALL;
  const multiplier = Number.isFinite(modelMultiplier) ? Math.max(1, Math.ceil(modelMultiplier)) : 1;
  return Math.max(floor, sizeCredits, MIN_CREDITS_PER_CALL) * multiplier;
}
