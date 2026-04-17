import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AuthPageShellProps {
  children: React.ReactNode;
  /** Show decorative morphing blobs in background. Default true */
  showDecoration?: boolean;
  /** Subtitle rendered below the logo */
  subtitle?: React.ReactNode;
  /** Logo image URL. Default: /trackbliss-logo.png */
  logoSrc?: string;
  /** Class name for the card container */
  className?: string;
}

/**
 * Shared layout for Login, Register, ResetPassword, AuthCallback pages.
 * - Centered card with logo + subtitle
 * - Mobile-responsive decorative particles (constrained to viewport)
 * - Respects prefers-reduced-motion
 * - Global overflow-clip via body rule prevents edge cases
 */
export function AuthPageShell({
  children,
  showDecoration = true,
  subtitle,
  logoSrc = '/trackbliss-logo.png',
  className,
}: AuthPageShellProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 overflow-hidden relative">
      {showDecoration && !prefersReduced && (
        <>
          {/* Blob 1: top-left — responsive sizing */}
          <div
            className="pointer-events-none absolute top-1/4 -left-8 z-0 h-[18rem] w-[18rem] bg-primary/8 blur-3xl animate-landing-morph sm:-left-24 sm:h-[28rem] sm:w-[28rem]"
            style={{ animationDuration: '8s' }}
            aria-hidden="true"
          />
          {/* Blob 2: bottom-right — smaller on mobile */}
          <div
            className="pointer-events-none absolute -bottom-8 -right-8 z-0 h-[16rem] w-[16rem] bg-blue-400/6 blur-3xl animate-landing-morph sm:-bottom-12 sm:right-[-6rem] sm:h-[24rem] sm:w-[24rem]"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
            aria-hidden="true"
          />
          {/* Blob 3: mid-right — only on tablet+ */}
          <div
            className="pointer-events-none absolute top-[10%] right-[15%] z-0 h-[18rem] w-[18rem] bg-violet-400/5 blur-3xl animate-landing-morph hidden sm:block"
            style={{ animationDuration: '12s', animationDelay: '4s' }}
            aria-hidden="true"
          />
        </>
      )}

      <div className={cn('w-full max-w-md space-y-6 relative z-10', className)}>
        <motion.div
          className="text-center space-y-3"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.4 }}
        >
          <div className="flex items-center justify-center">
            <img
              src={logoSrc}
              alt="Trackbliss"
              className="h-14 sm:h-16 object-contain"
            />
          </div>
          {subtitle && (
            <motion.p
              className="text-muted-foreground text-sm px-2"
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: prefersReduced ? 0 : 0.2, duration: 0.3 }}
            >
              {subtitle}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.4 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
