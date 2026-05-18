import { useTranslation } from 'react-i18next';
import {
  PackageX,
  Wrench,
  PackageMinus,
  FileWarning,
  ThumbsDown,
  Clock,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RhReturnReason, RhFollowUpQuestion } from '@/types/returns-hub';

// Visual + i18n key per reason category. Anything not in this map falls
// back to a neutral icon and the raw category slug — but the seven slugs
// we seed today are covered.
const REASON_META: Record<string, { icon: LucideIcon; labelKey: string }> = {
  damaged:          { icon: PackageX,        labelKey: 'reason_damaged' },
  defective:        { icon: Wrench,          labelKey: 'reason_defective' },
  wrong_item:       { icon: PackageMinus,    labelKey: 'reason_wrong_item' },
  not_as_described: { icon: FileWarning,     labelKey: 'reason_not_as_described' },
  not_needed:       { icon: ThumbsDown,      labelKey: 'reason_not_needed' },
  arrived_late:     { icon: Clock,           labelKey: 'reason_arrived_late' },
  other:            { icon: MoreHorizontal,  labelKey: 'reason_other' },
};

interface ReturnReasonStepProps {
  reasons: RhReturnReason[];
  selectedCategory: string;
  selectedSubcategory: string;
  reasonText: string;
  followUpAnswers: Record<string, string>;
  onCategoryChange: (v: string) => void;
  onSubcategoryChange: (v: string) => void;
  onReasonTextChange: (v: string) => void;
  onFollowUpChange: (questionId: string, value: string) => void;
}

export function ReturnReasonStep({
  reasons,
  selectedCategory,
  selectedSubcategory,
  reasonText,
  followUpAnswers,
  onCategoryChange,
  onSubcategoryChange,
  onReasonTextChange,
  onFollowUpChange,
}: ReturnReasonStepProps) {
  const { t } = useTranslation('returns');

  const selectedReason = reasons.find(r => r.category === selectedCategory);
  const subcategories = selectedReason?.subcategories || [];
  const followUpQuestions = selectedReason?.followUpQuestions || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Return Reason')}</h2>
        <p className="text-sm text-muted-foreground">{t('Why are you returning?')}</p>
      </div>

      {/* Reason category cards — icon + translated label, fallback to the
          raw slug + neutral icon if the tenant adds custom categories. */}
      <div className="space-y-2">
        <Label>{t('Select a reason category')}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {reasons.filter((r) => r.active).map((reason) => {
            const meta = REASON_META[reason.category];
            const Icon = meta?.icon ?? MoreHorizontal;
            const label = meta ? t(meta.labelKey) : reason.category;
            const isSelected = selectedCategory === reason.category;
            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => {
                  onCategoryChange(reason.category);
                  onSubcategoryChange('');
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[5.5rem] ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-muted/30'
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                  strokeWidth={1.6}
                />
                <span className={`text-xs sm:text-sm font-medium leading-tight ${isSelected ? 'text-primary' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
          {/* Always offer an Other fallback even if the tenant didn't seed it,
              so the customer is never stuck. Hidden when the tenant explicitly
              defined 'other' so we don't show two duplicate tiles. */}
          {!reasons.some((r) => r.active && r.category === 'other') && (
            <button
              type="button"
              onClick={() => {
                onCategoryChange('other');
                onSubcategoryChange('');
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 text-center transition-all min-h-[5.5rem] ${
                selectedCategory === 'other'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-muted/30'
              }`}
            >
              <MoreHorizontal
                className={`h-6 w-6 ${selectedCategory === 'other' ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={1.6}
              />
              <span className="text-xs sm:text-sm font-medium leading-tight">
                {t('reason_other')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Subcategory chips */}
      {subcategories.length > 0 && (
        <div className="space-y-2 animate-scale-in">
          <Label>{t('Subcategory')}</Label>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => onSubcategoryChange(sub)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selectedSubcategory === sub
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {followUpQuestions.length > 0 && (
        <div className="space-y-4 animate-scale-in">
          {followUpQuestions.map((q: RhFollowUpQuestion) => (
            <div key={q.id} className="space-y-2">
              <Label>{q.question}{q.required && <span className="text-destructive"> *</span>}</Label>
              {q.type === 'text' && (
                <Input
                  value={followUpAnswers[q.id] || ''}
                  onChange={(e) => onFollowUpChange(q.id, e.target.value)}
                />
              )}
              {q.type === 'select' && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onFollowUpChange(q.id, opt)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        followUpAnswers[q.id] === opt
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'boolean' && (
                <div className="flex gap-2">
                  {['Yes', 'No'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onFollowUpChange(q.id, opt)}
                      className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                        followUpAnswers[q.id] === opt
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Additional text */}
      <div className="space-y-2">
        <Label>{t('Additional Details')}</Label>
        <Textarea
          value={reasonText}
          onChange={(e) => onReasonTextChange(e.target.value)}
          placeholder={t('Please provide additional details about the return reason...')}
          rows={3}
        />
      </div>
    </div>
  );
}
