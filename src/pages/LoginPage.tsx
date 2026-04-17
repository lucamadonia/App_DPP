import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { SupabaseAuth } from '@/components/SupabaseAuth';
import { useAuth } from '@/contexts/AuthContext';
import { spring } from '@/lib/motion';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const prefersReduced = useReducedMotion();

  // Wenn bereits eingeloggt, zum Dashboard weiterleiten
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleAuthSuccess = () => {
    // Nach erfolgreichem Login zum Dashboard navigieren
    navigate('/');
  };

  const handleAuthError = (error: Error) => {
    console.error('Auth error:', error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 overflow-hidden relative">
      {/* Morphing background blobs — responsive sizing prevents mobile overflow */}
      {!prefersReduced && (
        <>
          <div
            className="pointer-events-none absolute top-1/4 -left-8 z-0 h-[18rem] w-[18rem] bg-primary/8 blur-3xl animate-landing-morph sm:-left-24 sm:h-[28rem] sm:w-[28rem]"
            style={{ animationDuration: '8s' }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-8 -right-8 z-0 h-[16rem] w-[16rem] bg-blue-400/6 blur-3xl animate-landing-morph sm:-bottom-12 sm:right-[-6rem] sm:h-[24rem] sm:w-[24rem]"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
            aria-hidden="true"
          />
          {/* Third blob: tablet+ only (too crowded on mobile) */}
          <div
            className="pointer-events-none absolute top-[10%] right-[15%] z-0 h-[18rem] w-[18rem] bg-violet-400/5 blur-3xl animate-landing-morph hidden sm:block"
            style={{ animationDuration: '12s', animationDelay: '4s' }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo - Scale bounce in */}
        <motion.div
          className="text-center space-y-3"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReduced ? { duration: 0 } : spring.bouncy}
        >
          <div className="flex items-center justify-center">
            <img
              src="/trackbliss-logo.png"
              alt="Trackbliss"
              className="h-14 sm:h-16 object-contain"
            />
          </div>
          <motion.p
            className="text-muted-foreground text-sm"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReduced ? 0 : 0.3, duration: 0.3 }}
          >
            {t('Digital Product Passports for sustainable products')}
          </motion.p>
        </motion.div>

        {/* Auth Component - Glass card with animated gradient border */}
        <motion.div
          className={prefersReduced ? '' : 'gradient-border-animated'}
          initial={prefersReduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={prefersReduced ? { duration: 0 } : spring.snappy}
        >
          <SupabaseAuth
            mode="signin"
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        </motion.div>

        {/* Footer - Fade in last */}
        <motion.p
          className="text-center text-xs text-muted-foreground"
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReduced ? 0 : 0.4, duration: 0.3 }}
        >
          {t('By signing in you agree to our')}{' '}
          <a href="/privacy" className="text-primary hover:underline">{t('Terms of Service')}</a>
          {' '}{t('and')}{' '}
          <a href="/privacy" className="text-primary hover:underline">{t('Privacy Policy')}</a>.
        </motion.p>
      </div>
    </div>
  );
}
