import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, Wand2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { customerSendMagicLink } from '@/services/supabase/customer-portal';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';

export function CustomerLoginPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, tenantName, branding, refreshProfile } = useCustomerPortal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const loginStyle = branding.loginStyle || 'centered';
  const primaryColor = branding.primaryColor;
  const logoUrl = branding.logoUrl;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(t('Invalid email or password'));
      setLoading(false);
      return;
    }

    // Small delay for RLS propagation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Refresh profile via context (handles all profile loading logic)
    await refreshProfile();

    setLoading(false);
    navigate(`/customer/${tenantSlug}`);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    const result = await customerSendMagicLink(email.trim(), tenantSlug);
    if (result.error) {
      setError(result.error);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  const welcomeTitle = branding.loginWelcomeTitle || (tenantName
    ? t('Sign in to your {{name}} account', { name: tenantName })
    : t('Sign in to your account'));

  const welcomeSubtitle = branding.loginWelcomeSubtitle || '';

  const magicLinkScreen = (
    <div className="text-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full mx-auto" style={{ backgroundColor: `${primaryColor}15` }}>
        <Mail className="h-7 w-7" style={{ color: primaryColor }} />
      </div>
      <h2 className="text-lg font-semibold">{t('Check your email')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('We sent a login link to {{email}}', { email })}
      </p>
      <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
        {t('Try again')}
      </Button>
    </div>
  );

  const loginForm = (
    <div className="space-y-6">
      {/* Logo + Title */}
      <div className="text-center space-y-3">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="h-12 w-auto mx-auto object-contain" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white mx-auto"
            style={{ backgroundColor: primaryColor }}
          >
            <Package className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{welcomeTitle}</h1>
          {welcomeSubtitle && (
            <p className="text-sm text-muted-foreground mt-1">{welcomeSubtitle}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {mode === 'password' ? (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full font-medium"
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('Sign In')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full font-medium"
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Wand2 className="h-4 w-4 mr-2" />
            {t('Send Magic Link')}
          </Button>
        </form>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          {mode === 'password' ? t('Use Magic Link instead') : t('Use password instead')}
        </button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {t("Don't have an account?")}{' '}
        <Link to={`/customer/${tenantSlug}/register`} className="font-medium hover:underline" style={{ color: primaryColor }}>
          {t('Create Account')}
        </Link>
      </div>
    </div>
  );

  // Split layout
  if (loginStyle === 'split') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex">
        {/* Left panel: background image or gradient */}
        <div
          className="hidden lg:flex w-1/2 relative items-center justify-center"
          style={{
            background: branding.loginBackgroundUrl
              ? `url(${branding.loginBackgroundUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${primaryColor}, ${branding.secondaryColor || primaryColor}dd)`,
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 text-center text-white px-12">
            <h2 className="text-3xl font-bold mb-3">
              {tenantName || t('Customer Portal')}
            </h2>
            {branding.welcomeMessage && (
              <p className="text-lg opacity-90">{branding.welcomeMessage}</p>
            )}
          </div>
        </div>

        {/* Right panel: login form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm animate-fade-in-up">
            {magicLinkSent ? magicLinkScreen : loginForm}
          </div>
        </div>
      </div>
    );
  }

  // Centered layout (default)
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-0 backdrop-blur-sm animate-fade-in-up" style={{ backgroundColor: branding.cardBackground }}>
        <CardContent className="pt-8 pb-8 px-6 sm:px-8">
          {magicLinkSent ? magicLinkScreen : loginForm}
        </CardContent>
      </Card>
    </div>
  );
}
