import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookOpen,
  Video,
  HelpCircle,
  Shield,
  Wrench,
  Package,
  Plus,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormSection, FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, OptionalDisclosure } from '@/components/ui/form-layout';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { SupportResources, VideoLink, FAQItem, SparePart } from '@/types/database';

interface Props {
  supportResources: SupportResources;
  onChange: (resources: SupportResources) => void;
  readOnly?: boolean;
}

function SortableFAQItem({
  item,
  index,
  onUpdateQuestion,
  onUpdateAnswer,
  onRemove,
  readOnly,
}: {
  item: FAQItem;
  index: number;
  onUpdateQuestion: (value: string) => void;
  onUpdateAnswer: (value: string) => void;
  onRemove: () => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation('products');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `faq-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex items-start gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Drag handle + number */}
        {!readOnly && (
          <button
            type="button"
            aria-label={t('Drag to reorder')}
            className="-ml-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing pointer-coarse:size-11"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <FormField label={t('Question')}>
            <Input
              value={item.question}
              onChange={(e) => onUpdateQuestion(e.target.value)}
              placeholder={t('Enter question...')}
              disabled={readOnly}
            />
          </FormField>
          <FormField label={t('Answer')}>
            <RichTextEditor
              value={item.answer}
              onChange={onUpdateAnswer}
              placeholder={t('Enter answer...')}
              disabled={readOnly}
              minHeight="5rem"
              compact
            />
          </FormField>
        </div>
        {!readOnly && (
          <Button variant="ghost" size="icon" className="shrink-0 pointer-coarse:size-11" aria-label={t('Delete', { ns: 'common' })} onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProductSupportTab({ supportResources, onChange, readOnly }: Props) {
  const { t } = useTranslation('products');
  const [activeSection, setActiveSection] = useState<string>('instructions');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const update = (field: string, value: unknown) => {
    onChange({ ...supportResources, [field]: value });
  };

  const sections = [
    { id: 'instructions', label: t('Instructions'), icon: BookOpen },
    { id: 'videos', label: t('Videos'), icon: Video },
    { id: 'faq', label: t('FAQ'), icon: HelpCircle },
    { id: 'warranty', label: t('Warranty'), icon: Shield },
    { id: 'repair', label: t('Repair'), icon: Wrench },
    { id: 'spareParts', label: t('Spare Parts'), icon: Package },
  ];

  // Video management
  const videos = supportResources.videos || [];
  const addVideo = () => {
    update('videos', [...videos, { title: '', url: '', type: 'youtube' as const }]);
  };
  const removeVideo = (index: number) => {
    update('videos', videos.filter((_: VideoLink, i: number) => i !== index));
  };
  const updateVideo = (index: number, field: string, value: string) => {
    update('videos', videos.map((v: VideoLink, i: number) => i === index ? { ...v, [field]: value } : v));
  };

  // FAQ management
  const faq = supportResources.faq || [];
  const addFAQ = () => {
    update('faq', [...faq, { question: '', answer: '' }]);
  };
  const removeFAQ = (index: number) => {
    update('faq', faq.filter((_: FAQItem, i: number) => i !== index));
  };
  const updateFAQ = (index: number, field: string, value: string) => {
    update('faq', faq.map((f: FAQItem, i: number) => i === index ? { ...f, [field]: value } : f));
  };

  const handleFAQDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = parseInt(String(active.id).replace('faq-', ''));
    const newIndex = parseInt(String(over.id).replace('faq-', ''));
    update('faq', arrayMove(faq, oldIndex, newIndex));
  };

  // Spare parts management
  const spareParts = supportResources.spareParts || [];
  const addSparePart = () => {
    update('spareParts', [...spareParts, { name: '', partNumber: '', price: 0, currency: 'EUR', available: true }]);
  };
  const removeSparePart = (index: number) => {
    update('spareParts', spareParts.filter((_: SparePart, i: number) => i !== index));
  };
  const updateSparePart = (index: number, field: string, value: unknown) => {
    update('spareParts', spareParts.map((p: SparePart, i: number) => i === index ? { ...p, [field]: value } : p));
  };

  const activeMeta = sections.find(s => s.id === activeSection) ?? sections[0];

  return (
    <div className="space-y-6">
      {/* Section navigation — scrolls horizontally on phones instead of wrapping */}
      <div
        role="tablist"
        aria-label={t('Support')}
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map(section => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'inline-flex min-h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 text-sm font-medium outline-none pointer-coarse:min-h-11',
                'transition-[background-color,border-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <section.icon className="size-4" aria-hidden="true" />
              {section.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={activeMeta.label}>
      {/* Instructions */}
      {activeSection === 'instructions' && (
        <FormSection
          title={t('Customer Instructions')}
          description={t('Usage instructions and assembly guides')}
          icon={BookOpen}
          layout="stacked"
          variant="plain"
        >
          <FormField label={t('Usage Instructions')}>
            <RichTextEditor
              value={supportResources.instructions || ''}
              onChange={(html) => update('instructions', html)}
              placeholder={t('Enter usage instructions...')}
              disabled={readOnly}
              minHeight="6rem"
            />
          </FormField>
          <OptionalDisclosure
            label={t('Assembly Guide')}
            filledCount={supportResources.assemblyGuide && supportResources.assemblyGuide !== '<p></p>' ? 1 : 0}
          >
            <RichTextEditor
              value={supportResources.assemblyGuide || ''}
              onChange={(html) => update('assemblyGuide', html)}
              placeholder={t('Enter assembly/installation guide...')}
              disabled={readOnly}
              minHeight="6rem"
            />
          </OptionalDisclosure>
        </FormSection>
      )}

      {/* Videos */}
      {activeSection === 'videos' && (
        <FormSection
          title={t('Video Links')}
          description={t('Tutorial and product videos')}
          icon={Video}
          layout="stacked"
          variant="plain"
          aside={!readOnly && (
            <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={addVideo}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Video')}
            </Button>
          )}
        >
          {videos.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t('No videos added yet')}
            </p>
          ) : (
            videos.map((video: VideoLink, index: number) => (
              <div key={index} className="rounded-lg border bg-card p-4">
                <FormGrid cols={6}>
                  <FormField label={t('Title')} span={2}>
                    <Input
                      value={video.title}
                      onChange={(e) => updateVideo(index, 'title', e.target.value)}
                      placeholder={t('Video title')}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t('URL')} span={4}>
                    <Input
                      type="url"
                      inputMode="url"
                      value={video.url}
                      onChange={(e) => updateVideo(index, 'url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t('Type')} span="full">
                    <ChoiceCards
                      value={video.type}
                      onValueChange={(v) => updateVideo(index, 'type', v)}
                      columns={3}
                      disabled={readOnly}
                      options={[
                        { value: 'youtube', label: 'YouTube' },
                        { value: 'vimeo', label: 'Vimeo' },
                        { value: 'direct', label: t('Direct Link') },
                      ]}
                    />
                  </FormField>
                </FormGrid>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {video.url ? (
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t('Open video')}
                    </a>
                  ) : <span />}
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="pointer-coarse:size-11" aria-label={t('Delete', { ns: 'common' })} onClick={() => removeVideo(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </FormSection>
      )}

      {/* FAQ */}
      {activeSection === 'faq' && (
        <FormSection
          title={t('Frequently Asked Questions')}
          description={faq.length > 1 && !readOnly ? t('Drag to reorder') : undefined}
          icon={HelpCircle}
          layout="stacked"
          variant="plain"
          aside={!readOnly && (
            <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={addFAQ}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Question')}
            </Button>
          )}
        >
          {faq.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t('No FAQ entries yet')}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFAQDragEnd}
            >
              <SortableContext
                items={faq.map((_: FAQItem, i: number) => `faq-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {faq.map((item: FAQItem, index: number) => (
                    <SortableFAQItem
                      key={`faq-${index}`}
                      item={item}
                      index={index}
                      onUpdateQuestion={(v) => updateFAQ(index, 'question', v)}
                      onUpdateAnswer={(v) => updateFAQ(index, 'answer', v)}
                      onRemove={() => removeFAQ(index)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </FormSection>
      )}

      {/* Warranty */}
      {activeSection === 'warranty' && (
        <FormSection title={t('Warranty Information')} icon={Shield} layout="stacked" variant="plain">
          <FormGrid cols={2}>
            <FormField label={t('Warranty Duration')} span="full">
              <InputAffix suffix={t('months')}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={supportResources.warranty?.durationMonths || ''}
                  onChange={(e) => update('warranty', {
                    ...supportResources.warranty,
                    durationMonths: parseInt(e.target.value) || undefined,
                  })}
                  placeholder="24"
                  disabled={readOnly}
                />
              </InputAffix>
            </FormField>
            <FormField label={t('Contact Email')} optional>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={supportResources.warranty?.contactEmail || ''}
                onChange={(e) => update('warranty', {
                  ...supportResources.warranty,
                  contactEmail: e.target.value,
                })}
                placeholder="warranty@example.com"
                disabled={readOnly}
              />
            </FormField>
            <FormField label={t('Contact Phone')} optional>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={supportResources.warranty?.contactPhone || ''}
                onChange={(e) => update('warranty', {
                  ...supportResources.warranty,
                  contactPhone: e.target.value,
                })}
                placeholder="+49 123 456789"
                disabled={readOnly}
              />
            </FormField>
            <FormField label={t('Warranty Terms')} optional span="full">
              <RichTextEditor
                value={supportResources.warranty?.terms || ''}
                onChange={(html) => update('warranty', {
                  ...supportResources.warranty,
                  terms: html,
                })}
                placeholder={t('Enter warranty terms and conditions...')}
                disabled={readOnly}
                minHeight="6rem"
              />
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {/* Repair */}
      {activeSection === 'repair' && (
        <FormSection title={t('Repair Information')} icon={Wrench} layout="stacked" variant="plain">
          <FormField label={t('Repair Guide')}>
            <RichTextEditor
              value={supportResources.repairInfo?.repairGuide || ''}
              onChange={(html) => update('repairInfo', {
                ...supportResources.repairInfo,
                repairGuide: html,
              })}
              placeholder={t('Enter repair instructions...')}
              disabled={readOnly}
              minHeight="6rem"
            />
          </FormField>
          <FormField
            label={t('Repairability Score')}
            optional
            labelAside={supportResources.repairInfo?.repairabilityScore ? (
              <span className="tabular-nums font-medium text-foreground">{supportResources.repairInfo.repairabilityScore}/10</span>
            ) : undefined}
            hint={t('1 = hard to repair, 10 = easy to repair')}
          >
            <InputAffix suffix="/ 10">
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="10"
                value={supportResources.repairInfo?.repairabilityScore || ''}
                onChange={(e) => update('repairInfo', {
                  ...supportResources.repairInfo,
                  repairabilityScore: parseInt(e.target.value) || undefined,
                })}
                placeholder="7"
                disabled={readOnly}
              />
            </InputAffix>
          </FormField>
          {supportResources.repairInfo?.repairabilityScore && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                style={{ width: `${(supportResources.repairInfo.repairabilityScore / 10) * 100}%` }}
              />
            </div>
          )}
          <FormField label={t('Authorized Service Centers')} optional hint={t('One per line')}>
            <Textarea
              value={(supportResources.repairInfo?.serviceCenters || []).join('\n')}
              onChange={(e) => update('repairInfo', {
                ...supportResources.repairInfo,
                serviceCenters: e.target.value.split('\n').filter(Boolean),
              })}
              placeholder={t('Service Center Name, City')}
              disabled={readOnly}
              rows={3}
            />
          </FormField>
        </FormSection>
      )}

      {/* Spare Parts */}
      {activeSection === 'spareParts' && (
        <FormSection
          title={t('Spare Parts')}
          description={t('Available replacement parts')}
          icon={Package}
          layout="stacked"
          variant="plain"
          aside={!readOnly && (
            <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={addSparePart}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Part')}
            </Button>
          )}
        >
          {spareParts.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t('No spare parts listed')}
            </p>
          ) : (
            spareParts.map((part: SparePart, index: number) => (
              <div key={index} className="rounded-lg border bg-card p-4">
                <FormGrid cols={6}>
                  <FormField label={t('Part Name')} span={3}>
                    <Input
                      value={part.name}
                      onChange={(e) => updateSparePart(index, 'name', e.target.value)}
                      placeholder={t('e.g. Battery')}
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t('Part Number')} optional span={3}>
                    <Input
                      value={part.partNumber || ''}
                      onChange={(e) => updateSparePart(index, 'partNumber', e.target.value)}
                      placeholder="BAT-001"
                      className="font-mono"
                      disabled={readOnly}
                    />
                  </FormField>
                  <FormField label={t('Price')} optional span={3}>
                    <InputAffix suffix={part.currency || 'EUR'}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={part.price || ''}
                        onChange={(e) => updateSparePart(index, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        disabled={readOnly}
                      />
                    </InputAffix>
                  </FormField>
                  <div className="flex items-end gap-2 @md:col-span-3">
                    <FormToggleRow
                      label={part.available !== false ? t('In stock') : t('Out of stock')}
                      htmlFor={`spare-available-${index}`}
                      className="flex-1"
                    >
                      <Switch
                        id={`spare-available-${index}`}
                        checked={part.available !== false}
                        onCheckedChange={(v) => updateSparePart(index, 'available', v)}
                        disabled={readOnly}
                      />
                    </FormToggleRow>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="mb-1 shrink-0 pointer-coarse:size-11" aria-label={t('Delete', { ns: 'common' })} onClick={() => removeSparePart(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </FormGrid>
              </div>
            ))
          )}
        </FormSection>
      )}
      </div>
    </div>
  );
}
