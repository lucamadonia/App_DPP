import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LABELS: Record<string, string> = {
  custom: 'Custom',
  compliance: 'Compliance',
  recycling: 'Recycling',
  safety: 'Safety',
  chemicals: 'Chemicals',
  energy: 'Energy',
  packaging: 'Packaging',
  transport: 'Transport',
};

/** Translated label for a pictogram category; unknown categories show as stored. */
export function useCategoryLabel() {
  const { t } = useTranslation('products');
  return useCallback(
    (category: string) => (LABELS[category] ? t(LABELS[category]) : category.charAt(0).toUpperCase() + category.slice(1)),
    [t],
  );
}
