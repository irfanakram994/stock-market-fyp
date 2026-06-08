'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader, Settings } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, StatusPill } from '@/components/Admin/AdminUI';

interface GlobalConfigRow {
  id: string;
  configKey: string;
  configValue: unknown;
  description: string | null;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export default function SuperAdminConfigPage() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<GlobalConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [configKey, setConfigKey] = useState('');
  const [configValue, setConfigValue] = useState('{}');
  const [description, setDescription] = useState('');

  const load = async () => {
    try {
      const res = await superAdminFetch('/api/super-admin/config');
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load global config.' });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load global config.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createConfig = async (event: FormEvent) => {
    event.preventDefault();

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(configValue);
    } catch {
      showSnackbar({ variant: 'warning', message: 'Config value must be valid JSON.' });
      return;
    }

    setSaving(true);
    try {
      const res = await superAdminFetch('/api/super-admin/config', {
        method: 'POST',
        body: JSON.stringify({ configKey, configValue: parsedValue, description }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: 'Global config saved successfully.' });
        setConfigKey('');
        setConfigValue('{}');
        setDescription('');
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to save config.' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showSnackbar({ variant: 'error', message: 'Failed to save config.' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string, isActive: boolean) => {
    setSavingId(id);
    try {
      const res = await superAdminFetch('/api/super-admin/config', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: `Config ${isActive ? 'disabled' : 'activated'} successfully.` });
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to update config.' });
      }
    } catch (error) {
      console.error('Error toggling config:', error);
      showSnackbar({ variant: 'error', message: 'Failed to update config.' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Settings}
        tone="super"
        title="System-wide Configuration"
        description="Global feature and behavior values managed by Super Admin only."
      />

      <Panel className="p-5">
        <form onSubmit={createConfig} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={configKey}
              onChange={(event) => setConfigKey(event.target.value)}
              placeholder="config key"
              className="h-11 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-fuchsia-300/60"
              required
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="description"
              className="h-11 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-fuchsia-300/60"
            />
            <button
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-400 px-4 font-semibold text-slate-950 transition-colors hover:bg-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader className="h-4 w-4 animate-spin" />}
              Save Config
            </button>
          </div>
          <textarea
            value={configValue}
            onChange={(event) => setConfigValue(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm text-white outline-none focus:border-fuchsia-300/60"
            placeholder='{"key":"value"}'
          />
        </form>
      </Panel>

      {loading ? (
        <LoadingState label="Loading global config..." tone="super" />
      ) : rows.length === 0 ? (
        <EmptyState title="No config values yet" description="Create a config entry above." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Panel key={row.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{row.configKey}</p>
                <p className="text-sm text-slate-400">{row.description || 'No description'}</p>
                <pre className="mt-2 max-h-36 overflow-auto rounded bg-slate-950/70 p-2 text-xs text-slate-300">
                  {JSON.stringify(row.configValue, null, 2)}
                </pre>
                <p className="mt-2 text-xs text-slate-500">
                  Updated by {row.updatedBy || 'N/A'} - {new Date(row.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => toggle(row.id, row.isActive)} disabled={savingId === row.id} className="disabled:opacity-60">
                {savingId === row.id ? (
                  <Loader className="h-4 w-4 animate-spin text-fuchsia-300" />
                ) : (
                  <StatusPill active={row.isActive} activeText="Active" inactiveText="Disabled" />
                )}
              </button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
