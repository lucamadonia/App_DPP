import { useTranslation } from 'react-i18next';
import { FormGrid, FormField } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CATEGORY_OPTIONS, getCategoryConfig } from './pictogram-config';
import { useCategoryLabel } from './use-category-label';

export interface PictogramFormValues {
  name: string;
  description: string;
  category: string;
  regulationYear: string;
  tags: string;
}

interface PictogramFormFieldsProps {
  values: PictogramFormValues;
  onChange: (patch: Partial<PictogramFormValues>) => void;
  idPrefix: string;
}

/** The metadata fields shared by the upload and the edit dialog. */
export function PictogramFormFields({ values, onChange, idPrefix }: PictogramFormFieldsProps) {
  const { t } = useTranslation('products');
  const categoryLabel = useCategoryLabel();

  return (
    <FormGrid cols={2}>
      <FormField label={t('pictograms.name', 'Name')} required span="full" htmlFor={`${idPrefix}-name`}>
        <Input id={`${idPrefix}-name`} value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
      </FormField>
      <FormField label={t('pictograms.category', 'Category')} htmlFor={`${idPrefix}-category`}>
        <Select value={values.category} onValueChange={(category) => onChange({ category })}>
          <SelectTrigger id={`${idPrefix}-category`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((c) => {
              const cfg = getCategoryConfig(c);
              const Icon = cfg.icon;
              return (
                <SelectItem key={c} value={c}>
                  <span className="flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                    <span>{categoryLabel(c)}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t('pictograms.regulationYear', 'Regulation Year')} optional htmlFor={`${idPrefix}-year`}>
        <Input
          id={`${idPrefix}-year`}
          value={values.regulationYear}
          onChange={(e) => onChange({ regulationYear: e.target.value })}
          placeholder="e.g. ESPR 2024"
        />
      </FormField>
      <FormField label={t('pictograms.description', 'Description')} optional span="full" htmlFor={`${idPrefix}-description`}>
        <Textarea
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
        />
      </FormField>
      <FormField
        label={t('pictograms.tags', 'Tags')}
        optional
        span="full"
        htmlFor={`${idPrefix}-tags`}
        hint={t('pictograms.tagsPlaceholder', 'Comma-separated, e.g. CE, WEEE, RoHS')}
      >
        <Input
          id={`${idPrefix}-tags`}
          value={values.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="CE, WEEE, RoHS"
        />
      </FormField>
    </FormGrid>
  );
}

