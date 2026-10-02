const LOCALE_MAP: Record<string, string> = {
  en: 'en-IE', // euro prices for an EU audience: "€49", "€0.18"
  de: 'de-DE', // "49 €", "0,18 €"
  el: 'el-GR',
};

function resolveLocale(lang: string | undefined): string {
  const base = (lang || 'en').split('-')[0];
  return LOCALE_MAP[base] ?? lang ?? 'en-IE';
}

/**
 * Locale-aware EUR price for marketing pages. Whole amounts render without
 * cents ("49 €"); fractional amounts keep 2-3 decimals ("0,145 €").
 */
export function formatEur(amount: number, lang: string | undefined): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(resolveLocale(lang), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 3,
  }).format(amount);
}
