// Canonical return-reason categories the public portal seeds, plus their
// bilingual labels. Mirrors REASON_META in ReturnReasonStep.tsx (which uses
// i18n keys for the wizard), but is usable from non-React contexts too — most
// importantly the email-notification renderer, which only knows a 'de'/'en'
// locale string and has no access to `t()`.
//
// Both the admin Return-detail UI and the confirmation email resolve the raw
// `reasonCategory` slug (e.g. "other") through here so a customer never sees a
// bare machine slug like "Reason: other".

export const RETURN_REASON_CATEGORIES = [
  'damaged',
  'defective',
  'wrong_item',
  'not_as_described',
  'not_needed',
  'arrived_late',
  'other',
] as const;

export type ReturnReasonCategory = (typeof RETURN_REASON_CATEGORIES)[number];

const LABELS: Record<string, { de: string; en: string }> = {
  damaged:          { de: 'Beschädigt',            en: 'Damaged' },
  defective:        { de: 'Defekt',                en: 'Defective' },
  wrong_item:       { de: 'Falscher Artikel',      en: 'Wrong item' },
  not_as_described: { de: 'Nicht wie beschrieben', en: 'Not as described' },
  not_needed:       { de: 'Nicht mehr benötigt',   en: 'No longer needed' },
  arrived_late:     { de: 'Zu spät angekommen',    en: 'Arrived late' },
  other:            { de: 'Sonstiges',             en: 'Other' },
};

/** True when `value` is one of the canonical seeded reason slugs. */
export function isReasonCategory(value?: string | null): boolean {
  return !!value && (RETURN_REASON_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Human-readable label for a reason category in the given locale. Unknown /
 * tenant-custom slugs are humanized (snake_case → Title Case) so they still
 * read sensibly instead of showing the raw slug.
 */
export function getReturnReasonLabel(category?: string | null, locale: string = 'de'): string {
  if (!category) return '';
  const entry = LABELS[category];
  if (entry) return locale.startsWith('de') ? entry.de : entry.en;
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
