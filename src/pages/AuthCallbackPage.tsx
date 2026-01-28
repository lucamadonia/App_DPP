import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * AuthCallbackPage - Handles OAuth callbacks (e.g., Google)
 *
 * This page processes the authentication callback and redirects
 * the user appropriately.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // URL-Parameter auslesen
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || errorParam || 'Authentication failed');
        }

        // Erfolgreiche Authentifizierung
        setStatus('success');

        // Kurze Verzögerung, dann zum Dashboard weiterleiten
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError((err as Error).message);
        setStatus('error');
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-success" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Authentifizierung wird verarbeitet...'}
            {status === 'success' && 'Erfolgreich angemeldet!'}
            {status === 'error' && 'Anmeldung fehlgeschlagen'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Bitte warten Sie einen Moment.'}
            {status === 'success' && 'Sie werden zum Dashboard weitergeleitet.'}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate('/login', { replace: true })}>
              Zurück zur Anmeldung
            </Button>
            <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
              Zur Startseite
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
