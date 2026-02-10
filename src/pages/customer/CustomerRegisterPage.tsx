import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { customerSignUp } from '@/services/supabase/customer-portal';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { MIN_PASSWORD_LENGTH } from '@/lib/security';

export function CustomerRegisterPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, tenantId, tenantName } = useCustomerPortal();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim()) return;

    if (!tenantId) {
      setError(t('Unable to register. Please try again later.'));
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('Password must be at least {{count}} characters', { count: MIN_PASSWORD_LENGTH }));
      return;
    }

    setLoading(true);
    setError('');

    const result = await customerSignUp({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      tenantId,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">{t('Account Created')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('Please check your email to verify your account.')}
            </p>
            <Button onClick={() => navigate(`/customer/${tenantSlug}/login`)}>
              {t('Go to Sign In')}
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
          <CardTitle>{t('Create Account')}</CardTitle>
          <CardDescription>
            {tenantName
              ? t('Create your {{name}} customer account', { name: tenantName })
              : t('Create your customer account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('First Name')} *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('Last Name')}</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Email')} *</Label>
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
              <Label>{t('Password')} *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('Minimum 6 characters')}</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !tenantId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Create Account')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('Already have an account?')}{' '}
            <Link to={`/customer/${tenantSlug}/login`} className="text-primary hover:underline font-medium">
              {t('Sign In')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
