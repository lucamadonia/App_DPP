import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RhReturnReason, RhFollowUpQuestion } from '@/types/returns-hub';

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

      {/* Reason category cards */}
      <div className="space-y-2">
        <Label>{t('Select a reason category')}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reasons.filter(r => r.active).map((reason) => (
            <button
              key={reason.id}
              type="button"
              onClick={() => {
                onCategoryChange(reason.category);
                onSubcategoryChange('');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedCategory === reason.category
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-medium text-sm">{reason.category}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onCategoryChange('other');
              onSubcategoryChange('');
            }}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedCategory === 'other'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="font-medium text-sm">{t('Other')}</span>
          </button>
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
