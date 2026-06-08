'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader, ToggleLeft } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, StatusPill } from '@/components/Admin/AdminUI';

interface ModuleRow {
  id: string;
  moduleKey: string;
  moduleName: string;
  description: string | null;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export default function SuperAdminModulesPage() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const load = async () => {
    try {
      const res = await superAdminFetch('/api/super-admin/modules');
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load modules.' });
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load modules.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (row: ModuleRow) => {
    if (savingRef.current) return;

    const nextEnabled = !row.isEnabled;
    savingRef.current = true;
    setSavingId(row.id);
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isEnabled: nextEnabled } : item)));
    try {
      const res = await superAdminFetch('/api/super-admin/modules', {
        method: 'PATCH',
        body: JSON.stringify({ id: row.id, isEnabled: nextEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: `${row.moduleName} ${row.isEnabled ? 'disabled' : 'enabled'} successfully.` });
        if (data.data) {
          setRows((current) => current.map((item) => (item.id === row.id ? data.data : item)));
        }
      } else {
        setRows((current) => current.map((item) => (item.id === row.id ? row : item)));
        showSnackbar({ variant: 'error', message: data.error || 'Failed to update module.' });
      }
    } catch (error) {
      console.error('Error toggling module:', error);
      setRows((current) => current.map((item) => (item.id === row.id ? row : item)));
      showSnackbar({ variant: 'error', message: 'Failed to update module.' });
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ToggleLeft}
        tone="super"
        title="Module Control"
        description="Enable or disable major platform capabilities. Disabled modules return a clear access message from guarded APIs."
      />

      {loading ? (
        <LoadingState label="Loading modules..." tone="super" />
      ) : rows.length === 0 ? (
        <EmptyState title="No modules configured" description="Default modules will be created automatically by the API." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <Panel key={row.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{row.moduleName}</p>
                  <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">{row.moduleKey}</span>
                </div>
                <p className="text-sm leading-6 text-slate-400">{row.description || 'No description'}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Updated by {row.updatedBy || 'N/A'} - {new Date(row.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => toggle(row)} disabled={savingId !== null} className="disabled:cursor-not-allowed disabled:opacity-60">
                {savingId === row.id ? (
                  <Loader className="h-4 w-4 animate-spin text-fuchsia-300" />
                ) : (
                  <StatusPill active={row.isEnabled} activeText="Enabled" inactiveText="Disabled" />
                )}
              </button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
