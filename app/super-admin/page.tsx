'use client';

import { useEffect, useState } from 'react';
import { Crown, Users, UserCog, TrendingUp, Activity, ShieldCheck, Bell, RefreshCw } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminMetricCard, AdminPageHeader, LoadingState, Panel } from '@/components/Admin/AdminUI';

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

export default function SuperAdminDashboardPage() {
  const { showSnackbar } = useSnackbar();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await superAdminFetch('/api/super-admin/dashboard');
      const payload = await res.json();
      if (payload.success) {
        setData(payload.data);
        if (manual) showSnackbar({ variant: 'success', message: 'Super admin dashboard refreshed.' });
      } else {
        showSnackbar({ variant: 'error', message: payload.error || 'Failed to load super admin dashboard.' });
      }
    } catch (error) {
      console.error('Error loading super admin dashboard:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load super admin dashboard.' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState label="Loading super admin dashboard..." />;
  }

  if (!data) {
    return <div className="text-red-400">Failed to load super admin dashboard.</div>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Crown}
        title="Super Admin Dashboard"
        description="Highest-authority overview across users, admins, modules, policies, and platform activity."
        actions={
        <button onClick={() => load(true)} disabled={refreshing} className="px-4 py-2 rounded-lg border border-slate-700 text-gray-300 hover:bg-slate-800 flex items-center gap-2 disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard title="Total Users" value={data.metrics.users} icon={Users} tone="blue" />
        <AdminMetricCard title="Admin Accounts" value={data.metrics.admins} icon={UserCog} tone="purple" />
        <AdminMetricCard title="Predictions" value={data.metrics.predictions} icon={TrendingUp} tone="green" />
        <AdminMetricCard title="Activity Logs" value={data.metrics.agentLogs} icon={Activity} tone="cyan" />
        <AdminMetricCard title="Admin/Super Actions" value={data.metrics.adminActivities} icon={ShieldCheck} tone="amber" />
        <AdminMetricCard title="Active Thresholds" value={data.metrics.activeThresholds} icon={ShieldCheck} tone="green" />
        <AdminMetricCard title="Unread Notifications" value={data.metrics.unreadNotifications} icon={Bell} tone="red" />
        <AdminMetricCard title="Enabled Modules" value={`${data.metrics.modules.enabled}/${data.metrics.modules.total}`} icon={ShieldCheck} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel className="p-5">
          <h2 className="text-white font-semibold mb-4">Recent Admin Activity</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {data.recent.adminActions.map((row) => (
              <div key={row.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                <p className="text-sm text-white">{row.action}</p>
                <p className="text-xs text-gray-400">{row.admin.name || row.admin.email} • {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-white font-semibold mb-4">Recent Super Admin Activity</h2>
          <div className="space-y-2 max-h-72 overflow-auto">
            {data.recent.superAdminActions.map((row) => (
              <div key={row.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                <p className="text-sm text-white">{row.action}</p>
                <p className="text-xs text-gray-400">{row.superAdmin.name || row.superAdmin.email} • {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
