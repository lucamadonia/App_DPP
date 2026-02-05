import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, clearTenantIdCache } from '@/lib/supabase';
import type { AuthUser } from '@/services/supabase/auth';
import { getSession, signOut as authSignOut, onAuthStateChange } from '@/services/supabase/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tenantId: string | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadTenantId = async (userId: string, retries = 5, delay = 200) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', userId)
          .single();

        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          return; // Success!
        }

        // Wait before next retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      } catch (error) {
        // Log error but continue retrying
        if (attempt === retries - 1) {
          console.error('Failed to load tenant_id after', retries, 'attempts:', error);
        }
      }
    }

    // After all retries, still no tenant_id
    console.error('Failed to load tenant_id after', retries, 'attempts');
    setTenantId(null);
  };

  const refreshSession = async () => {
    try {
      const { user: sessionUser } = await getSession();
      setUser(sessionUser);
      if (sessionUser) {
        await loadTenantId(sessionUser.id);
      } else {
        setTenantId(null);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setUser(null);
      setTenantId(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      setIsInitializing(true);
      await refreshSession();
      setIsLoading(false);
      setIsInitializing(false);
    };

    initAuth();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange(async (newUser) => {
      setUser(newUser);
      if (newUser) {
        await loadTenantId(newUser.id);
      } else {
        setTenantId(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authSignOut();
    clearTenantIdCache(); // Clear tenant ID cache
    setUser(null);
    setTenantId(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    tenantId,
    isInitializing,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
