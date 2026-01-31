import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { RhReturnReason } from '@/types/returns-hub';

interface ReturnReasonSelectProps {
  reasons: RhReturnReason[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  reasonText?: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  onReasonTextChange: (text: string) => void;
}

export function ReturnReasonSelect({
  reasons,
  selectedCategory,
  selectedSubcategory,
  reasonText,
  onCategoryChange,
  onSubcategoryChange,
  onReasonTextChange,
}: ReturnReasonSelectProps) {
  const { t } = useTranslation('returns');
  const [subcategories, setSubcategories] = useState<string[]>([]);

  useEffect(() => {
    if (selectedCategory) {
      const reason = reasons.find(r => r.category === selectedCategory);
      setSubcategories(reason?.subcategories || []);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory, reasons]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('Reason Category')}</Label>
        <Select value={selectedCategory || ''} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('Select a reason')} />
          </SelectTrigger>
          <SelectContent>
            {reasons.filter(r => r.active).map((reason) => (
              <SelectItem key={reason.id} value={reason.category}>
                {reason.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label>{t('Reason Subcategory')}</Label>
          <Select value={selectedSubcategory || ''} onValueChange={onSubcategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder={t('Select a subcategory')} />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t('Additional Details')}</Label>
        <Textarea
          value={reasonText || ''}
          onChange={(e) => onReasonTextChange(e.target.value)}
          placeholder={t('Please provide additional details about the return reason...')}
          rows={3}
        />
      </div>
    </div>
  );
}
