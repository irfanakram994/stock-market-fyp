'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

const profileCache = new Map<string, User>();
const profileRequests = new Map<string, Promise<User | null>>();

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
  const currentUserIdRef = useRef<string | null>(null);

  const mapSupabaseUser = useCallback((authUser: any): User => ({
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || null,
    gender: authUser.user_metadata?.gender || null,
    profileImage: authUser.user_metadata?.profileImage || null,
  }), []);

  const clearCurrentSession = useCallback(async () => {
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
  }, []);

  const fetchDbProfile = useCallback(async (userId: string, accessToken: string, refreshToken?: string): Promise<User | null> => {
    const cached = profileCache.get(userId);
    if (cached) return cached;

    const existing = profileRequests.get(userId);
    if (existing) return existing;

    const request = (async () => {
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
      profileCache.set(userId, payload.data);
      return payload.data;
    } catch {
      return null;
    } finally {
      profileRequests.delete(userId);
    }
    })();

    profileRequests.set(userId, request);
    return request;
  }, [clearCurrentSession]);

  const hydrateSession = useCallback(async (session: any, options: { blockForProfile?: boolean } = {}) => {
    if (!session?.user) {
      setUser(null);
      currentUserIdRef.current = null;
      setAuthCookie(false);
      return;
    }

    const fallbackUser = mapSupabaseUser(session.user);
    currentUserIdRef.current = fallbackUser.id;

    const cached = profileCache.get(fallbackUser.id);
    setUser(cached || fallbackUser);
    setAuthCookie(true);

    const accessToken = session.access_token;
    if (!accessToken) return;

    const applyProfile = async () => {
      const dbUser = await fetchDbProfile(fallbackUser.id, accessToken, session.refresh_token);
      if (dbUser) {
        setUser((current) => (current?.id === dbUser.id ? dbUser : current));
      }
    };

    if (options.blockForProfile && !cached) {
      await applyProfile();
    } else {
      void applyProfile();
    }
  }, [fetchDbProfile, mapSupabaseUser]);

  const loadCurrentUser = useCallback(async (options: { blockForProfile?: boolean } = {}) => {
    const { data } = await supabase.auth.getSession();
    await hydrateSession(data.session, options);
  }, [hydrateSession]);

  useEffect(() => {
    let mounted = true;

    // Check if user is logged in on mount
    const checkUser = async () => {
      try {
        await loadCurrentUser({ blockForProfile: false });
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (!session?.user) {
        setUser(null);
        currentUserIdRef.current = null;
        setAuthCookie(false);
        return;
      }

      await hydrateSession(session, { blockForProfile: false });
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [hydrateSession, loadCurrentUser]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      if (user?.id) profileCache.delete(user.id);
      setUser(null);
      currentUserIdRef.current = null;
      setAuthCookie(false);
      clearSupabaseBrowserStorage();
    }
  };

  const refreshUser = async () => {
    try {
      await loadCurrentUser({ blockForProfile: true });
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
