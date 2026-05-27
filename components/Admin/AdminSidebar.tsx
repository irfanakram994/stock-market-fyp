'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    SlidersHorizontal,
    Bell,
    BarChart3,
    FileText,
    Shield,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useAdminAuth } from '@/lib/adminAuthContext';
import { useRouter } from 'next/navigation';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'User Management', href: '/admin/users' },
    { icon: TrendingUp, label: 'Predictions', href: '/admin/predictions' },
    { icon: SlidersHorizontal, label: 'Thresholds', href: '/admin/thresholds' },
    { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
    { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
    { icon: FileText, label: 'Audit Logs', href: '/admin/audit-logs' },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { admin, signOut } = useAdminAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/admin/login');
    };

    return (
        <div
            className={`h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 transition-all duration-300 ${
                collapsed ? 'w-20' : 'w-64'
            } flex flex-col`}
        >
            {/* Logo */}
            <div className="p-3 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800/50">
                {!collapsed && (
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-lg font-semibold text-white">Admin Panel</span>
                            <span className="text-xs text-gray-400 -mt-0.5">TradeFlux</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="flex items-center justify-center w-10 h-10 mx-auto bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                )}
            </div>

            {/* Admin Info */}
            {!collapsed && admin && (
                <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                                {admin.name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {admin.name || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                        (item.href !== '/admin' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                                isActive
                                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 border border-orange-500/30 font-medium'
                                    : 'text-gray-400 hover:bg-slate-700/60 hover:text-orange-300'
                            } ${collapsed ? 'justify-center' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span className="font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Signout Button */}
            <div className="p-4 border-t border-slate-700/50">
                <button
                    onClick={handleSignOut}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 ${
                        collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Sign Out' : ''}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">Sign Out</span>}
                </button>
            </div>

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-slate-700/40 hover:bg-orange-500/10 hover:text-orange-400 text-gray-400 transition-all duration-200 border border-slate-600/30 hover:border-orange-500/50"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5 mr-2" />
                            <span className="font-medium">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
