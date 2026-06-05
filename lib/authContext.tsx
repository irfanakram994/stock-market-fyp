'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AUTH_COOKIE_NAME = 'tradeflux-auth';
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setAuthCookie(isAuthenticated: boolean) {
  if (typeof document === 'undefined') return;

  if (isAuthenticated) {
    document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  }
}

function clearSupabaseBrowserStorage() {
  if (typeof window === 'undefined') return;

  const storageKeys = [window.localStorage, window.sessionStorage];

  for (const storage of storageKeys) {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  }
}

interface User {
  id: string;
  email: string;
  name: string | null;
  gender: string | null;
  profileImage: string | null;
}

interface UserApiResponse {
  success: boolean;
  data?: User;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const mapSupabaseUser = (authUser: any): User => ({
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || null,
    gender: authUser.user_metadata?.gender || null,
    profileImage: authUser.user_metadata?.profileImage || null,
  });

  const getSessionTokens = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  };

  const clearCurrentSession = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setAuthCookie(false);
      clearSupabaseBrowserStorage();
    }
  };

  const fetchDbProfile = async (accessToken: string, refreshToken?: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken, refreshToken }),
      });

      if (response.status === 401 || response.status === 403) {
        await clearCurrentSession();
        return null;
      }

      if (!response.ok) return null;

      const payload: UserApiResponse = await response.json();
      if (!payload.success || !payload.data) return null;
      return payload.data;
    } catch {
      return null;
    }
  };

  const loadCurrentUser = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session?.user) {
      setUser(null);
      setAuthCookie(false);
      return;
    }

    const { accessToken, refreshToken } = await getSessionTokens();
    if (accessToken) {
      const dbUser = await fetchDbProfile(accessToken, refreshToken);
      if (dbUser) {
        setUser(dbUser);
        setAuthCookie(true);
        return;
      }
    }

    setUser(mapSupabaseUser(session.user));
    setAuthCookie(true);
  };

  useEffect(() => {
    // Check if user is logged in on mount
    const checkUser = async () => {
      try {
        await loadCurrentUser();
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null);
        setAuthCookie(false);
        return;
      }

      const accessToken = session.access_token;
      if (accessToken) {
        const dbUser = await fetchDbProfile(accessToken, session.refresh_token);
        if (dbUser) {
          setUser(dbUser);
          setAuthCookie(true);
          return;
        }
      }

      setUser(mapSupabaseUser(session.user));
      setAuthCookie(true);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setAuthCookie(false);
      clearSupabaseBrowserStorage();
    }
  };

  const refreshUser = async () => {
    try {
      await loadCurrentUser();
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
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
