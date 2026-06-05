'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { superAdminFetch } from '@/lib/superAdminApi';

interface SuperAdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface SuperAdminAuthContextType {
  superAdmin: SuperAdminUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSuperAdmin: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export function SuperAdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const verify = async (email: string): Promise<SuperAdminUser | null> => {
    try {
      const res = await superAdminFetch('/api/super-admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return data.success ? data.superAdmin : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.email) {
          const verified = await verify(data.session.user.email);
          setSuperAdmin(verified);
        }
      } finally {
        setLoading(false);
      }
    };

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const verified = await verify(session.user.email);
        setSuperAdmin(verified);
      } else {
        setSuperAdmin(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSuperAdmin(null);
  };

  const refreshSuperAdmin = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email) {
      const verified = await verify(data.session.user.email);
      setSuperAdmin(verified);
    }
  };

  return (
    <SuperAdminAuthContext.Provider value={{ superAdmin, loading, signOut, refreshSuperAdmin }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return context;
}
