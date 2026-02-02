const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
};

export function formatDate(date: string | Date, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(LOCALE_MAP[locale] || locale);
}

export function formatNumber(num: number, locale: string = 'en'): string {
  return num.toLocaleString(LOCALE_MAP[locale] || locale);
}

export function formatCurrency(amount: number, currency: string = 'EUR', locale: string = 'en'): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale] || locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
