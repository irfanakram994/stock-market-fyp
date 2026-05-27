'use client';

import Link from 'next/link';
import { Bell, Crown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSuperAdminAuth } from '@/lib/superAdminAuthContext';
import { superAdminFetch } from '@/lib/superAdminApi';

export default function SuperAdminNavbar() {
  const { superAdmin } = useSuperAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await superAdminFetch('/api/super-admin/notifications?limit=1');
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search admins, logs, modules..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Link href="/super-admin/notifications" className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-fuchsia-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="h-8 w-px bg-slate-700"></div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{superAdmin?.name || 'Super Admin'}</p>
            <p className="text-xs text-fuchsia-300 font-medium uppercase">{superAdmin?.role || 'SUPER_ADMIN'}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
