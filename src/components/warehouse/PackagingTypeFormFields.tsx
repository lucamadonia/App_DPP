/**
 * Packaging type (Umverpackung) form state + field groups. Shared by the
 * create wizard and the edit dialog in PackagingTypesPage. Groups render
 * fields only; callers wrap them in wizard steps or a FormSectionNav.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, Layers, Package, Ruler } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  FormField, FormGrid, FormSectionNav, FormToggleRow, InputAffix,
} from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { PackagingMaterialFields } from '@/components/compliance/PackagingMaterialFields';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';

export interface PackagingFormState {
  id?: string;
  name: string;
  description: string;
  tare_weight_grams: string;
  inner_length_cm: string;
  inner_width_cm: string;
  inner_height_cm: string;
  max_load_grams: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: string;
  stock_tracked: boolean;
  stock_threshold: string;
  primary_material: LucidMaterial | null;
  material_split: MaterialSplitEntry[] | null;
}

export const EMPTY_PACKAGING_FORM: PackagingFormState = {
  name: '',
  description: '',
  tare_weight_grams: '0',
  inner_length_cm: '',
  inner_width_cm: '',
  inner_height_cm: '',
  max_load_grams: '',
  is_active: true,
  is_default: false,
  sort_order: '0',
  stock_tracked: false,
  stock_threshold: '10',
  primary_material: null,
  material_split: null,
};

export interface PackagingFieldsProps {
  form: PackagingFormState;
  onChange: (updates: Partial<PackagingFormState>) => void;
}

/** Name, description and tare weight. */
export function PackagingIdentityFields({ form, onChange }: PackagingFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={2}>
      <FormField label={t('Name')} htmlFor="pkg-name" required span="full">
        <Input
          id="pkg-name"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t('z.B. Versandkarton M')}
        />
      </FormField>
      <FormField label={t('Beschreibung')} htmlFor="pkg-desc" optional span="full">
        <Input
          id="pkg-desc"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t('Kurze Erklärung wofür')}
        />
      </FormField>
      <FormField label={t('Tare weight')} htmlFor="pkg-tare" required>
        <InputAffix suffix="g">
          <Input
            id="pkg-tare"
            type="number"
            inputMode="numeric"
            value={form.tare_weight_grams}
            onChange={(e) => onChange({ tare_weight_grams: e.target.value })}
          />
        </InputAffix>
      </FormField>
    </FormGrid>
  );
}

/** Inner dimensions (L × W × H, always one row) and max load. */
export function PackagingSizeFields({ form, onChange }: PackagingFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <div className="space-y-5">
      <fieldset className="min-w-0">
        <legend className="mb-2 flex min-h-5 w-full items-center justify-between text-sm font-medium leading-5">
          {t('Inner dimensions')}
          <span className="text-xs font-normal text-muted-foreground">{t('L × W × H in cm')}</span>
        </legend>
        <div className="grid grid-cols-3 gap-2">
            <Input
              id="pkg-length"
              aria-label={`${t('Länge')} (cm)`}
              placeholder={t('Länge')}
              type="number"
              inputMode="decimal"
              step="0.5"
              className="tabular-nums pointer-coarse:h-11"
              value={form.inner_length_cm}
              onChange={(e) => onChange({ inner_length_cm: e.target.value })}
            />
            <Input
              id="pkg-width"
              aria-label={`${t('Breite')} (cm)`}
              placeholder={t('Breite')}
              type="number"
              inputMode="decimal"
              step="0.5"
              className="tabular-nums pointer-coarse:h-11"
              value={form.inner_width_cm}
              onChange={(e) => onChange({ inner_width_cm: e.target.value })}
            />
            <Input
              id="pkg-height"
              aria-label={`${t('Höhe')} (cm)`}
              placeholder={t('Höhe')}
              type="number"
              inputMode="decimal"
              step="0.5"
              className="tabular-nums pointer-coarse:h-11"
              value={form.inner_height_cm}
              onChange={(e) => onChange({ inner_height_cm: e.target.value })}
            />
        </div>
      </fieldset>
      <FormGrid cols={2}>
        <FormField label={t('Max load')} htmlFor="pkg-maxload" optional>
          <InputAffix suffix="g">
            <Input
              id="pkg-maxload"
              type="number"
              inputMode="numeric"
              value={form.max_load_grams}
              onChange={(e) => onChange({ max_load_grams: e.target.value })}
            />
          </InputAffix>
        </FormField>
      </FormGrid>
    </div>
  );
}

/** Stock tracking + warning threshold, then rarely changed list settings. */
export function PackagingStockFields({ form, onChange }: PackagingFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <div className="space-y-5">
      <FormToggleRow
        htmlFor="pkg-tracked"
        label={t('Bestand tracken')}
      >
        <Switch id="pkg-tracked" checked={form.stock_tracked} onCheckedChange={(v) => onChange({ stock_tracked: v })} />
      </FormToggleRow>
      {form.stock_tracked && (
        <FormGrid cols={2}>
          <FormField label={t('Warnschwelle')} htmlFor="pkg-threshold" hint={t('Ab diesem Stand kommt eine Warnung')}>
            <Input
              id="pkg-threshold"
              type="number"
              inputMode="numeric"
              min="0"
              value={form.stock_threshold}
              onChange={(e) => onChange({ stock_threshold: e.target.value })}
            />
          </FormField>
        </FormGrid>
      )}
      <div className="space-y-3">
        <FormToggleRow htmlFor="pkg-active" label={t('Aktiv')}>
          <Switch id="pkg-active" checked={form.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
        </FormToggleRow>
        <FormToggleRow htmlFor="pkg-default" label={t('Default bei Auto-Vorschlag')}>
          <Switch id="pkg-default" checked={form.is_default} onCheckedChange={(v) => onChange({ is_default: v })} />
        </FormToggleRow>
      </div>
      <FormGrid cols={2}>
        <FormField label={t('Sortierung')} htmlFor="pkg-sort" optional>
          <Input
            id="pkg-sort"
            type="number"
            inputMode="numeric"
            value={form.sort_order}
            onChange={(e) => onChange({ sort_order: e.target.value })}
          />
        </FormField>
      </FormGrid>
    </div>
  );
}

/** Packaging material composition (PPWR). */
export function PackagingMaterialStep({ form, onChange }: PackagingFieldsProps) {
  return (
    <PackagingMaterialFields
      primaryMaterial={form.primary_material}
      materialSplit={form.material_split}
      tareWeightGrams={parseInt(form.tare_weight_grams) || 0}
      onChange={(patch) => onChange({
        ...(patch.primaryMaterial !== undefined ? { primary_material: patch.primaryMaterial } : {}),
        ...(patch.materialSplit !== undefined ? { material_split: patch.materialSplit } : {}),
      })}
    />
  );
}

/** Edit form: one section at a time. */
export function PackagingTypeEditSections({ form, onChange }: PackagingFieldsProps) {
  const { t } = useTranslation('warehouse');
  const [section, setSection] = useState('basics');
  return (
    <FormSectionNav
      sections={[
        { id: 'basics', label: t('Name'), icon: Package },
        { id: 'stock', label: t('Stock'), icon: Boxes },
        { id: 'materials', label: t('Materials'), icon: Layers },
      ]}
      value={section}
      onValueChange={setSection}
    >
      {section === 'basics' && (
        <div className="space-y-5">
          <PackagingIdentityFields form={form} onChange={onChange} />
          <PackagingSizeFields form={form} onChange={onChange} />
        </div>
      )}
      {section === 'stock' && <PackagingStockFields form={form} onChange={onChange} />}
      {section === 'materials' && <PackagingMaterialStep form={form} onChange={onChange} />}
    </FormSectionNav>
  );
}

/** Create flow: four short steps, each fitting one phone screen. */
export function PackagingTypeCreateWizard({
  form,
  onChange,
  onCancel,
  onFinish,
  finishing,
}: PackagingFieldsProps & {
  onCancel: () => void;
  onFinish: () => void | Promise<void>;
  finishing?: boolean;
}) {
  const { t } = useTranslation('warehouse');
  return (
    <FormWizard
      variant="dialog"
      onCancel={onCancel}
      onFinish={onFinish}
      finishing={finishing}
      finishLabel={t('Save')}
      steps={[
        {
          id: 'identity',
          title: t('Name and weight'),
          shortTitle: t('Name'),
          icon: Package,
          canNext: Boolean(form.name.trim()),
          content: <PackagingIdentityFields form={form} onChange={onChange} />,
        },
        {
          id: 'size',
          title: t('Inner dimensions'),
          shortTitle: t('Size'),
          description: t('Used to suggest the right box automatically.'),
          icon: Ruler,
          content: <PackagingSizeFields form={form} onChange={onChange} />,
        },
        {
          id: 'stock',
          title: t('Stock'),
          shortTitle: t('Stock'),
          icon: Boxes,
          content: <PackagingStockFields form={form} onChange={onChange} />,
        },
        {
          id: 'materials',
          title: t('Materials'),
          shortTitle: t('Materials'),
          icon: Layers,
          content: <PackagingMaterialStep form={form} onChange={onChange} />,
        },
      ]}
    />
  );
}
