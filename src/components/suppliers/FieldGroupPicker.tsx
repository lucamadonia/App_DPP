import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { FieldGroup } from '@/types/supplier-data-portal';

interface FieldGroupPickerProps {
  groups: FieldGroup[];
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

export function FieldGroupPicker({ groups, selectedFields, onFieldsChange }: FieldGroupPickerProps) {
  const { t } = useTranslation('supplier-data-portal');
  const allFields = groups.flatMap(g => g.fields.map(f => f.key));

  const toggleField = (key: string) => {
    if (selectedFields.includes(key)) {
      onFieldsChange(selectedFields.filter(f => f !== key));
    } else {
      onFieldsChange([...selectedFields, key]);
    }
  };

  const toggleGroup = (group: FieldGroup) => {
    const groupKeys = group.fields.map(f => f.key);
    const allSelected = groupKeys.every(k => selectedFields.includes(k));
    if (allSelected) {
      onFieldsChange(selectedFields.filter(f => !groupKeys.includes(f)));
    } else {
      const newFields = [...new Set([...selectedFields, ...groupKeys])];
      onFieldsChange(newFields);
    }
  };

  const selectAll = () => onFieldsChange(allFields);
  const deselectAll = () => onFieldsChange([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('{{count}} fields selected', { count: selectedFields.length })}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            {t('Select All')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
            {t('Deselect All')}
          </Button>
        </div>
      </div>

      {groups.map((group) => {
        const groupKeys = group.fields.map(f => f.key);
        const selectedCount = groupKeys.filter(k => selectedFields.includes(k)).length;
        const allGroupSelected = selectedCount === groupKeys.length;

        return (
          <div key={group.category} className="space-y-2">
            <div
              className="flex items-center gap-2 cursor-pointer py-1"
              onClick={() => toggleGroup(group)}
            >
              <Checkbox
                checked={allGroupSelected}
                onCheckedChange={() => toggleGroup(group)}
                className="pointer-events-none"
              />
              <span className="text-sm font-semibold">
                {t(group.labelKey)} ({selectedCount}/{groupKeys.length})
              </span>
            </div>
            <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.fields.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${field.key}`}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <Label htmlFor={`field-${field.key}`} className="text-sm cursor-pointer">
                    {t(field.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
