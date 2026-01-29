import { useNavigate, Navigate } from 'react-router-dom';
import { SupabaseAuth } from '@/components/SupabaseAuth';
import { Leaf } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo und Titel */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">DPP Manager</h1>
          <p className="text-muted-foreground text-sm">
            Digitale Produktpässe für nachhaltige Produkte
          </p>
        </div>

        {/* Auth Component */}
        <SupabaseAuth
          mode="signin"
          onAuthSuccess={handleAuthSuccess}
          onAuthError={handleAuthError}
        />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Mit der Anmeldung akzeptieren Sie unsere{' '}
          <a href="#" className="text-primary hover:underline">Nutzungsbedingungen</a>
          {' '}und{' '}
          <a href="#" className="text-primary hover:underline">Datenschutzrichtlinie</a>.
        </p>
      </div>
    </div>
  );
}
