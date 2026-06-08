'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Bell, Crown, RefreshCw, ShieldCheck, SlidersHorizontal, TrendingUp, UserCog, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, LoadingState } from '@/components/Admin/AdminUI';
import { usePostLoginTransition } from '@/components/PostLoginTransition';

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

type ActivityRow = {
  id: string;
  action: string;
  createdAt: string;
  admin?: { email: string; name: string | null };
  superAdmin?: { email: string; name: string | null };
};

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: 'fuchsia' | 'violet' | 'magenta' | 'slate';
}) {
  const tones = {
    fuchsia: 'border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-300',
    violet: 'border-violet-300/20 bg-violet-400/10 text-violet-300',
    magenta: 'border-pink-300/20 bg-pink-400/10 text-pink-300',
    slate: 'border-slate-600/30 bg-slate-800/40 text-fuchsia-200',
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/45 p-5 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/45 p-5 shadow-xl shadow-black/10">
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function ActivityList({
  rows,
  getActor,
}: {
  rows: ActivityRow[];
  getActor: (row: ActivityRow) => string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No recent activity</p>;
  }

  return (
    <div className="space-y-2">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-white">{row.action}</p>
            <span className="shrink-0 rounded bg-fuchsia-400/10 px-2 py-1 text-[11px] font-semibold text-fuchsia-200">Audit</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {getActor(row)} | {new Date(row.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { showSnackbar } = useSnackbar();
  const { markDestinationReady } = usePostLoginTransition();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
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
  }, [showSnackbar]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!loading) {
      markDestinationReady('/super-admin');
    }
  }, [loading, markDestinationReady]);

  if (loading) {
    return <LoadingState label="Loading super admin dashboard..." tone="super" />;
  }

  if (!data) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-center">
        <p className="text-sm text-slate-400">Failed to load super admin dashboard.</p>
        <button
          type="button"
          onClick={() => load(true)}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-fuchsia-300"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Crown}
        tone="super"
        title="Super Admin Dashboard"
        description="Global authority overview across admins, users, modules, policies, and activity."
        actions={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-fuchsia-300/35 hover:text-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value={data.metrics.users} detail="Registered user accounts" icon={Users} tone="violet" />
        <MetricCard title="Admin Accounts" value={data.metrics.admins} detail={`${data.metrics.superAdmins} super admin account(s)`} icon={UserCog} tone="fuchsia" />
        <MetricCard title="Predictions" value={data.metrics.predictions} detail="Stored AI prediction records" icon={TrendingUp} tone="magenta" />
        <MetricCard title="Agent Logs" value={data.metrics.agentLogs} detail="Agent execution records" icon={Activity} tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Admin Actions" value={data.metrics.adminActivities} detail="Audited role activity" icon={ShieldCheck} tone="slate" />
        <MetricCard title="Threshold Policies" value={data.metrics.activeThresholds} detail="Active alert policies" icon={SlidersHorizontal} tone="fuchsia" />
        <MetricCard title="Unread Notices" value={data.metrics.unreadNotifications} detail="Pending notifications" icon={Bell} tone="magenta" />
        <MetricCard title="Enabled Modules" value={`${data.metrics.modules.enabled}/${data.metrics.modules.total}`} detail="Platform modules online" icon={BarChart3} tone="fuchsia" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Module Coverage">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-400">Enabled modules</p>
                <p className="mt-2 text-3xl font-semibold text-white">{data.metrics.modules.enabled}</p>
              </div>
              <p className="text-sm text-slate-500">of {data.metrics.modules.total}</p>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-fuchsia-300"
                style={{ width: `${data.metrics.modules.total ? (data.metrics.modules.enabled / data.metrics.modules.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Authority Mix">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
              <span className="text-sm text-slate-400">Admins</span>
              <span className="font-semibold text-white">{data.metrics.admins}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
              <span className="text-sm text-slate-400">Super admins</span>
              <span className="font-semibold text-white">{data.metrics.superAdmins}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Operational Queue">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
              <span className="text-sm text-slate-400">Unread notifications</span>
              <span className="font-semibold text-white">{data.metrics.unreadNotifications}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
              <span className="text-sm text-slate-400">Active thresholds</span>
              <span className="font-semibold text-white">{data.metrics.activeThresholds}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Recent Admin Activity">
          <ActivityList rows={data.recent.adminActions} getActor={(row) => row.admin?.name || row.admin?.email || 'Admin'} />
        </Panel>

        <Panel title="Recent Super Admin Activity">
          <ActivityList rows={data.recent.superAdminActions} getActor={(row) => row.superAdmin?.name || row.superAdmin?.email || 'Super Admin'} />
        </Panel>
      </div>
    </div>
  );
}
