import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RETURN_FIELDS, CUSTOMER_FIELDS, TICKET_FIELDS } from '@/types/workflow-builder';
import type { FieldMetadata } from '@/types/workflow-builder';

interface FieldPickerProps {
  value: string;
  onChange: (field: string) => void;
}

export function FieldPicker({ value, onChange }: FieldPickerProps) {
  const { t } = useTranslation('returns');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('Select Field')} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('Return Fields')}</SelectLabel>
          {RETURN_FIELDS.map((f) => (
            <SelectItem key={`return.${f.key}`} value={`return.${f.key}`}>
              {t(f.label)}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t('Customer Fields')}</SelectLabel>
          {CUSTOMER_FIELDS.map((f) => (
            <SelectItem key={`customer.${f.key}`} value={`customer.${f.key}`}>
              {t(f.label)}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>{t('Ticket Fields')}</SelectLabel>
          {TICKET_FIELDS.map((f) => (
            <SelectItem key={`ticket.${f.key}`} value={`ticket.${f.key}`}>
              {t(f.label)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Resolve full FieldMetadata for a dotted path like "return.status" */
export function resolveField(fieldPath: string): FieldMetadata | undefined {
  const [entity, ...keyParts] = fieldPath.split('.');
  const key = keyParts.join('.');
  const allFields = [...RETURN_FIELDS, ...CUSTOMER_FIELDS, ...TICKET_FIELDS];
  return allFields.find((f) => f.entity === entity && f.key === key);
}
