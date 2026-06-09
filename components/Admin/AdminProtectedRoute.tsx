'use client';

import { useAdminAuth } from '@/lib/adminAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.replace('/');
    }
  }, [admin, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-gradient-to-r from-primary to-accent rounded-full">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return <>{children}</>;
}
