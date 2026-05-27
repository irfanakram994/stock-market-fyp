'use client';

import { useEffect, useState } from 'react';
import { Crown, Users, UserCog, TrendingUp, Activity, ShieldCheck, Bell, RefreshCw } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';

interface DashboardData {
  metrics: {
    users: number;
    admins: number;
    superAdmins: number;
    predictions: number;
    agentLogs: number;
    adminActivities: number;
    modules: { total: number; enabled: number };
    activeThresholds: number;
    unreadNotifications: number;
  };
  recent: {
    adminActions: Array<{ id: string; action: string; createdAt: string; admin: { email: string; name: string | null } }>;
    superAdminActions: Array<{ id: string; action: string; createdAt: string; superAdmin: { email: string; name: string | null } }>;
  };
}

function Metric({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">{title}</p>
        <Icon className="w-5 h-5 text-fuchsia-300" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/dashboard');
    const payload = await res.json();
    if (payload.success) setData(payload.data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="text-red-400">Failed to load super admin dashboard.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Crown className="w-7 h-7 text-fuchsia-300" /> Super Admin Dashboard</h1>
          <p className="text-gray-400">Highest authority overview across the entire platform</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-lg border border-slate-600 text-gray-300 hover:bg-slate-800 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric title="Total Users" value={data.metrics.users} icon={Users} />
        <Metric title="Admin Accounts" value={data.metrics.admins} icon={UserCog} />
        <Metric title="Predictions" value={data.metrics.predictions} icon={TrendingUp} />
        <Metric title="Activity Logs" value={data.metrics.agentLogs} icon={Activity} />
        <Metric title="Admin/Super Actions" value={data.metrics.adminActivities} icon={ShieldCheck} />
        <Metric title="Active Thresholds" value={data.metrics.activeThresholds} icon={ShieldCheck} />
        <Metric title="Unread Notifications" value={data.metrics.unreadNotifications} icon={Bell} />
        <Metric title="Enabled Modules" value={`${data.metrics.modules.enabled}/${data.metrics.modules.total}`} icon={ShieldCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Admin Activity</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {data.recent.adminActions.map((row) => (
              <div key={row.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                <p className="text-sm text-white">{row.action}</p>
                <p className="text-xs text-gray-400">{row.admin.name || row.admin.email} • {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Recent Super Admin Activity</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {data.recent.superAdminActions.map((row) => (
              <div key={row.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                <p className="text-sm text-white">{row.action}</p>
                <p className="text-xs text-gray-400">{row.superAdmin.name || row.superAdmin.email} • {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
