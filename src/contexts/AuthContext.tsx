import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser } from '@/services/supabase/auth';
import { getSession, signOut as authSignOut, onAuthStateChange } from '@/services/supabase/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tenantId: string | null;
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

  const loadTenantId = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .single();
      setTenantId((profile as { tenant_id: string } | null)?.tenant_id || null);
    } catch {
      setTenantId(null);
    }
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
      await refreshSession();
      setIsLoading(false);
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
    setUser(null);
    setTenantId(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    tenantId,
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
