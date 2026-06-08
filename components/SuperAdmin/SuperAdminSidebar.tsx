'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  UserCog,
  Users,
  Activity,
  BarChart3,
  Settings,
  SlidersHorizontal,
  Bell,
  FileText,
  ToggleLeft,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useSuperAdminAuth } from '@/lib/superAdminAuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/super-admin' },
  { icon: UserCog, label: 'Admin Accounts', href: '/super-admin/admins' },
  { icon: Users, label: 'Users', href: '/super-admin/users' },
  { icon: Activity, label: 'Activity Monitor', href: '/super-admin/activities' },
  { icon: BarChart3, label: 'System Analytics', href: '/super-admin/analytics' },
  { icon: Settings, label: 'Global Config', href: '/super-admin/config' },
  { icon: SlidersHorizontal, label: 'Threshold Policies', href: '/super-admin/thresholds' },
  { icon: Bell, label: 'Notification Control', href: '/super-admin/notifications' },
  { icon: FileText, label: 'System Logs', href: '/super-admin/logs' },
  { icon: ToggleLeft, label: 'Module Control', href: '/super-admin/modules' },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { superAdmin, signOut } = useSuperAdminAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/super-admin/login');
  };

  return (
    <div
      className={`h-screen bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      } flex flex-col`}
    >
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800/50">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-white">Super Admin</span>
              <span className="text-xs text-gray-400 -mt-0.5">TradeFlux</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 mx-auto bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {!collapsed && superAdmin && (
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {superAdmin.name?.charAt(0) || superAdmin.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{superAdmin.name || 'Super Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{superAdmin.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 font-medium'
                  : 'text-gray-400 hover:bg-slate-700/60 hover:text-fuchsia-300'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

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

      <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-slate-700/40 hover:bg-fuchsia-500/10 hover:text-fuchsia-300 text-gray-400 transition-all duration-200 border border-slate-600/30 hover:border-fuchsia-500/50"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5 mr-2" /><span className="font-medium">Collapse</span></>}
        </button>
      </div>
    </div>
  );
}
