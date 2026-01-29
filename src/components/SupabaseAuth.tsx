import { useState } from 'react';
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
          <CardTitle>{user.name || 'Benutzer'}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
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
          {currentView === 'signin' ? 'Anmelden' : currentView === 'signup' ? 'Konto erstellen' : currentView === 'forgot' ? 'Passwort vergessen' : 'Mit OTP anmelden'}
        </CardTitle>
        <CardDescription>
          {currentView === 'signin'
            ? 'Melden Sie sich bei Ihrem DPP Manager-Konto an'
            : currentView === 'signup'
              ? 'Erstellen Sie ein neues Konto'
              : currentView === 'forgot'
                ? 'Setzen Sie Ihr Passwort zurück'
                : 'Erhalten Sie einen Einmalcode per E-Mail'}
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
                  <Label htmlFor="reset-email">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="ihre@email.de"
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
                      Sende...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Link zum Zurücksetzen senden
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Eine E-Mail zum Zurücksetzen des Passworts wurde an <strong>{email}</strong> gesendet. Bitte prüfen Sie Ihren Posteingang.
              </p>
            )}
            <Button
              variant="ghost"
              onClick={() => { setResetSent(false); setCurrentView('signin'); }}
              className="w-full"
            >
              Zurück zur Anmeldung
            </Button>
          </div>
        ) : /* OTP Flow - Exclusive View */
        currentView === 'otp' ? (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp-email">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="ihre@email.de"
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
                      Sende...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Magic Link senden
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Link gesendet an {email}. Klicken Sie auf den Link in der E-Mail oder geben Sie den Code ein.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="otp-code">6-stelliger Code</Label>
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
                      Verifiziere...
                    </>
                  ) : (
                    'Verifizieren & Anmelden'
                  )}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => { setOtpSent(false); setCurrentView('signin'); }}
              className="w-full"
            >
              Zuruck zur Anmeldung
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
              Mit Google fortfahren
            </Button>

            <Button variant="outline" onClick={() => setCurrentView('otp')} className="w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              Mit Magic Link anmelden
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">oder</span>
              </div>
            </div>

            {/* Email/Password Forms */}
            <form onSubmit={currentView === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4">
              {currentView === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Ihr Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
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
                      Passwort vergessen?
                    </Button>
                  </div>
                )}
              </div>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Laden...
                  </>
                ) : (
                  currentView === 'signin' ? 'Anmelden' : 'Registrieren'
                )}
              </Button>
            </form>

            {/* Toggle between sign in/up */}
            <p className="text-center text-sm text-muted-foreground">
              {currentView === 'signin' ? 'Noch kein Konto? ' : 'Bereits ein Konto? '}
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={() => setCurrentView(currentView === 'signin' ? 'signup' : 'signin')}
              >
                {currentView === 'signin' ? 'Registrieren' : 'Anmelden'}
              </Button>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
