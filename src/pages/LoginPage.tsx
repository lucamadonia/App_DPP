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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 overflow-hidden">
      {/* Animated gradient background orbs */}
      {!prefersReduced && (
        <>
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-landing-gradient-mesh" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-landing-gradient-mesh [animation-delay:3s]" />
        </>
      )}

      <div className="w-full max-w-md space-y-6 relative">
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
              className="h-16 object-contain"
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

        {/* Auth Component - Fade in up with delay */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: prefersReduced ? 0 : 0.2,
            duration: 0.3,
            ease: 'easeOut',
          }}
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
