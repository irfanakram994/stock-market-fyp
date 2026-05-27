'use client';

import { usePathname } from 'next/navigation';
import { SuperAdminAuthProvider } from '@/lib/superAdminAuthContext';
import { SuperAdminProtectedRoute } from '@/components/SuperAdmin/SuperAdminProtectedRoute';
import SuperAdminSidebar from '@/components/SuperAdmin/SuperAdminSidebar';
import SuperAdminNavbar from '@/components/SuperAdmin/SuperAdminNavbar';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  return (
    <SuperAdminAuthProvider>
      <SuperAdminProtectedRoute>
        <div className="flex h-screen bg-slate-950">
          <SuperAdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <SuperAdminNavbar />
            <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-900 to-slate-950">{children}</main>
          </div>
        </div>
      </SuperAdminProtectedRoute>
    </SuperAdminAuthProvider>
  );
}
