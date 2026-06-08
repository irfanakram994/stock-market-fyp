'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Activity, FileText, Loader, ShieldCheck, UserCog } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, RefreshButton } from '@/components/Admin/AdminUI';

interface AgentLog {
  id: string;
  agentName: string;
  status: string;
  startedAt: string;
  error?: string | null;
  duration?: number | null;
  user: { email: string; name: string | null } | null;
}

interface AuditLog {
  id: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: unknown;
  createdAt: string;
  admin?: { email: string; name: string | null };
  superAdmin?: { email: string; name: string | null };
}

interface Payload {
  agentActivities: AgentLog[];
  adminActivities: AuditLog[];
  superAdminActivities: AuditLog[];
}

type Tab = 'agents' | 'admins' | 'superAdmins';

const tabs: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'agents', label: 'Agent Logs', icon: Activity },
  { key: 'admins', label: 'Admin Audit', icon: UserCog },
  { key: 'superAdmins', label: 'Super Admin Audit', icon: ShieldCheck },
];

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const className =
    normalized === 'completed' || normalized.includes('create') || normalized.includes('update')
      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20'
      : normalized === 'failed' || normalized.includes('delete')
        ? 'bg-red-500/10 text-red-300 ring-red-400/20'
        : 'bg-cyan-500/10 text-fuchsia-300 ring-fuchsia-300/25';

  return <span className={`rounded px-2 py-1 text-xs font-semibold ring-1 ${className}`}>{value}</span>;
}

function DetailsPreview({ details }: { details: unknown }) {
  if (!details) return <span className="text-slate-500">No details</span>;
  return (
    <pre className="max-h-20 max-w-xl overflow-auto rounded bg-slate-950/70 p-2 text-xs text-slate-300">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
}

export default function SuperAdminLogsPage() {
  const { showSnackbar } = useSnackbar();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await superAdminFetch('/api/super-admin/activities?limit=50');
      const data = await res.json();
      if (data.success) {
        setPayload(data.data);
        if (manual) showSnackbar({ variant: 'success', message: 'System logs refreshed.' });
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load system logs.' });
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load system logs.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const currentRows = useMemo(() => {
    if (!payload) return [];
    if (activeTab === 'agents') return payload.agentActivities;
    if (activeTab === 'admins') return payload.adminActivities;
    return payload.superAdminActivities;
  }, [activeTab, payload]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={FileText}
        tone="super"
        title="System Logs"
        description="Review agent execution, admin actions, and super-admin audit events from one place."
        actions={<RefreshButton tone="super" onClick={() => load(true)} loading={refreshing} />}
      />

      <Panel className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  selected ? 'bg-cyan-500/15 text-fuchsia-200 ring-1 ring-fuchsia-300/25' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {loading ? (
        <LoadingState label="Loading system logs..." tone="super" />
      ) : !payload || currentRows.length === 0 ? (
        <EmptyState title="No logs found" description="System actions will appear here after agents or admins perform work." />
      ) : (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-950/80 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Target / Details</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row: AgentLog | AuditLog) => {
                  const isAgent = 'agentName' in row;
                  const actor = isAgent
                    ? row.user?.name || row.user?.email || 'system'
                    : row.admin?.name || row.admin?.email || row.superAdmin?.name || row.superAdmin?.email || 'system';
                  return (
                    <tr key={row.id} className="border-t border-slate-800 text-slate-200 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-white">{isAgent ? row.agentName : row.action}</p>
                          <StatusBadge value={isAgent ? row.status : row.action} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{actor}</td>
                      <td className="px-4 py-3">
                        {isAgent ? (
                          <div className="text-slate-400">
                            {row.duration ? `${row.duration}ms` : 'Duration not recorded'}
                            {row.error && <p className="mt-1 text-red-300">{row.error}</p>}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">{row.targetType || 'target'} {row.targetId || ''}</p>
                            <DetailsPreview details={row.details} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{new Date(isAgent ? row.startedAt : row.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {refreshing && (
        <div className="fixed bottom-24 right-6 inline-flex items-center gap-2 rounded-lg border border-fuchsia-300/25 bg-slate-950 px-3 py-2 text-sm text-fuchsia-200 shadow-xl">
          <Loader className="h-4 w-4 animate-spin" />
          Refreshing logs
        </div>
      )}
    </div>
  );
}
