/**
 * Warehouse location field groups, shared by the create wizard
 * (LocationsPage) and the edit dialog (LocationDetailPage).
 * Groups render fields only; callers wrap them in wizard steps or sections.
 */
import { useTranslation } from 'react-i18next';
import { Building2, Handshake, RotateCcw, Truck, Warehouse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChoiceCards, FormField, FormGrid, InputAffix, type ChoiceOption,
} from '@/components/ui/form-layout';
import type { WarehouseLocationType, WhLocationInput } from '@/types/warehouse';

export interface LocationFieldsProps {
  form: WhLocationInput;
  onChange: (updates: Partial<WhLocationInput>) => void;
}

const numberOrUndefined = (value: string) => (value ? Number(value) : undefined);

/** Name, code and type. */
export function LocationIdentityFields({ form, onChange }: LocationFieldsProps) {
  const { t } = useTranslation('warehouse');
  const typeOptions: ChoiceOption<WarehouseLocationType>[] = [
    { value: 'main', label: t('main'), icon: Warehouse },
    { value: 'external', label: t('external'), icon: Building2 },
    { value: 'dropship', label: t('dropship'), icon: Truck },
    { value: 'consignment', label: t('consignment'), icon: Handshake },
    { value: 'returns', label: t('returns'), icon: RotateCcw },
  ];
  return (
    <FormGrid cols={6}>
      <FormField label={t('Location Name')} required span={4}>
        <Input value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
      </FormField>
      <FormField label={t('Location Code')} optional span={2}>
        <Input
          value={form.code || ''}
          autoCapitalize="characters"
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder="WH-01"
        />
      </FormField>
      <FormField label={t('Location Type')} span="full">
        <ChoiceCards
          value={form.type || 'main'}
          onValueChange={(v) => onChange({ type: v })}
          options={typeOptions}
          columns={2}
        />
      </FormField>
    </FormGrid>
  );
}

/** Address and GLN. `withStreet` adds street + postal code (edit form). */
export function LocationAddressFields({
  form,
  onChange,
  withStreet = false,
}: LocationFieldsProps & { withStreet?: boolean }) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={6}>
      {withStreet && (
        <FormField label={t('Street')} span="full">
          <Input
            autoComplete="street-address"
            value={form.street || ''}
            onChange={(e) => onChange({ street: e.target.value })}
          />
        </FormField>
      )}
      {withStreet && (
        <FormField label={t('Postal Code')} span={2}>
          <Input
            autoComplete="postal-code"
            value={form.postalCode || ''}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
        </FormField>
      )}
      <FormField label={t('City')} span={withStreet ? 4 : 3}>
        <Input
          autoComplete="address-level2"
          value={form.city || ''}
          onChange={(e) => onChange({ city: e.target.value })}
        />
      </FormField>
      <FormField label={t('Country')} span={withStreet ? 'full' : 3}>
        <Input
          autoComplete="country-name"
          value={form.country || ''}
          onChange={(e) => onChange({ country: e.target.value })}
        />
      </FormField>
      <FormField label={t('Facility Identifier')} optional span="full" hint={t('Global Location Number (GLN), 13 digits.')}>
        <Input
          inputMode="numeric"
          value={form.facilityIdentifier || ''}
          onChange={(e) => onChange({ facilityIdentifier: e.target.value })}
          placeholder="GLN"
        />
      </FormField>
    </FormGrid>
  );
}

/** Capacity units, area and volume with unit affixes. */
export function LocationCapacityFields({ form, onChange }: LocationFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <FormGrid cols={3}>
      <FormField label={t('Capacity Units')} optional>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={form.capacityUnits ?? ''}
          onChange={(e) => onChange({ capacityUnits: numberOrUndefined(e.target.value) })}
        />
      </FormField>
      <FormField label={t('Area')} optional>
        <InputAffix suffix="m²">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={form.areaM2 ?? ''}
            onChange={(e) => onChange({ areaM2: numberOrUndefined(e.target.value) })}
          />
        </InputAffix>
      </FormField>
      <FormField label={t('Capacity Volume')} optional>
        <InputAffix suffix="m³">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={form.capacityVolumeM3 ?? ''}
            onChange={(e) => onChange({ capacityVolumeM3: numberOrUndefined(e.target.value) })}
          />
        </InputAffix>
      </FormField>
    </FormGrid>
  );
}

export function LocationNotesField({ form, onChange }: LocationFieldsProps) {
  const { t } = useTranslation('warehouse');
  return (
    <FormField label={t('Notes')} optional>
      <Textarea value={form.notes || ''} onChange={(e) => onChange({ notes: e.target.value })} rows={2} />
    </FormField>
  );
}
