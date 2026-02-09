/**
 * Certifications section with 4 display modes: list, grid-cards, badge-row, timeline.
 */
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Certification } from '@/types/product';
import type { DPPCertificationsDisplayMode } from '@/types/database';

interface Props {
  certifications: Certification[];
  displayMode: DPPCertificationsDisplayMode;
  primaryColor: string;
  locale: string;
  t: (key: string) => string;
}

function ListMode({ certifications, locale, t }: { certifications: Certification[]; locale: string; t: Props['t'] }) {
  return (
    <div className="space-y-3">
      {certifications.map((cert, index) => (
        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-semibold">{cert.name}</p>
            <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="text-xs mb-1">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {t('Valid')}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {t('Valid until')}: {formatDate(cert.validUntil, locale)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GridCardsMode({ certifications, primaryColor, locale, t }: { certifications: Certification[]; primaryColor: string; locale: string; t: Props['t'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {certifications.map((cert, index) => (
        <div key={index} className="p-4 border rounded-lg text-center space-y-2">
          <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <ShieldCheck className="h-5 w-5" style={{ color: primaryColor }} />
          </div>
          <p className="font-semibold text-sm">{cert.name}</p>
          <p className="text-xs text-muted-foreground">{cert.issuedBy}</p>
          <Badge variant="secondary" className="text-xs">
            {t('Valid until')}: {formatDate(cert.validUntil, locale)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function BadgeRowMode({ certifications, primaryColor }: { certifications: Certification[]; primaryColor: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {certifications.map((cert, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border"
          style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}08` }}
        >
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: primaryColor }} />
          {cert.name}
        </div>
      ))}
    </div>
  );
}

function TimelineMode({ certifications, primaryColor, locale, t }: { certifications: Certification[]; primaryColor: string; locale: string; t: Props['t'] }) {
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2 top-2 bottom-2 w-0.5" style={{ backgroundColor: `${primaryColor}30` }} />
      {certifications.map((cert, index) => (
        <div key={index} className="relative">
          <div
            className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2"
            style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}40` }}
          />
          <div className="ml-2">
            <p className="font-semibold">{cert.name}</p>
            <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Valid until')}: {formatDate(cert.validUntil, locale)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CertificationsRenderer({ certifications, displayMode, primaryColor, locale, t }: Props) {
  switch (displayMode) {
    case 'grid-cards':
      return <GridCardsMode certifications={certifications} primaryColor={primaryColor} locale={locale} t={t} />;
    case 'badge-row':
      return <BadgeRowMode certifications={certifications} primaryColor={primaryColor} />;
    case 'timeline':
      return <TimelineMode certifications={certifications} primaryColor={primaryColor} locale={locale} t={t} />;
    case 'list':
    default:
      return <ListMode certifications={certifications} locale={locale} t={t} />;
  }
}
