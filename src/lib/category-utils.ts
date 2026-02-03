import type { Category } from '@/types/database';

export function getCategoryDisplayName(cat: Category, locale: string): string {
  return cat.translations?.[locale] || cat.name;
}

export function getSubcategoryDisplayName(cat: Category, subName: string, locale: string): string {
  return cat.subcategory_translations?.[subName]?.[locale] || subName;
}
