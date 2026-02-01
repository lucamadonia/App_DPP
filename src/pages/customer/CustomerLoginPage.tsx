import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { customerSendMagicLink } from '@/services/supabase/customer-portal';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';

export function CustomerLoginPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, tenantName, refreshProfile } = useCustomerPortal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');

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

  if (magicLinkSent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">{t('Check your email')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('We sent a login link to {{email}}', { email })}
            </p>
            <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
              {t('Try again')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t('Sign In')}</CardTitle>
          <CardDescription>
            {tenantName
              ? t('Sign in to your {{name}} account', { name: tenantName })
              : t('Sign in to your account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
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
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Wand2 className="h-4 w-4 mr-2" />
                {t('Send Magic Link')}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
              className="text-sm text-primary hover:underline"
            >
              {mode === 'password' ? t('Use Magic Link instead') : t('Use password instead')}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("Don't have an account?")}{' '}
            <Link to={`/customer/${tenantSlug}/register`} className="text-primary hover:underline font-medium">
              {t('Create Account')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
