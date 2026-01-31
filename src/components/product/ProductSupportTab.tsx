import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SupportResources, VideoLink, FAQItem, SparePart } from '@/types/database';

interface Props {
  supportResources: SupportResources;
  onChange: (resources: SupportResources) => void;
  readOnly?: boolean;
}

export function ProductSupportTab({ supportResources, onChange, readOnly }: Props) {
  const { t } = useTranslation('products');
  const [activeSection, setActiveSection] = useState<string>('instructions');

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

  return (
    <div className="space-y-6">
      {/* Section navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => (
          <Badge
            key={section.id}
            variant={activeSection === section.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveSection(section.id)}
          >
            <section.icon className="mr-1 h-3 w-3" />
            {section.label}
          </Badge>
        ))}
      </div>

      {/* Instructions */}
      {activeSection === 'instructions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('Customer Instructions')}
            </CardTitle>
            <CardDescription>{t('Usage instructions and assembly guides')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Usage Instructions')}</label>
              <textarea
                className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('Enter usage instructions (Markdown supported)...')}
                value={supportResources.instructions || ''}
                onChange={(e) => update('instructions', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Assembly Guide')}</label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('Enter assembly/installation guide...')}
                value={supportResources.assemblyGuide || ''}
                onChange={(e) => update('assemblyGuide', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {activeSection === 'videos' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  {t('Video Links')}
                </CardTitle>
                <CardDescription>{t('Tutorial and product videos')}</CardDescription>
              </div>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addVideo}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Add Video')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {videos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('No videos added yet')}
              </p>
            ) : (
              videos.map((video: VideoLink, index: number) => (
                <div key={index} className="grid gap-3 grid-cols-1 sm:grid-cols-4 p-4 border rounded-lg">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Title')}</label>
                    <Input
                      value={video.title}
                      onChange={(e) => updateVideo(index, 'title', e.target.value)}
                      placeholder={t('Video title')}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium">{t('URL')}</label>
                    <Input
                      value={video.url}
                      onChange={(e) => updateVideo(index, 'url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      disabled={readOnly}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium">{t('Type')}</label>
                      <Select
                        value={video.type}
                        onValueChange={(v) => updateVideo(index, 'type', v)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                          <SelectItem value="direct">{t('Direct Link')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" onClick={() => removeVideo(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {video.url && (
                    <div className="sm:col-span-4">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('Open video')}
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      {activeSection === 'faq' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {t('Frequently Asked Questions')}
                </CardTitle>
              </div>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addFAQ}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Add Question')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {faq.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('No FAQ entries yet')}
              </p>
            ) : (
              faq.map((item: FAQItem, index: number) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium">{t('Question')}</label>
                      <Input
                        value={item.question}
                        onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                        placeholder={t('Enter question...')}
                        disabled={readOnly}
                      />
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeFAQ(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Answer')}</label>
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={item.answer}
                      onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                      placeholder={t('Enter answer...')}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Warranty */}
      {activeSection === 'warranty' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('Warranty Information')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Warranty Duration (Months)')}</label>
                <Input
                  type="number"
                  min="0"
                  value={supportResources.warranty?.durationMonths || ''}
                  onChange={(e) => update('warranty', {
                    ...supportResources.warranty,
                    durationMonths: parseInt(e.target.value) || undefined,
                  })}
                  placeholder="e.g. 24"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Contact Email')}</label>
                <Input
                  type="email"
                  value={supportResources.warranty?.contactEmail || ''}
                  onChange={(e) => update('warranty', {
                    ...supportResources.warranty,
                    contactEmail: e.target.value,
                  })}
                  placeholder="warranty@example.com"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Contact Phone')}</label>
                <Input
                  value={supportResources.warranty?.contactPhone || ''}
                  onChange={(e) => update('warranty', {
                    ...supportResources.warranty,
                    contactPhone: e.target.value,
                  })}
                  placeholder="+49 123 456789"
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('Warranty Terms')}</label>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={supportResources.warranty?.terms || ''}
                  onChange={(e) => update('warranty', {
                    ...supportResources.warranty,
                    terms: e.target.value,
                  })}
                  placeholder={t('Enter warranty terms and conditions...')}
                  disabled={readOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repair */}
      {activeSection === 'repair' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {t('Repair Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Repair Guide')}</label>
              <textarea
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={supportResources.repairInfo?.repairGuide || ''}
                onChange={(e) => update('repairInfo', {
                  ...supportResources.repairInfo,
                  repairGuide: e.target.value,
                })}
                placeholder={t('Enter repair instructions...')}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Repairability Score')} (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={supportResources.repairInfo?.repairabilityScore || ''}
                onChange={(e) => update('repairInfo', {
                  ...supportResources.repairInfo,
                  repairabilityScore: parseInt(e.target.value) || undefined,
                })}
                placeholder="e.g. 7"
                disabled={readOnly}
              />
              {supportResources.repairInfo?.repairabilityScore && (
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(supportResources.repairInfo.repairabilityScore / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {supportResources.repairInfo.repairabilityScore}/10
                  </span>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('Authorized Service Centers')}</label>
              <p className="text-xs text-muted-foreground">{t('One per line')}</p>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={(supportResources.repairInfo?.serviceCenters || []).join('\n')}
                onChange={(e) => update('repairInfo', {
                  ...supportResources.repairInfo,
                  serviceCenters: e.target.value.split('\n').filter(Boolean),
                })}
                placeholder={t('Service Center Name, City')}
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spare Parts */}
      {activeSection === 'spareParts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {t('Spare Parts')}
                </CardTitle>
                <CardDescription>{t('Available replacement parts')}</CardDescription>
              </div>
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={addSparePart}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Add Part')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {spareParts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('No spare parts listed')}
              </p>
            ) : (
              spareParts.map((part: SparePart, index: number) => (
                <div key={index} className="grid gap-3 grid-cols-2 sm:grid-cols-5 p-4 border rounded-lg">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Part Name')}</label>
                    <Input
                      value={part.name}
                      onChange={(e) => updateSparePart(index, 'name', e.target.value)}
                      placeholder={t('e.g. Battery')}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Part Number')}</label>
                    <Input
                      value={part.partNumber || ''}
                      onChange={(e) => updateSparePart(index, 'partNumber', e.target.value)}
                      placeholder="e.g. BAT-001"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Price')}</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={part.price || ''}
                      onChange={(e) => updateSparePart(index, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Available')}</label>
                    <div className="flex items-center h-9 gap-2">
                      <input
                        type="checkbox"
                        checked={part.available !== false}
                        onChange={(e) => updateSparePart(index, 'available', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                        disabled={readOnly}
                      />
                      <span className="text-sm">{part.available !== false ? t('In stock') : t('Out of stock')}</span>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-end">
                      <Button variant="ghost" size="icon" onClick={() => removeSparePart(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
