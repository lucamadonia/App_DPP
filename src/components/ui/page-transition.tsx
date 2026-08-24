import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMotionBudget } from '@/hooks/use-motion-budget';
import { useNavDepth } from '@/hooks/use-nav-depth';
import {
  pageVariants,
  routeVariants,
  routeVariantsReduced,
  routeTransition,
  spring,
} from '@/lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Route transition.
 *
 * Mobile gets a directional stack: pushing deeper slides in from the right
 * while the outgoing page parallaxes away, going back mirrors it, and a lateral
 * tab change crossfades. That directionality is most of what separates "native
 * app" from "website in a WebView".
 *
 * Desktop keeps the existing blur-in, which suits a mouse-driven layout and
 * costs nothing there.
 *
 * `reduced` collapses everything to opacity. `minimal` keeps the direction but
 * swaps springs for a short tween.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const budget = useMotionBudget();
  const isMobile = useIsMobile();
  const { direction } = useNavDepth();

  if (budget === 'reduced') {
    return (
      <motion.div
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={routeVariantsReduced}
        transition={routeTransition('reduced')}
      >
        {children}
      </motion.div>
    );
  }

  if (!isMobile) {
    return (
      <motion.div
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={spring.gentle}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      custom={direction}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={routeVariants}
      transition={routeTransition(budget)}
    >
      {children}
    </motion.div>
  );
}
