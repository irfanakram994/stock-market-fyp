'use client';

import { Bell, Search, Settings } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';

export default function AdminNavbar() {
    const { admin } = useAdminAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Fetch unread notifications count
        const fetchUnreadCount = async () => {
            try {
                const res = await adminFetch('/api/admin/notifications?limit=1');
                const data = await res.json();
                if (data.success) {
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchUnreadCount();
        // Refresh every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [admin?.email]);

    return (
        <header className="h-16 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
            {/* Left side - Search */}
            <div className="flex items-center flex-1 max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users, predictions, logs..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    />
                </div>
            </div>

            {/* Right side - Notifications and Profile */}
            <div className="flex items-center space-x-4">
                {/* Notifications */}
                <Link
                    href="/admin/notifications"
                    className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                    <Bell className="w-5 h-5 text-gray-400" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-700"></div>

                {/* Admin Badge */}
                <div className="flex items-center space-x-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-white">
                            {admin?.name || 'Admin'}
                        </p>
                        <p className="text-xs text-orange-400 font-medium uppercase">
                            {admin?.role || 'Admin'}
                        </p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                            {admin?.name?.charAt(0) || admin?.email?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
