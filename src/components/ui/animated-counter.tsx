import { useEffect, useRef } from 'react';
import {
  useSpring,
  useTransform,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  /** Target numeric value */
  value: number;
  /** Decimal places (default: 0) */
  decimals?: number;
  /** Prefix string, e.g. "$" or "€" */
  prefix?: string;
  /** Suffix string, e.g. "%" or " items" */
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const prefersReduced = useReducedMotion();
  const prevValue = useRef(value);

  const springVal = useSpring(prefersReduced ? value : 0, {
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  });

  const display = useTransform(springVal, (v) => {
    const formatted = decimals > 0
      ? v.toFixed(decimals)
      : Math.round(v).toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    springVal.set(value);
    prevValue.current = value;
  }, [value, springVal]);

  if (prefersReduced) {
    const formatted = decimals > 0
      ? value.toFixed(decimals)
      : value.toLocaleString();
    return (
      <span className={cn('tabular-nums', className)}>
        {prefix}{formatted}{suffix}
      </span>
    );
  }

  return (
    <motion.span className={cn('tabular-nums', className)}>
      {display}
    </motion.span>
  );
}
