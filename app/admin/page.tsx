'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';
import { adminFetch } from '@/lib/adminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, LoadingState } from '@/components/Admin/AdminUI';
import { usePostLoginTransition } from '@/components/PostLoginTransition';

interface DashboardStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  predictions: {
    total: number;
    today: number;
    thisWeek: number;
    avgConfidence: number | string;
  };
  stocks: {
    total: number;
    active: number;
  };
  agents: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    successRate: number;
  };
  backtests: {
    total: number;
  };
  systemHealth: {
    agentStatus: string;
    successRate: number;
    avgConfidence: number | string;
  };
  recentActivity: {
    agentLogs: Array<{
      id: string;
      agentName: string;
      status: string;
      duration: number | null;
      startedAt: string;
    }>;
    predictions: Array<{
      id: string;
      predictedPrice: number;
      confidence: number;
      trend: string;
      createdAt: string;
      stock: { symbol: string; name: string };
    }>;
  };
}

function progressValue(value: number | string) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

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
  tone: 'emerald' | 'teal' | 'mint' | 'slate';
}) {
  const tones = {
    emerald: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300',
    teal: 'border-teal-300/20 bg-teal-400/10 text-teal-300',
    mint: 'border-lime-300/20 bg-lime-300/10 text-lime-200',
    slate: 'border-slate-600/30 bg-slate-800/40 text-emerald-200',
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

function StatusRow({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();
  const { showSnackbar } = useSnackbar();
  const { markDestinationReady } = usePostLoginTransition();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load dashboard data.' });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load dashboard data.' });
    }
  }, [showSnackbar]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    loadData();
  }, [admin?.email, fetchStats]);

  useEffect(() => {
    if (!loading) {
      markDestinationReady('/admin');
    }
  }, [loading, markDestinationReady]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingState label="Loading admin dashboard..." />;
  }

  if (!stats) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-center">
        <p className="text-sm text-slate-400">Failed to load dashboard data.</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-300"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const confidence = progressValue(stats.systemHealth.avgConfidence);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Admin Dashboard"
        description="System health, prediction flow, user growth, and recent platform activity."
        icon={BarChart3}
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-300/35 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value={stats.users.total} detail={`${stats.users.newThisWeek} new this week`} icon={Users} tone="teal" />
        <MetricCard title="Predictions" value={stats.predictions.total} detail={`${stats.predictions.avgConfidence}% average confidence`} icon={TrendingUp} tone="emerald" />
        <MetricCard title="Agent Tasks" value={stats.agents.total} detail={`${stats.agents.successRate}% success rate`} icon={Activity} tone="mint" />
        <MetricCard title="Active Stocks" value={stats.stocks.active} detail={`${stats.stocks.total} tracked symbols`} icon={BarChart3} tone="slate" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Agent Status">
          <div className="space-y-3">
            <StatusRow icon={CheckCircle} label="Completed" value={stats.agents.completed} color="text-emerald-300" />
            <StatusRow icon={XCircle} label="Failed" value={stats.agents.failed} color="text-red-300" />
            <StatusRow icon={Clock} label="Running" value={stats.agents.running} color="text-amber-300" />
          </div>
        </Panel>

        <Panel title="System Health">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Agent status</span>
              <span className="rounded border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-200">
                {stats.systemHealth.agentStatus}
              </span>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Success rate</span>
                <span className="font-semibold text-white">{stats.systemHealth.successRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${progressValue(stats.systemHealth.successRate)}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Average confidence</span>
                <span className="font-semibold text-white">{stats.systemHealth.avgConfidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-teal-300" style={{ width: `${confidence}%` }} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Today">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm text-slate-400">New users</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.users.newToday}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm text-slate-400">Predictions</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.predictions.today}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/45 p-4">
              <p className="text-sm text-slate-400">Backtests</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stats.backtests.total}</p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Recent Agent Activity">
          <div className="space-y-2">
            {stats.recentActivity.agentLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No recent activity</p>
            ) : (
              stats.recentActivity.agentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{log.agentName}</p>
                    <p className="text-xs text-slate-500">{new Date(log.startedAt).toLocaleString()}</p>
                  </div>
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${
                      log.status === 'completed'
                        ? 'bg-emerald-400/10 text-emerald-200'
                        : log.status === 'failed'
                          ? 'bg-red-400/10 text-red-200'
                          : 'bg-amber-400/10 text-amber-200'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Recent Predictions">
          <div className="space-y-2">
            {stats.recentActivity.predictions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No recent predictions</p>
            ) : (
              stats.recentActivity.predictions.slice(0, 5).map((pred) => (
                <div key={pred.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-xs font-semibold text-emerald-200">
                      {pred.stock.symbol.slice(0, 4)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">${pred.predictedPrice.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{(pred.confidence * 100).toFixed(0)}% confidence</p>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2.5 py-1 text-xs font-semibold capitalize ${
                      pred.trend === 'bullish'
                        ? 'bg-emerald-400/10 text-emerald-200'
                        : pred.trend === 'bearish'
                          ? 'bg-red-400/10 text-red-200'
                          : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {pred.trend}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
