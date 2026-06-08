'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  UserCog,
  Users,
} from 'lucide-react';

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

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-800 bg-[#0b0d1c] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10">
              <ShieldCheck className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">TradeFlux</p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10">
            <ShieldCheck className="h-5 w-5 text-fuchsia-300" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : ''}
              className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                isActive
                  ? 'border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-fuchsia-300' : 'text-slate-500 group-hover:text-fuchsia-300'}`} />
              {!collapsed && <span className="truncate font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
            <span>Authority</span>
            <span className="inline-flex items-center gap-1 text-fuchsia-300">
              <ShieldCheck className="h-3 w-3" />
              Root
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 transition-colors hover:border-fuchsia-300/30 hover:text-fuchsia-300"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="mr-2 h-4 w-4" /><span className="text-sm font-medium">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
