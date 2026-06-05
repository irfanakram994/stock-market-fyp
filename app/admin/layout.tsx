'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/Admin/AdminSidebar';
import AdminNavbar from '@/components/Admin/AdminNavbar';
import { AdminProtectedRoute } from '@/components/Admin/AdminProtectedRoute';
import { AdminAuthProvider } from '@/lib/adminAuthContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    
    // Don't apply protection to login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <AdminAuthProvider>
            <AdminProtectedRoute>
                <div className="flex h-screen bg-slate-950">
                    <AdminSidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <AdminNavbar />
                        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-900 to-slate-950">
                            {children}
                        </main>
                    </div>
                </div>
            </AdminProtectedRoute>
        </AdminAuthProvider>
    );
}
