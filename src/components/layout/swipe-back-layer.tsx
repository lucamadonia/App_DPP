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
 * When disabled this renders a plain fragment, so it costs nothing on desktop.
 */
export function SwipeBackLayer({ children }: SwipeBackLayerProps) {
  const isMobile = useIsMobile();
  const budget = useMotionBudget();
  const { canGoBack } = useNavDepth();
  const navigate = useNavigate();

  const enabled = isMobile && canGoBack && budget !== 'reduced';
  const { dragProps, backdropOpacity } = useSwipeBack({
    enabled,
    onCommit: () => navigate(-1),
  });

  if (!enabled) return <>{children}</>;

  return (
    <div className="relative">
      {/* Suggests the page underneath, fading as the current page slides away. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-foreground"
        style={{ opacity: backdropOpacity }}
      />
      <motion.div {...dragProps}>{children}</motion.div>
    </div>
  );
}
