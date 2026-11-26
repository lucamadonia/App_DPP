import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, InputAffix } from '@/components/ui/form-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { updatePassword } from '@/services/supabase/auth';
import { MIN_PASSWORD_LENGTH } from '@/lib/security';

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('Password must be at least {{count}} characters long.', { count: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match.'));
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await updatePassword(password);

      if (authError) {
        throw new Error(authError.message);
      }

      setSuccess(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo und Titel */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{t('DPP Manager')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('Digital Product Passports for sustainable products')}
          </p>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>{t('Set New Password')}</CardTitle>
            <CardDescription>
              {success
                ? t('Your password has been changed successfully.')
                : t('Enter your new password.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-pretty">{error}</span>
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle className="h-7 w-7 text-success" aria-hidden="true" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('You can now sign in with your new password.')}
                </p>
                <Button asChild className="w-full pointer-coarse:h-11">
                  <Link to="/login">{t('Go to Sign In')}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label={t('New Password')} htmlFor="new-password">
                  <InputAffix prefix={<Lock className="h-4 w-4" />}>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('At least 8 characters')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </InputAffix>
                </FormField>
                <FormField label={t('Confirm Password')} htmlFor="confirm-password">
                  <InputAffix prefix={<Lock className="h-4 w-4" />}>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t('Repeat password')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </InputAffix>
                </FormField>
                <Button type="submit" disabled={loading} className="w-full pointer-coarse:h-11">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Saving...', { ns: 'common' })}
                    </>
                  ) : (
                    t('Save Password')
                  )}
                </Button>
                <Button variant="ghost" asChild className="w-full pointer-coarse:h-11">
                  <Link to="/login">{t('Back to Sign In')}</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
