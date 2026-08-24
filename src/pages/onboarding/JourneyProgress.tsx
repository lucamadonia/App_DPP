import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { MotionBudget } from '@/hooks/use-motion-budget';

interface SegmentProps {
  i: number;
  active: boolean;
  x: MotionValue<number>;
  width: number;
  live: boolean;
}

function Segment({ i, active, x, width, live }: SegmentProps) {
  // Fill tracks the same MotionValue the track does, so it follows the finger
  // mid-drag. That is the detail that separates "native" from "scripted".
  const fill = useTransform(x, (v) => {
    const d = Math.abs(v + i * width) / (width || 1);
    return Math.max(0, Math.min(1, 1 - d));
  });

  return (
    <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
      {live ? (
        <motion.span
          className="block h-full w-full origin-left rounded-full bg-white"
          style={{ scaleX: fill }}
        />
      ) : (
        <span
          className="block h-full w-full origin-left rounded-full bg-white transition-transform"
          style={{ transform: `scaleX(${active ? 1 : 0})` }}
        />
      )}
    </span>
  );
}

export interface JourneyProgressProps {
  count: number;
  index: number;
  x: MotionValue<number>;
  width: number;
  budget: MotionBudget;
  onSelect: (i: number) => void;
  label: (n: number) => string;
}

/**
 * Segmented progress rather than dots.
 *
 * Seven dots at the bottom of a photograph read as weak decoration; segments
 * read as a story and say "eight steps, you are on three" without a caption.
 */
export function JourneyProgress({
  count,
  index,
  x,
  width,
  budget,
  onSelect,
  label,
}: JourneyProgressProps) {
  const live = budget === 'full' && width > 0;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={label(i + 1)}
          aria-current={i === index ? 'step' : undefined}
          // The hit area is 44px tall via padding while the bar itself stays
          // 1px, so this satisfies the coarse-pointer floor without a fat bar.
          className="flex flex-1 items-center py-5"
        >
          <Segment i={i} active={i <= index} x={x} width={width} live={live} />
        </button>
      ))}
    </div>
  );
}
