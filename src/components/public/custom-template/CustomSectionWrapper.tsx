/**
 * Section wrapper with accent, animation, and background alternation support.
 */
import type { ReactNode, CSSProperties } from 'react';
import type { DPPCustomSectionStyle, DPPSectionAccent, DPPSectionId } from '@/types/database';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Props {
  id: DPPSectionId;
  header: ReactNode;
  children: ReactNode;
  sectionStyle: DPPCustomSectionStyle;
  cardStyle: CSSProperties;
  compact: boolean;
  showDividers: boolean;
  sectionAccent: DPPSectionAccent;
  accentColor: string;
  alternateBackground: boolean;
  index: number;
  animStyle?: CSSProperties;
  animRef?: (el: HTMLElement | null) => void;
  innerPadding: string;
  watermarkIcon?: ReactNode;
}

function getAccentStyle(accent: DPPSectionAccent, color: string): CSSProperties {
  switch (accent) {
    case 'left-border':
      return { borderLeft: `3px solid ${color}` };
    case 'top-border':
      return { borderTop: `3px solid ${color}` };
    case 'gradient-top':
      return { borderTop: `4px solid transparent`, borderImage: `linear-gradient(90deg, ${color}, transparent) 1` };
    case 'corner-dot':
    case 'icon-watermark':
    case 'none':
    default:
      return {};
  }
}

export function CustomSectionWrapper({
  id,
  header,
  children,
  sectionStyle,
  cardStyle,
  compact,
  showDividers,
  sectionAccent,
  accentColor,
  alternateBackground,
  index,
  animStyle,
  animRef,
  innerPadding,
  watermarkIcon,
}: Props) {
  const padding = innerPadding;
  const accentCSS = getAccentStyle(sectionAccent, accentColor);
  const altBg = alternateBackground && index % 2 === 1 ? { backgroundColor: 'rgba(0,0,0,0.02)' } : {};

  const wrapperStyle: CSSProperties = {
    ...animStyle,
    position: 'relative',
    overflow: 'hidden',
  };

  const cornerDot = sectionAccent === 'corner-dot' ? (
    <div
      className="absolute top-3 right-3 w-2 h-2 rounded-full"
      style={{ backgroundColor: accentColor }}
    />
  ) : null;

  const watermark = sectionAccent === 'icon-watermark' && watermarkIcon ? (
    <div
      className="absolute top-2 right-2 opacity-[0.05] pointer-events-none"
      style={{ fontSize: '64px', color: accentColor }}
    >
      {watermarkIcon}
    </div>
  ) : null;

  switch (sectionStyle) {
    case 'flat':
      return (
        <div
          key={id}
          ref={animRef}
          style={{ ...wrapperStyle, ...altBg, padding, ...accentCSS }}
        >
          {cornerDot}
          {watermark}
          <div className={compact ? 'mb-2' : 'mb-4'}>{header}</div>
          {children}
          {showDividers && <Separator className={compact ? 'mt-3' : 'mt-6'} />}
        </div>
      );

    case 'accordion':
      return (
        <Accordion
          key={id}
          type="single"
          collapsible
          defaultValue={id}
        >
          <AccordionItem
            value={id}
            className="border rounded-lg"
            style={{ ...cardStyle, ...accentCSS, ...altBg, ...wrapperStyle }}
            ref={animRef}
          >
            {cornerDot}
            {watermark}
            <AccordionTrigger className="hover:no-underline" style={{ padding }}>
              {header}
            </AccordionTrigger>
            <AccordionContent style={{ padding }}>
              {children}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );

    case 'card':
    default:
      return (
        <div
          key={id}
          ref={animRef}
          style={{ ...cardStyle, ...accentCSS, ...altBg, ...wrapperStyle, padding, borderRadius: cardStyle.borderRadius }}
          className="rounded-lg"
        >
          {cornerDot}
          {watermark}
          <div className={compact ? 'mb-2' : 'mb-4'}>{header}</div>
          {children}
        </div>
      );
  }
}
