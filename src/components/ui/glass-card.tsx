import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  children: React.ReactNode;
  className?: string;
  /** Enable 3D cursor-tracking tilt on hover (default: false) */
  enableTilt?: boolean;
  /** Enable subtle glow pulse on hover (default: false) */
  enableGlow?: boolean;
  /** Glow color override — CSS color string */
  glowColor?: string;
  /** Extra inline style (merged with tilt transforms) */
  style?: React.CSSProperties;
}

export function GlassCard({
  children,
  className,
  enableTilt = false,
  enableGlow = false,
  glowColor = 'rgba(59,130,246,0.15)',
  style: extraStyle,
  ...rest
}: GlassCardProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Motion values for cursor tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Transform cursor position → rotation (±6deg)
  const rawRotateX = useTransform(mouseY, [0, 1], [6, -6]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-6, 6]);

  // Spring smoothing
  const rotateX = useSpring(rawRotateX, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(rawRotateY, { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || prefersReduced || !enableTilt) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  // Reduced motion: render plain div
  if (prefersReduced) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-card text-card-foreground shadow-sm',
          className,
        )}
        style={extraStyle}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        'rounded-xl border text-card-foreground',
        'backdrop-blur-xl bg-[rgba(var(--card-rgb),0.7)]',
        'shadow-[0_0_20px_rgba(59,130,246,0.06),0_8px_32px_rgba(0,0,0,0.06)]',
        'transition-shadow duration-300',
        enableGlow && 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15),0_12px_40px_rgba(0,0,0,0.1)]',
        className,
      )}
      style={{
        ...(enableTilt
          ? { rotateX, rotateY, transformPerspective: 800 }
          : {}),
        ...extraStyle,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={enableTilt ? { scale: 1.01 } : undefined}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
