'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';

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

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-800 bg-[#07111f] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-400/10">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">TradeFlux</p>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-400/10">
            <Shield className="h-5 w-5 text-emerald-300" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : ''}
              className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                isActive
                  ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-500 group-hover:text-emerald-300'}`} />
              {!collapsed && <span className="truncate font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">
            <span>System</span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Activity className="h-3 w-3" />
              Live
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 transition-colors hover:border-emerald-300/30 hover:text-emerald-300"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="mr-2 h-4 w-4" /><span className="text-sm font-medium">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
