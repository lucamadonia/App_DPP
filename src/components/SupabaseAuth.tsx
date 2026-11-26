import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField, InputAffix } from '@/components/ui/form-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Apple, Loader2, Mail, Lock, User, KeyRound, LogOut, Eye, EyeOff, AlertCircle } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithApple,
  signInWithGoogle,
  sendMagicLink,
  sendPasswordReset,
  verifyOtp,
  signOut,
  type AuthUser,
} from '@/services/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { isIOS } from '@/lib/platform';

/**
 * SupabaseAuth - Authentication Component for Supabase
 *
 * Supports:
 * - Email/Password sign in & sign up
 * - Google OAuth
 * - Sign in with Apple on iOS
 * - Magic Link (OTP)
 */

interface SupabaseAuthProps {
  mode?: 'signin' | 'signup';
  onAuthSuccess?: (data: { user: AuthUser }) => void;
  onAuthError?: (error: Error) => void;
}

export function SupabaseAuth({ mode = 'signin', onAuthSuccess, onAuthError }: SupabaseAuthProps) {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'signin' | 'signup' | 'otp' | 'forgot'>(mode);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const showAppleSignIn = isIOS();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const { user: authUser, error: authError } = await signInWithEmail(email, password);

      if (authError) {
        throw new Error(authError.message);
      }

      if (authUser) {
        onAuthSuccess?.({ user: authUser });
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const { user: authUser, error: authError } = await signUpWithEmail(email, password, name);

      if (authError) {
        throw new Error(authError.message);
      }

      if (authUser) {
        onAuthSuccess?.({ user: authUser });
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error: authError } = await signInWithGoogle();

      if (authError) {
        throw new Error(authError.message);
      }
      // OAuth will redirect, no need to handle success here
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    }
  };

  const handleAppleAuth = async () => {
    try {
      const { error: authError } = await signInWithApple();

      if (authError) {
        throw new Error(authError.message);
      }
      // OAuth returns through the public Universal Link callback.
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    }
  };

  const handleSendOTP = async () => {
    setFormLoading(true);
    setError('');

    try {
      const { error: authError } = await sendMagicLink(email);

      if (authError) {
        throw new Error(authError.message);
      }

      setOtpSent(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setFormLoading(true);
    setError('');

    try {
      const { user: authUser, error: authError } = await verifyOtp(email, otp);

      if (authError) {
        throw new Error(authError.message);
      }

      if (authUser) {
        onAuthSuccess?.({ user: authUser });
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setFormLoading(true);
    setError('');

    try {
      const { error: authError } = await sendPasswordReset(email);

      if (authError) {
        throw new Error(authError.message);
      }

      setResetSent(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // User is logged in - show profile
  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
              {user.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
          <CardTitle>{user.name || 'User'}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="outline" className="w-full pointer-coarse:h-11">
            <LogOut className="mr-2 h-4 w-4" />
            {t('Sign Out', { ns: 'common' })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Auth forms
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          {currentView === 'signin' ? t('Sign In') : currentView === 'signup' ? t('Create Account') : currentView === 'forgot' ? t('Forgot Password') : t('Sign In with OTP')}
        </CardTitle>
        <CardDescription>
          {currentView === 'signin'
            ? t('Sign in to your DPP Manager account')
            : currentView === 'signup'
              ? t('Create a new account')
              : currentView === 'forgot'
                ? t('Reset your password')
                : t('Receive a one-time code via email')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 text-pretty">{error}</span>
          </div>
        )}

        {/* Forgot Password Flow */}
        {currentView === 'forgot' ? (
          <div className="space-y-4">
            {!resetSent ? (
              <>
                <FormField label={t('E-Mail')} htmlFor="reset-email">
                  <InputAffix prefix={<Mail className="h-4 w-4" />}>
                    <Input
                      id="reset-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </InputAffix>
                </FormField>
                <Button onClick={handleSendPasswordReset} disabled={formLoading} className="w-full pointer-coarse:h-11">
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Sending...')}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {t('Send Reset Link')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('A password reset email has been sent to <strong>{{email}}</strong>. Please check your inbox.', { email })) }} />
            )}
            <Button
              variant="ghost"
              onClick={() => { setResetSent(false); setCurrentView('signin'); }}
              className="w-full pointer-coarse:h-11"
            >
              {t('Back to Sign In')}
            </Button>
          </div>
        ) : /* OTP Flow - Exclusive View */
        currentView === 'otp' ? (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <FormField label={t('E-Mail')} htmlFor="otp-email">
                  <InputAffix prefix={<Mail className="h-4 w-4" />}>
                    <Input
                      id="otp-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </InputAffix>
                </FormField>
                <Button onClick={handleSendOTP} disabled={formLoading} className="w-full pointer-coarse:h-11">
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Sending...')}
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      {t('Send Magic Link')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  {t('Link sent to {{email}}. Click the link in the email or enter the code.', { email })}
                </p>
                <FormField label={t('6-digit Code')} htmlFor="otp-code">
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-12 text-center text-xl font-mono tabular-nums tracking-widest"
                    maxLength={6}
                  />
                </FormField>
                <Button onClick={handleVerifyOTP} disabled={formLoading} className="w-full pointer-coarse:h-11">
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('Verifying...')}
                    </>
                  ) : (
                    t('Verify & Sign In')
                  )}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => { setOtpSent(false); setCurrentView('signin'); }}
              className="w-full pointer-coarse:h-11"
            >
              {t('Back to Sign In')}
            </Button>
          </div>
        ) : (
          /* Standard Sign In/Up View */
          <>
            {/* Social providers */}
            {showAppleSignIn && (
              <Button
                onClick={handleAppleAuth}
                className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                <Apple className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('Continue with Apple')}
              </Button>
            )}

            <Button variant="outline" onClick={handleGoogleAuth} className="w-full pointer-coarse:h-11">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('Continue with Google')}
            </Button>

            <Button variant="outline" onClick={() => setCurrentView('otp')} className="w-full pointer-coarse:h-11">
              <KeyRound className="mr-2 h-4 w-4" />
              {t('Sign in with Magic Link')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('or', { ns: 'common' })}</span>
              </div>
            </div>

            {/* Email/Password Forms */}
            <form onSubmit={currentView === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
              {currentView === 'signup' && (
                <FormField label={t('Name', { ns: 'common' })} htmlFor="name">
                  <InputAffix prefix={<User className="h-4 w-4" />}>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder={t('Your Name')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </InputAffix>
                </FormField>
              )}
              <FormField label={t('E-Mail')} htmlFor="email">
                <InputAffix prefix={<Mail className="h-4 w-4" />}>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete={currentView === 'signin' ? 'username' : 'email'}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputAffix>
              </FormField>
              <div className="space-y-2">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="password">{t('Password')}</Label>
                  {currentView === 'signin' && (
                    <Button
                      type="button"
                      variant="link"
                      className="inline-flex min-h-11 -my-3 items-center px-1 h-auto text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setCurrentView('forgot')}
                    >
                      {t('Forgot password?')}
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={currentView === 'signin' ? 'current-password' : 'new-password'}
                    className="pl-9 pr-12 pointer-coarse:h-11"
                    required
                  />
                  {/* A raw <button>, so the coarse-pointer rule in index.css that sizes
                      [data-slot="button"] to 44px does not reach it — the hit area would
                      otherwise be just the 16px icon. Sized explicitly instead, with the
                      input's right padding widened to match so text never runs underneath. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={formLoading} className="w-full pointer-coarse:h-11">
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Loading...', { ns: 'common' })}
                  </>
                ) : (
                  currentView === 'signin' ? t('Sign In') : t('Sign Up')
                )}
              </Button>
            </form>

            {/* Toggle between sign in/up */}
            <p className="text-center text-sm text-muted-foreground">
              {currentView === 'signin' ? t("Don't have an account?") : t("Already have an account?")}{' '}
              <Button
                variant="link"
                className="inline-flex min-h-11 items-center px-1 h-auto text-primary"
                onClick={() => setCurrentView(currentView === 'signin' ? 'signup' : 'signin')}
              >
                {currentView === 'signin' ? t('Sign Up') : t('Sign In')}
              </Button>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
