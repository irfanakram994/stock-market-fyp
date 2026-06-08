'use client';

import { SuperAdminAuthProvider } from '@/lib/superAdminAuthContext';
import { SuperAdminProtectedRoute } from '@/components/SuperAdmin/SuperAdminProtectedRoute';
import SuperAdminSidebar from '@/components/SuperAdmin/SuperAdminSidebar';
import SuperAdminNavbar from '@/components/SuperAdmin/SuperAdminNavbar';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminAuthProvider>
      <SuperAdminProtectedRoute>
        <div className="flex h-screen bg-[#070712] text-slate-100">
          <SuperAdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <SuperAdminNavbar />
            <main className="flex-1 overflow-y-auto bg-[#0b0d1c]">
              <div className="mx-auto w-full max-w-[1600px] p-5 lg:p-6">{children}</div>
            </main>
          </div>
        </div>
      </SuperAdminProtectedRoute>
    </SuperAdminAuthProvider>
  );
}
