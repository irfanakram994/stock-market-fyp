'use client';

import AdminSidebar from '@/components/Admin/AdminSidebar';
import AdminNavbar from '@/components/Admin/AdminNavbar';
import { AdminProtectedRoute } from '@/components/Admin/AdminProtectedRoute';
import { AdminAuthProvider } from '@/lib/adminAuthContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthProvider>
            <AdminProtectedRoute>
                <div className="flex h-screen bg-[#050b14] text-slate-100">
                    <AdminSidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <AdminNavbar />
                        <main className="flex-1 overflow-y-auto bg-[#08111f]">
                            <div className="mx-auto w-full max-w-[1600px] p-5 lg:p-6">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </AdminProtectedRoute>
        </AdminAuthProvider>
    );
}
