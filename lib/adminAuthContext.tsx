'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminApi';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  gender: string | null;
  profileImage: string | null;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  updateAdminProfile: (profile: Partial<Pick<AdminUser, 'name' | 'gender' | 'profileImage'>>) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const verifyRequestRef = useRef<Promise<AdminUser | null> | null>(null);

  const verifyAdminStatus = useCallback(async (): Promise<AdminUser | null> => {
    if (!verifyRequestRef.current) {
      verifyRequestRef.current = (async () => {
        try {
          const res = await adminFetch('/api/admin/auth/verify', {
            method: 'POST',
          });
          const data = await res.json();
          if (data.success && data.admin) {
            return data.admin;
          }
          return null;
        } catch {
          return null;
        } finally {
          verifyRequestRef.current = null;
        }
      })();
    }

    return verifyRequestRef.current;
  }, []);

  const loadAdminFromSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      setAdmin(null);
      return;
    }

    const adminData = await verifyAdminStatus();
    setAdmin(adminData);
  }, [verifyAdminStatus]);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        await loadAdminFromSession();
      } catch (error) {
        console.error('Error checking admin:', error);
        setAdmin(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      if (session?.access_token) {
        const adminData = await verifyAdminStatus();
        if (mounted) setAdmin(adminData);
      } else {
        if (mounted) setAdmin(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loadAdminFromSession, verifyAdminStatus]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Supabase signOut error:', error.message);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      verifyRequestRef.current = null;
      setAdmin(null);
    }
  };

  const refreshAdmin = async () => {
    try {
      await loadAdminFromSession();
    } catch (error) {
      console.error('Error refreshing admin:', error);
      setAdmin(null);
    }
  };

  const updateAdminProfile = (profile: Partial<Pick<AdminUser, 'name' | 'gender' | 'profileImage'>>) => {
    setAdmin((current) => (current ? { ...current, ...profile } : current));
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, signOut, refreshAdmin, updateAdminProfile }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
