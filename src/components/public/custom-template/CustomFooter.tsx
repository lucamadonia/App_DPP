/**
 * DPP page footer with 4 style variants.
 */
import type { DPPFooterStyle } from '@/types/database';
import type { ResolvedDPPDesign } from '@/lib/dpp-design-utils';
import { Globe, Instagram, Linkedin, Twitter } from 'lucide-react';

interface Props {
  footerStyle: DPPFooterStyle;
  design: ResolvedDPPDesign;
  poweredByText?: string;
}

export function CustomFooter({ footerStyle, design, poweredByText }: Props) {
  const { footer, colors } = design;
  const hasLinks = footer.legalNoticeUrl || footer.privacyPolicyUrl;
  const hasSocial = footer.socialLinks.website || footer.socialLinks.instagram || footer.socialLinks.linkedin || footer.socialLinks.twitter;

  const socialIcons = hasSocial ? (
    <div className="flex items-center gap-3">
      {footer.socialLinks.website && (
        <a href={footer.socialLinks.website} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
          <Globe className="h-4 w-4" />
        </a>
      )}
      {footer.socialLinks.instagram && (
        <a href={footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
          <Instagram className="h-4 w-4" />
        </a>
      )}
      {footer.socialLinks.linkedin && (
        <a href={footer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
          <Linkedin className="h-4 w-4" />
        </a>
      )}
      {footer.socialLinks.twitter && (
        <a href={footer.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
          <Twitter className="h-4 w-4" />
        </a>
      )}
    </div>
  ) : null;

  const legalLinks = hasLinks ? (
    <div className="flex items-center gap-4 text-xs">
      {footer.legalNoticeUrl && <a href={footer.legalNoticeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Legal Notice</a>}
      {footer.privacyPolicyUrl && <a href={footer.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a>}
    </div>
  ) : null;

  const powered = footer.showPoweredBy && poweredByText ? (
    <p className="text-xs opacity-60">{poweredByText}</p>
  ) : null;

  switch (footerStyle) {
    case 'centered':
      return (
        <footer className="py-6 text-center space-y-3" style={{ color: colors.textColor }}>
          {socialIcons && <div className="flex justify-center">{socialIcons}</div>}
          {legalLinks && <div className="flex justify-center">{legalLinks}</div>}
          {powered}
        </footer>
      );

    case 'two-column':
      return (
        <footer className="py-6 flex items-start justify-between gap-4" style={{ color: colors.textColor }}>
          <div className="space-y-2">
            {legalLinks}
            {powered}
          </div>
          <div>{socialIcons}</div>
        </footer>
      );

    case 'dark-band':
      return (
        <footer
          className="py-6 px-6 -mx-4 mt-6 flex items-center justify-between"
          style={{
            backgroundColor: colors.headingColor,
            color: colors.pageBackground,
          }}
        >
          <div className="space-y-1">
            {legalLinks && <div className="flex items-center gap-4 text-xs opacity-80">{legalLinks}</div>}
            {powered && <p className="text-xs opacity-60">{poweredByText}</p>}
          </div>
          {socialIcons}
        </footer>
      );

    case 'simple':
    default:
      return (
        <footer className="py-4 border-t flex items-center justify-between" style={{ color: colors.textColor }}>
          <div className="flex items-center gap-4">
            {legalLinks}
            {powered}
          </div>
          {socialIcons}
        </footer>
      );
  }
}
