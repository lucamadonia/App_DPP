import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { useNavDepth } from '@/hooks/use-nav-depth';
import { useSwipeBack } from '@/lib/motion-gestures';

interface SwipeBackLayerProps {
  children: React.ReactNode;
}

/**
 * iOS-style interactive back gesture around the routed content.
 *
 * Active only on touch viewports, only when there is somewhere to go back to,
 * and never under `prefers-reduced-motion`. The gesture is edge-armed — the
 * pointer must start within 24px of the left edge — because a full-width drag
 * would fight the 80+ horizontally scrollable regions in this app. Anything
 * that scrolls sideways can opt out entirely via `data-no-swipe-back`.
 *
 * Keep wrappers mounted when disabled so rotating never resets routed forms.
 */
export function SwipeBackLayer({ children }: SwipeBackLayerProps) {
  const isMobile = useIsMobile();
  const budget = useMotionBudget();
  const { canGoBack, parentPath } = useNavDepth();
  const navigate = useNavigate();

  const enabled = isMobile && canGoBack && budget !== 'reduced';
  const { dragProps, backdropOpacity } = useSwipeBack({
    enabled,
    onCommit: () => {
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate(parentPath ?? '/');
    },
  });

  return (
    <div className="relative min-w-0 max-w-full">
      {/* Suggests the page underneath, fading as the current page slides away. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-foreground"
        style={{ opacity: backdropOpacity }}
      />
      <motion.div {...dragProps} className="app-swipe-content min-w-0 max-w-full">{children}</motion.div>
    </div>
  );
}
