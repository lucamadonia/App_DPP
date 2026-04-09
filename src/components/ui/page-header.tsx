import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { blurIn } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, badge, className }: PageHeaderProps) {
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'div' : motion.div;
  const wrapperProps = prefersReduced ? {} : { variants: blurIn, initial: 'initial', animate: 'animate' };

  return (
    <Wrapper
      {...wrapperProps}
      className={cn('flex items-center justify-between', className)}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          {description && <p className="text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </Wrapper>
  );
}
