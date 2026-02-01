/**
 * Shared animation utilities for Returns Hub UI.
 * CSS-class-based approach — no runtime dependencies.
 */

/** Stagger delay style for an item at the given index */
export function staggerDelay(index: number, baseMs = 50): React.CSSProperties {
  return { animationDelay: `${index * baseMs}ms`, animationFillMode: 'backwards' };
}

/** Format a relative time string (e.g. "vor 2 Stunden" / "2 hours ago") */
export function relativeTime(dateStr: string, locale: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isDE = locale.startsWith('de');

  if (diffMin < 1) return isDE ? 'gerade eben' : 'just now';
  if (diffMin < 60) return isDE ? `vor ${diffMin} Min.` : `${diffMin}m ago`;
  if (diffHour < 24) return isDE ? `vor ${diffHour} Std.` : `${diffHour}h ago`;
  if (diffDay < 7) return isDE ? `vor ${diffDay} Tag${diffDay > 1 ? 'en' : ''}` : `${diffDay}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

/** Generate sparkline points for an SVG polyline */
export function sparklinePoints(
  data: number[],
  width: number,
  height: number,
  padding = 2
): string {
  if (data.length === 0) return '';
  const max = Math.max(...data, 1);
  const step = (width - padding * 2) / Math.max(data.length - 1, 1);

  return data
    .map((val, i) => {
      const x = padding + i * step;
      const y = height - padding - ((val / max) * (height - padding * 2));
      return `${x},${y}`;
    })
    .join(' ');
}
