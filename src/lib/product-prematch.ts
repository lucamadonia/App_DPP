/**
 * Product pre-matching heuristic.
 *
 * Given a file name + extracted document text + candidate product list,
 * returns the top-N products most likely to match (by exact GTIN, exact serial,
 * manufacturer substring, and name-token overlap).
 *
 * This narrows the product list we send to the AI (keeps the prompt small
 * for tenants with 100+ products while still giving the AI strong candidates).
 */

export interface PrematchProduct {
  id: string;
  name: string;
  manufacturer?: string;
  gtin?: string;
  serialNumber?: string;
  category?: string;
}

export interface ScoredProduct extends PrematchProduct {
  score: number;
  reason: string;
}

const STOPWORDS = new Set([
  'the', 'a', 'and', 'or', 'for', 'of', 'to', 'with', 'in', 'on', 'at', 'by',
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'und', 'oder',
  'für', 'mit', 'im', 'am', 'zu', 'von', 'bei',
]);

function tokenize(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

/**
 * Score a single product against a haystack (filename + extracted text).
 * +10 for exact GTIN (13-digit), +8 for serial number match,
 * +4 per manufacturer substring, +2 per matching name-token (TF-IDF-ish capped).
 */
function scoreProduct(
  product: PrematchProduct,
  haystack: string,
  haystackTokens: Set<string>
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const lower = haystack.toLowerCase();

  // GTIN exact (strongest signal — 8/13-digit codes)
  if (product.gtin && product.gtin.length >= 8) {
    const gtinNormalized = product.gtin.replace(/\D/g, '');
    if (gtinNormalized.length >= 8 && lower.includes(gtinNormalized)) {
      score += 10;
      reasons.push(`GTIN ${product.gtin}`);
    }
  }

  // Serial exact
  if (product.serialNumber && product.serialNumber.length >= 4) {
    const serial = product.serialNumber.toLowerCase();
    if (lower.includes(serial)) {
      score += 8;
      reasons.push(`Serial ${product.serialNumber}`);
    }
  }

  // Manufacturer substring (case-insensitive)
  if (product.manufacturer && product.manufacturer.length >= 3) {
    const mfr = product.manufacturer.toLowerCase();
    if (lower.includes(mfr)) {
      score += 4;
      reasons.push(`Manufacturer "${product.manufacturer}"`);
    }
  }

  // Name-token overlap (weighted by token length; cap contribution)
  if (product.name) {
    const nameTokens = tokenize(product.name);
    let tokenHits = 0;
    for (const token of nameTokens) {
      if (haystackTokens.has(token)) {
        tokenHits++;
      }
    }
    if (tokenHits > 0) {
      const contribution = Math.min(tokenHits * 2, 6);
      score += contribution;
      reasons.push(`${tokenHits} name-token match${tokenHits === 1 ? '' : 'es'}`);
    }
  }

  return { score, reason: reasons.join(', ') };
}

/**
 * Pre-match products against document content.
 * Returns top-N scored products (minScore default 1, limit default 25).
 * If zero matches, returns empty array — AI will be told "no pre-matched products".
 */
export function prematchProducts(
  products: PrematchProduct[],
  fileName: string,
  extractedText: string,
  options: { limit?: number; minScore?: number } = {}
): ScoredProduct[] {
  const { limit = 25, minScore = 1 } = options;
  if (products.length === 0) return [];

  const haystack = `${fileName} ${extractedText}`;
  const haystackTokens = tokenize(haystack);

  const scored: ScoredProduct[] = products
    .map((p) => {
      const { score, reason } = scoreProduct(p, haystack, haystackTokens);
      return { ...p, score, reason };
    })
    .filter((p) => p.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
