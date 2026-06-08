'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resolveCurrentRole } from '@/lib/roleRouting';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;

    const redirectPrivilegedRole = async () => {
      const roleResult = await resolveCurrentRole();
      if (cancelled) return;
      if (!roleResult.success) {
        if (roleResult.code === 'USER_BLOCKED') {
          await signOut();
          router.replace('/');
        }
        return;
      }
      if (!roleResult.redirectTo) return;
      if (roleResult.role === 'admin' || roleResult.role === 'super_admin') {
        router.replace(roleResult.redirectTo);
      }
    };

    redirectPrivilegedRole();

    return () => {
      cancelled = true;
    };
  }, [user, loading, router, signOut]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
