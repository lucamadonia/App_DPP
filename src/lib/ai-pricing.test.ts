import { describe, expect, it } from 'vitest';
import { estimateInputTokens, priceCall } from '../../supabase/functions/openrouter-proxy/pricing';

const text = (chars: number) => ({ textChars: chars, attachmentBytes: 0, imageParts: 0 });

describe('openrouter-proxy size-based pricing (EF-05)', () => {
  it('charges the floor for normal prompts', () => {
    // 20 KB prompt, 3000 output tokens: 6.7k + 15k units -> 1 credit
    expect(priceCall(text(20_000), 3000, 1, 1)).toBe(1);
    // client floor of 3 still applies
    expect(priceCall(text(20_000), 3000, 3, 1)).toBe(3);
  });

  it('scales with input size and max_tokens', () => {
    // 400k chars (~133k tokens) + 8000 output (40k units) -> ceil(173.4k / 40k) = 5
    expect(priceCall(text(400_000), 8000, 1, 1)).toBe(5);
    // a large prompt can no longer ride on the 1-credit floor
    expect(priceCall(text(300_000), 2000, 1, 1)).toBeGreaterThan(1);
  });

  it('applies the model multiplier', () => {
    expect(priceCall(text(400_000), 8000, 1, 5)).toBe(25);
  });

  it('prices attachments conservatively', () => {
    // images are priced per part regardless of URL/base64 length
    const image = { textChars: 2000, attachmentBytes: 500_000, imageParts: 1 };
    expect(estimateInputTokens(image)).toBe(Math.ceil(2000 / 3) + 1600);
    const viaUrl = { textChars: 2000, attachmentBytes: 30, imageParts: 1 };
    expect(estimateInputTokens(viaUrl)).toBe(estimateInputTokens(image));
    // 12 images (max parts) + 8000 output tokens -> ceil((667 + 19200 + 40000) / 40k) = 2
    expect(priceCall({ textChars: 2000, attachmentBytes: 0, imageParts: 12 }, 8000, 1, 1)).toBe(2);
  });

  it('never charges less than one credit, even for tampered inputs', () => {
    expect(priceCall(text(0), 0, 0, 0)).toBe(1);
    expect(priceCall(text(-5), -1, Number.NaN, Number.NaN)).toBe(1);
  });
});
