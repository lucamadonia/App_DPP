import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, User, KeyRound, LogOut } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendMagicLink,
  sendPasswordReset,
  verifyOtp,
  signOut,
  type AuthUser,
} from '@/services/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';

/**
 * SupabaseAuth - Authentication Component for Supabase
 *
 * Supports:
 * - Email/Password sign in & sign up
 * - Google OAuth
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
          <Button onClick={handleSignOut} variant="outline" className="w-full">
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
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Forgot Password Flow */}
        {currentView === 'forgot' ? (
          <div className="space-y-4">
            {!resetSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t('E-Mail')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button onClick={handleSendPasswordReset} disabled={formLoading} className="w-full">
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
              <p className="text-sm text-muted-foreground text-center" dangerouslySetInnerHTML={{ __html: t('A password reset email has been sent to <strong>{{email}}</strong>. Please check your inbox.', { email }) }} />
            )}
            <Button
              variant="ghost"
              onClick={() => { setResetSent(false); setCurrentView('signin'); }}
              className="w-full"
            >
              {t('Back to Sign In')}
            </Button>
          </div>
        ) : /* OTP Flow - Exclusive View */
        currentView === 'otp' ? (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp-email">{t('E-Mail')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button onClick={handleSendOTP} disabled={formLoading} className="w-full">
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
                <div className="space-y-2">
                  <Label htmlFor="otp-code">{t('6-digit Code')}</Label>
                  <Input
                    id="otp-code"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center text-xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                <Button onClick={handleVerifyOTP} disabled={formLoading} className="w-full">
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
              className="w-full"
            >
              {t('Back to Sign In')}
            </Button>
          </div>
        ) : (
          /* Standard Sign In/Up View */
          <>
            {/* Social providers */}
            <Button variant="outline" onClick={handleGoogleAuth} className="w-full">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('Continue with Google')}
            </Button>

            <Button variant="outline" onClick={() => setCurrentView('otp')} className="w-full">
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
                <div className="space-y-2">
                  <Label htmlFor="name">{t('Name', { ns: 'common' })}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('Your Name')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('E-Mail')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('Password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                {currentView === 'signin' && (
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setCurrentView('forgot')}
                    >
                      {t('Forgot password?')}
                    </Button>
                  </div>
                )}
              </div>
              <Button type="submit" disabled={formLoading} className="w-full">
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
                className="p-0 h-auto text-primary"
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
