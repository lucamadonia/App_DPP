/**
 * Section header with configurable icon styles and header styles.
 */
import type { ReactNode, CSSProperties } from 'react';
import type { DPPIconStyle, DPPCustomHeaderStyle } from '@/types/database';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  showDescription?: boolean;
  headerStyle: DPPCustomHeaderStyle;
  iconStyle: DPPIconStyle;
  primaryColor: string;
  headingStyle: CSSProperties;
}

function IconWrapper({ icon, style, color }: { icon: ReactNode; style: DPPIconStyle; color: string }) {
  switch (style) {
    case 'filled-circle':
      return (
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
      );
    case 'gradient-blob':
      return (
        <span
          className="inline-flex items-center justify-center w-8 h-8 text-white flex-shrink-0"
          style={{
            backgroundColor: color,
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          }}
        >
          {icon}
        </span>
      );
    case 'square':
      return (
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
      );
    case 'outlined':
      return (
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0"
          style={{ borderColor: color, color }}
        >
          {icon}
        </span>
      );
    case 'none':
      return null;
    default:
      return <span style={{ color }}>{icon}</span>;
  }
}

export function CustomSectionHeader({
  icon,
  title,
  description,
  showDescription,
  headerStyle,
  iconStyle,
  primaryColor,
  headingStyle,
}: Props) {
  const iconEl = <IconWrapper icon={icon} style={iconStyle} color={primaryColor} />;

  const descEl = showDescription && description ? (
    <p className="text-sm text-muted-foreground mt-1">{description}</p>
  ) : null;

  switch (headerStyle) {
    case 'simple':
      return (
        <div>
          <h2 style={headingStyle} className="text-xl">{title}</h2>
          {descEl}
        </div>
      );
    case 'centered':
      return (
        <div className="text-center">
          {iconStyle !== 'none' && <div className="flex justify-center mb-2">{iconEl}</div>}
          <h2 style={headingStyle} className="text-xl">{title}</h2>
          {descEl}
        </div>
      );
    case 'underlined':
      return (
        <div>
          <h2
            style={{ ...headingStyle, borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.5rem' }}
            className="text-xl flex items-center gap-2"
          >
            {iconEl}
            {title}
          </h2>
          {descEl}
        </div>
      );
    case 'icon-left':
    default:
      return (
        <div>
          <h2 style={headingStyle} className="text-xl flex items-center gap-2">
            {iconEl}
            {title}
          </h2>
          {descEl}
        </div>
      );
  }
}
