'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminApi';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const verifyAdminStatus = async (email: string): Promise<AdminUser | null> => {
    try {
      const res = await adminFetch('/api/admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && data.admin) {
        return data.admin;
      }
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.email) {
          const adminData = await verifyAdminStatus(data.session.user.email);
          setAdmin(adminData);
        }
      } catch (error) {
        console.error('Error checking admin:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        const adminData = await verifyAdminStatus(session.user.email);
        setAdmin(adminData);
      } else {
        setAdmin(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

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
      setAdmin(null);
    }
  };

  const refreshAdmin = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) {
        const adminData = await verifyAdminStatus(data.session.user.email);
        setAdmin(adminData);
      }
    } catch (error) {
      console.error('Error refreshing admin:', error);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, signOut, refreshAdmin }}>
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
