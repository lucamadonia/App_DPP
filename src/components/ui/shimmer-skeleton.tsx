import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ShimmerSkeletonProps {
  className?: string;
}

export function ShimmerSkeleton({ className }: ShimmerSkeletonProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <Skeleton className={className} />;
  }

  return (
    <motion.div
      className={cn(
        'rounded-md',
        'bg-gradient-to-r from-muted via-muted-foreground/[0.08] to-muted',
        'bg-[length:400%_100%]',
        className,
      )}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}
