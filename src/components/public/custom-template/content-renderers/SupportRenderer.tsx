/**
 * Support section with 3 display modes: stacked, tabbed, accordion.
 */
import { useState } from 'react';
import { BookOpen, Video, MessageSquare, ShieldCheck, Wrench, Package, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SafeHtml } from '@/components/ui/safe-html';
import type { Product } from '@/types/product';
import type { DPPSupportDisplayMode } from '@/types/database';

interface Props {
  product: Product;
  displayMode: DPPSupportDisplayMode;
  isFieldVisible: (field: string) => boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  onContactSupport?: () => void;
  ticketCreationEnabled?: boolean;
}

interface SupportSection {
  id: string;
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
}

function useSupportSections({ product, isFieldVisible, t, onContactSupport, ticketCreationEnabled }: Omit<Props, 'displayMode'>): SupportSection[] {
  const sr = product.supportResources;
  if (!sr) return [];

  const sections: SupportSection[] = [];

  if (sr.instructions || sr.assemblyGuide) {
    sections.push({
      id: 'instructions',
      icon: <BookOpen className="h-4 w-4" />,
      label: t('Usage Instructions'),
      content: (
        <div className="space-y-3">
          {sr.instructions && <SafeHtml html={sr.instructions} className="text-sm text-muted-foreground" />}
          {sr.assemblyGuide && (
            <div>
              <p className="font-medium text-sm mb-1">{t('Assembly Guide')}</p>
              <SafeHtml html={sr.assemblyGuide} className="text-sm text-muted-foreground" />
            </div>
          )}
        </div>
      ),
    });
  }

  if (isFieldVisible('supportVideos') && sr.videos && sr.videos.length > 0) {
    sections.push({
      id: 'videos',
      icon: <Video className="h-4 w-4" />,
      label: t('Videos'),
      content: (
        <div className="space-y-2">
          {sr.videos.map((v, i) => (
            <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium text-primary">
              <Video className="h-4 w-4 flex-shrink-0" />{v.title}
            </a>
          ))}
        </div>
      ),
    });
  }

  if (isFieldVisible('supportFaq') && sr.faq && sr.faq.length > 0) {
    sections.push({
      id: 'faq',
      icon: <MessageSquare className="h-4 w-4" />,
      label: t('FAQ'),
      content: (
        <div className="space-y-3">
          {sr.faq.map((item, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <p className="font-medium text-sm">{item.question}</p>
              <SafeHtml html={item.answer} className="text-sm text-muted-foreground mt-1" />
            </div>
          ))}
        </div>
      ),
    });
  }

  if (isFieldVisible('supportWarranty') && sr.warranty) {
    sections.push({
      id: 'warranty',
      icon: <ShieldCheck className="h-4 w-4" />,
      label: t('Warranty'),
      content: (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {sr.warranty.durationMonths != null && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('Warranty Duration')}</span>
                <span className="font-medium">{t('{{months}} months', { months: sr.warranty.durationMonths })}</span>
              </div>
            )}
            {sr.warranty.contactEmail && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('Contact Email')}</span>
                <span className="font-medium">{sr.warranty.contactEmail}</span>
              </div>
            )}
          </div>
          {sr.warranty.terms && (
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('Warranty Terms')}</p>
              <SafeHtml html={sr.warranty.terms} className="text-sm" />
            </div>
          )}
        </div>
      ),
    });
  }

  if (isFieldVisible('supportRepair') && sr.repairInfo) {
    sections.push({
      id: 'repair',
      icon: <Wrench className="h-4 w-4" />,
      label: t('Repair Information'),
      content: (
        <div className="space-y-2">
          {sr.repairInfo.repairGuide && <SafeHtml html={sr.repairInfo.repairGuide} className="text-sm text-muted-foreground" />}
          {sr.repairInfo.repairabilityScore != null && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('Repairability Score')}</span>
              <span className="font-bold">{sr.repairInfo.repairabilityScore}/10</span>
            </div>
          )}
          {sr.repairInfo.serviceCenters && sr.repairInfo.serviceCenters.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">{t('Service Centers')}</p>
              {sr.repairInfo.serviceCenters.map((c, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c}</p>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  if (isFieldVisible('supportSpareParts') && sr.spareParts && sr.spareParts.length > 0) {
    sections.push({
      id: 'spare-parts',
      icon: <Package className="h-4 w-4" />,
      label: t('Spare Parts'),
      content: (
        <div className="space-y-2">
          {sr.spareParts.map((part, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{part.name}</p>
                {part.partNumber && <p className="text-xs text-muted-foreground">{t('Part Number')}: {part.partNumber}</p>}
              </div>
              <div className="text-right">
                {part.price != null && <p className="font-medium text-sm">{part.price} {part.currency || '€'}</p>}
                <p className={`text-xs ${part.available !== false ? 'text-green-600' : 'text-red-500'}`}>
                  {part.available !== false ? t('Available') : t('Out of stock')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (ticketCreationEnabled && onContactSupport) {
    sections.push({
      id: 'contact',
      icon: <MessageSquare className="h-4 w-4" />,
      label: t('Contact Support'),
      content: (
        <Button onClick={onContactSupport} className="w-full" variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          {t('Contact Support')}
        </Button>
      ),
    });
  }

  return sections;
}

function StackedMode({ sections }: { sections: SupportSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.id}>
          <h4 className="font-medium mb-2 flex items-center gap-2">{s.icon}{s.label}</h4>
          {s.content}
        </div>
      ))}
    </div>
  );
}

function TabbedMode({ sections }: { sections: SupportSection[] }) {
  const [activeTab, setActiveTab] = useState(sections[0]?.id || '');
  const activeSection = sections.find(s => s.id === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === s.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">{s.icon}{s.label}</span>
          </button>
        ))}
      </div>
      {activeSection && <div>{activeSection.content}</div>}
    </div>
  );
}

function AccordionMode({ sections }: { sections: SupportSection[] }) {
  return (
    <Accordion type="multiple" defaultValue={[sections[0]?.id || '']}>
      {sections.map((s) => (
        <AccordionItem key={s.id} value={s.id}>
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">{s.icon}{s.label}</span>
          </AccordionTrigger>
          <AccordionContent>{s.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function SupportRenderer({ product, displayMode, isFieldVisible, t, onContactSupport, ticketCreationEnabled }: Props) {
  const sections = useSupportSections({ product, isFieldVisible, t, onContactSupport, ticketCreationEnabled });
  if (sections.length === 0) return null;

  switch (displayMode) {
    case 'tabbed':
      return <TabbedMode sections={sections} />;
    case 'accordion':
      return <AccordionMode sections={sections} />;
    case 'stacked':
    default:
      return <StackedMode sections={sections} />;
  }
}
