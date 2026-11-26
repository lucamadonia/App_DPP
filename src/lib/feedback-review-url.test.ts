import { describe, expect, it } from 'vitest';
import { buildFeedbackReviewUrl, normalizeStorefrontReviewUrl } from './feedback-review-url';

describe('buildFeedbackReviewUrl', () => {
  const base = 'https://dpp-app.fambliss.eu';

  it('uses the storefront review page when configured', () => {
    expect(buildFeedbackReviewUrl('https://shop.fambliss.de/bewerten', 'abc234', base))
      .toBe('https://shop.fambliss.de/bewerten?t=abc234');
  });

  it('appends with & when the storefront url already has a query', () => {
    expect(buildFeedbackReviewUrl('https://shop.example/review?lang=de', 'abc234', base))
      .toBe('https://shop.example/review?lang=de&t=abc234');
  });

  it('falls back to the built-in form without a setting', () => {
    expect(buildFeedbackReviewUrl(undefined, 'abc234', `${base}/`))
      .toBe('https://dpp-app.fambliss.eu/feedback/abc234');
    expect(buildFeedbackReviewUrl('   ', 'abc234', base))
      .toBe('https://dpp-app.fambliss.eu/feedback/abc234');
  });

  it('ignores settings that are not https urls', () => {
    expect(normalizeStorefrontReviewUrl('http://shop.example/bewerten')).toBeNull();
    expect(normalizeStorefrontReviewUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeStorefrontReviewUrl('https://shop.example/a b')).toBeNull();
    expect(normalizeStorefrontReviewUrl(42)).toBeNull();
    expect(normalizeStorefrontReviewUrl(' https://shop.example/bewerten ')).toBe('https://shop.example/bewerten');
  });
});
