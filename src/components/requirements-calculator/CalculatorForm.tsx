import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BatteryCharging,
  Calculator,
  CheckCircle2,
  Circle,
  CircuitBoard,
  FlaskConical,
  Globe2,
  Package,
  PackageCheck,
  Router,
  Wifi,
  Zap,
} from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Country, PackagingMaterial } from '@/data/calculator-options';
import { wirelessTypes } from '@/data/calculator-options';
import { Chip, ChipRail } from '@/components/knowledge/ChipRail';
import { FeatureToggle, FieldLabel, FormSection, OptionPills } from './FormControls';
import { PackagingMaterialPicker } from './PackagingMaterialPicker';
import {
  toggleInList,
  type BatteryType,
  type CalculatorConfig,
  type TargetAudience,
  type Voltage,
} from './calculator-logic';

interface ProductCategoryOption {
  id: string;
  name: string;
  subcategories: string[];
}

interface CalculatorFormProps {
  config: CalculatorConfig;
  update: (patch: Partial<CalculatorConfig>) => void;
  productCategories: ProductCategoryOption[];
  countries: Country[];
  packagingMaterials: PackagingMaterial[];
  onCalculate: () => void;
}

export function CalculatorForm({
  config: c,
  update,
  productCategories,
  countries,
  packagingMaterials,
  onCalculate,
}: CalculatorFormProps) {
  const { t } = useTranslation('compliance');
  const categoryInfo = productCategories.find((cat) => cat.id === c.selectedCategory);

  const checks = [
    { done: Boolean(c.selectedCategory), label: t('Category') },
    { done: Boolean(c.selectedSubcategory), label: t('Subcategory') },
    { done: c.selectedCountries.length > 0, label: t('at least one country') },
  ];
  const ready = checks.every((x) => x.done);

  return (
    <div className="space-y-5 sm:space-y-6">
      <FormSection
        icon={Calculator}
        step={1}
        title={t('Product Configuration')}
        description={t('Answer the following questions to determine all relevant requirements')}
      >
        <div>
          <FieldLabel htmlFor="product-name">{t('Product Name (optional)')}</FieldLabel>
          <Input
            id="product-name"
            placeholder={t('e.g. Smart Home Hub XL-500')}
            value={c.productName}
            onChange={(e) => update({ productName: e.target.value })}
            className="h-11 sm:h-10"
          />
        </div>

        <div>
          <FieldLabel required>{t('Product Category')}</FieldLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,7.5rem),1fr))] gap-2">
            {productCategories.map((cat) => {
              const CategoryIcon = getCategoryIcon(cat.id, cat.name);
              const selected = c.selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ selectedCategory: cat.id, selectedSubcategory: '' })}
                  className={cn(
                    'flex min-h-[84px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center',
                    'transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] motion-reduce:active:scale-100',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-primary/[0.08] ring-2 ring-primary/25'
                      : 'bg-card hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <CategoryIcon
                    className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className="w-full text-xs font-medium leading-tight break-words hyphens-auto">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {categoryInfo && (
          <div>
            <FieldLabel required>{t('Subcategory')}</FieldLabel>
            <Select value={c.selectedSubcategory} onValueChange={(v) => update({ selectedSubcategory: v })}>
              <SelectTrigger className="h-11 w-full sm:h-10 sm:max-w-md" aria-label={t('Subcategory')}>
                <SelectValue placeholder={t('Select subcategory...')} />
              </SelectTrigger>
              <SelectContent>
                {categoryInfo.subcategories.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <FieldLabel required>
            <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('Target Markets (Countries)')}
            {c.selectedCountries.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary tabular-nums">
                {c.selectedCountries.length}
              </span>
            )}
          </FieldLabel>
          <ChipRail label={t('Target Markets (Countries)')}>
            {countries.map((country) => (
              <Chip
                key={country.code}
                selected={c.selectedCountries.includes(country.code)}
                onClick={() => update({ selectedCountries: toggleInList(c.selectedCountries, country.code) })}
                icon={<span className="text-base leading-none" aria-hidden="true">{country.flag}</span>}
              >
                <span title={country.name}>{country.code}</span>
              </Chip>
            ))}
          </ChipRail>
        </div>

        <div>
          <FieldLabel required>{t('Target Audience')}</FieldLabel>
          <OptionPills<TargetAudience>
            label={t('Target Audience')}
            options={[
              { value: 'b2c', label: t('Consumer (B2C)') },
              { value: 'b2b', label: t('Business (B2B)') },
              { value: 'both', label: t('Both') },
            ]}
            isSelected={(v) => c.targetAudience === v}
            onToggle={(v) => update({ targetAudience: v })}
          />
        </div>
      </FormSection>

      <FormSection icon={Zap} step={2} title={t('Technical Properties')}>
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <FeatureToggle
            id="has-electronics"
            icon={CircuitBoard}
            label={t('Contains electronic components')}
            checked={c.hasElectronics}
            onChange={(v) => update({ hasElectronics: v })}
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Operating Voltage')}</p>
            <OptionPills<Voltage>
              label={t('Operating Voltage')}
              options={[
                { value: 'none', label: t('None / Battery') },
                { value: 'low', label: t('Low Voltage (<50V AC)') },
                { value: 'high', label: t('Mains Voltage (50-1000V AC)') },
              ]}
              isSelected={(v) => c.voltage === v}
              onToggle={(v) => update({ voltage: v })}
            />
          </FeatureToggle>

          <FeatureToggle
            id="has-battery"
            icon={BatteryCharging}
            label={t('Contains battery/rechargeable battery')}
            checked={c.hasBattery}
            onChange={(v) => update({ hasBattery: v })}
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Battery Type')}</p>
            <OptionPills<BatteryType>
              label={t('Battery Type')}
              options={[
                { value: 'removable', label: t('Removable') },
                { value: 'integrated', label: t('Built-in') },
                { value: 'external', label: t('External (power supply with battery)') },
              ]}
              isSelected={(v) => c.batteryType === v}
              onToggle={(v) => update({ batteryType: v })}
            />
          </FeatureToggle>

          <FeatureToggle
            id="has-wireless"
            icon={Wifi}
            label={t('Contains wireless capabilities')}
            checked={c.hasWireless}
            onChange={(v) => update({ hasWireless: v })}
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t('Wireless Standards')}</p>
            <OptionPills<string>
              label={t('Wireless Standards')}
              options={wirelessTypes.map((wt) => ({ value: wt.id, label: wt.name }))}
              isSelected={(v) => c.selectedWirelessTypes.includes(v)}
              onToggle={(v) => update({ selectedWirelessTypes: toggleInList(c.selectedWirelessTypes, v) })}
            />
          </FeatureToggle>

          <FeatureToggle
            id="is-connected"
            icon={Router}
            label={t('Connected device (IoT, Smart Home)')}
            checked={c.isConnected}
            onChange={(v) => update({ isConnected: v })}
          />

          <FeatureToggle
            id="contains-chemicals"
            icon={FlaskConical}
            label={t('Contains chemical substances/mixtures')}
            checked={c.containsChemicals}
            onChange={(v) => update({ containsChemicals: v })}
          />
        </div>
      </FormSection>

      <FormSection icon={Package} step={3} title={t('Packaging')}>
        <FeatureToggle
          id="has-packaging"
          icon={PackageCheck}
          label={t('Product is sold packaged')}
          checked={c.hasPackaging}
          onChange={(v) => update({ hasPackaging: v })}
        />
        {c.hasPackaging && (
          <PackagingMaterialPicker
            materials={packagingMaterials}
            selected={c.selectedPackagingMaterials}
            onToggle={(id) =>
              update({ selectedPackagingMaterials: toggleInList(c.selectedPackagingMaterials, id) })
            }
          />
        )}
      </FormSection>

      {/* Calculate CTA with readiness checklist */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 sm:mb-0" aria-label={t('Required fields')}>
          {checks.map((check) => (
            <li
              key={check.label}
              className={cn(
                'flex items-center gap-1.5 text-sm',
                check.done ? 'text-success' : 'text-muted-foreground'
              )}
            >
              {check.done ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
              {check.label}
            </li>
          ))}
        </ul>
        <Button size="lg" className="h-12 w-full gap-2 sm:w-auto" disabled={!ready} onClick={onCalculate}>
          <Calculator className="h-5 w-5" />
          {t('Calculate Requirements')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
}
