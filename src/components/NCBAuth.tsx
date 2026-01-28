import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, User, KeyRound, LogOut } from 'lucide-react';

/**
 * NCBAuth - NoCodeBackend Authentication Component
 *
 * Handles:
 * - Fetching enabled auth providers
 * - Sign in / Sign up flows
 * - Session management
 * - Provider-specific UI (Email, OTP, Google)
 */

const NCB_CONFIG = {
  instance: '48395_mfg_ddp',
  baseUrl: 'https://app.nocodebackend.com/api/user-auth',
  secretKey: import.meta.env.VITE_NCB_SECRET_KEY || '',
};

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthSession {
  user: AuthUser;
}

interface Providers {
  email?: boolean;
  google?: boolean;
  emailOTP?: boolean;
}

interface NCBAuthProps {
  mode?: 'signin' | 'signup';
  onAuthSuccess?: (data: { user: AuthUser }) => void;
  onAuthError?: (error: Error) => void;
}

export function NCBAuth({ mode = 'signin', onAuthSuccess, onAuthError }: NCBAuthProps) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [currentView, setCurrentView] = useState<'signin' | 'signup' | 'otp'>(mode);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch enabled providers on mount
  useEffect(() => {
    fetch(`${NCB_CONFIG.baseUrl.replace('/api/user-auth', '')}/api/user-auth/providers?instance=${NCB_CONFIG.instance}&t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers || {});
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch providers:', err);
        setLoading(false);
      });
  }, []);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${NCB_CONFIG.baseUrl}/get-session`, {
          headers: {
            'X-Database-Instance': NCB_CONFIG.instance,
            'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
          },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setSession(data);
            onAuthSuccess?.(data);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkSession();
  }, [onAuthSuccess]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    try {
      const res = await fetch(`${NCB_CONFIG.baseUrl}/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sign in failed');
      setSession({ user: data.user });
      onAuthSuccess?.(data);
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
      const res = await fetch(`${NCB_CONFIG.baseUrl}/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sign up failed');
      setSession({ user: data.user });
      onAuthSuccess?.(data);
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
      const res = await fetch(`${NCB_CONFIG.baseUrl}/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: 'google',
          callbackURL: window.location.origin + '/auth/callback'
        })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
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
      const res = await fetch(`${NCB_CONFIG.baseUrl}/email-otp/send-verification-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({ email, type: 'sign-in' })
      });
      if (res.ok) {
        setOtpSent(true);
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send OTP');
      }
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
      const res = await fetch(`${NCB_CONFIG.baseUrl}/sign-in/email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      setSession({ user: data.user });
      onAuthSuccess?.(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onAuthError?.(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${NCB_CONFIG.baseUrl}/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      setSession(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Lade...</p>
        </div>
      </div>
    );
  }

  // User is logged in - show profile
  if (session?.user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
              {session.user.name?.charAt(0) || session.user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
          <CardTitle>{session.user.name || 'Benutzer'}</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
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
          {currentView === 'signin' ? 'Anmelden' : currentView === 'signup' ? 'Konto erstellen' : 'Mit OTP anmelden'}
        </CardTitle>
        <CardDescription>
          {currentView === 'signin'
            ? 'Melden Sie sich bei Ihrem DPP Manager-Konto an'
            : currentView === 'signup'
              ? 'Erstellen Sie ein neues Konto'
              : 'Erhalten Sie einen Einmalcode per E-Mail'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* OTP Flow - Exclusive View */}
        {currentView === 'otp' ? (
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
                      OTP senden
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Code gesendet an {email}
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
            {providers?.google && (
              <Button variant="outline" onClick={handleGoogleAuth} className="w-full">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Mit Google fortfahren
              </Button>
            )}

            {providers?.emailOTP && (
              <Button variant="outline" onClick={() => setCurrentView('otp')} className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                Mit E-Mail-OTP anmelden
              </Button>
            )}

            {(providers?.google || providers?.emailOTP) && providers?.email && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oder</span>
                </div>
              </div>
            )}

            {/* Email/Password Forms */}
            {providers?.email && (
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
            )}

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

// Export helper functions for use elsewhere in the app
export const NCBAuthHelpers = {
  async getSession(): Promise<AuthSession | null> {
    try {
      const res = await fetch(`${NCB_CONFIG.baseUrl}/get-session`, {
        headers: {
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        return data.user ? data : null;
      }
      return null;
    } catch {
      return null;
    }
  },

  async signOut(): Promise<void> {
    await fetch(`${NCB_CONFIG.baseUrl}/sign-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Database-Instance': NCB_CONFIG.instance,
        'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
      },
      credentials: 'include',
      body: JSON.stringify({})
    });
  },

  async forgotPassword(email: string, redirectTo: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${NCB_CONFIG.baseUrl}/forget-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        body: JSON.stringify({ email, redirectTo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset email');
      return { success: true };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${NCB_CONFIG.baseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');
      return { success: true };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  },

  async changePassword(currentPassword: string, newPassword: string, revokeOtherSessions = true): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${NCB_CONFIG.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Database-Instance': NCB_CONFIG.instance,
          'Authorization': `Bearer ${NCB_CONFIG.secretKey}`
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');
      return { success: true };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }
};
