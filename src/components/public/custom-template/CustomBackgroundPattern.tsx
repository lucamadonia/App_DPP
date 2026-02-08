/**
 * SVG background pattern overlays for the Custom DPP template.
 */
import type { DPPBackgroundPattern } from '@/types/database';

interface Props {
  pattern: DPPBackgroundPattern;
}

export function CustomBackgroundPattern({ pattern }: Props) {
  if (pattern === 'none') return null;

  switch (pattern) {
    case 'dots':
      return (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      );
    case 'grid':
      return (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      );
    case 'diagonal-lines':
      return (
        <svg className="pointer-events-none absolute inset-0 z-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="diag" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diag)" />
        </svg>
      );
    case 'subtle-noise':
      return (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      );
    default:
      return null;
  }
}
