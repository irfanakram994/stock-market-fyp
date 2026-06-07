'use client';

import { useEffect, useState } from 'react';
import { Loader, Save, SlidersHorizontal } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, StatusPill } from '@/components/Admin/AdminUI';

interface Threshold {
  id: string;
  name: string;
  category: string;
  value: number;
  minValue: number | null;
  maxValue: number | null;
  isActive: boolean;
  description: string | null;
}

type Draft = Pick<Threshold, 'value' | 'minValue' | 'maxValue' | 'description'>;

export default function SuperAdminThresholdsPage() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<Threshold[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await superAdminFetch('/api/super-admin/thresholds');
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
        setDrafts(
          Object.fromEntries(
            data.data.map((row: Threshold) => [
              row.id,
              {
                value: row.value,
                minValue: row.minValue,
                maxValue: row.maxValue,
                description: row.description,
              },
            ])
          )
        );
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load threshold policies.' });
      }
    } catch (error) {
      console.error('Error loading thresholds:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load threshold policies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateDraft = (id: string, key: keyof Draft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: key === 'description' ? value : value === '' ? null : Number(value),
      },
    }));
  };

  const save = async (row: Threshold, activeOverride?: boolean) => {
    const draft = drafts[row.id] || row;
    const minValue = draft.minValue;
    const maxValue = draft.maxValue;

    if (!Number.isFinite(Number(draft.value))) {
      showSnackbar({ variant: 'warning', message: 'Threshold value must be a valid number.' });
      return;
    }

    if (minValue != null && maxValue != null && minValue > maxValue) {
      showSnackbar({ variant: 'warning', message: 'Minimum value cannot be greater than maximum value.' });
      return;
    }

    if (minValue != null && Number(draft.value) < minValue) {
      showSnackbar({ variant: 'warning', message: 'Threshold value cannot be below the minimum value.' });
      return;
    }

    if (maxValue != null && Number(draft.value) > maxValue) {
      showSnackbar({ variant: 'warning', message: 'Threshold value cannot be above the maximum value.' });
      return;
    }

    setSavingId(row.id);
    try {
      const res = await superAdminFetch('/api/super-admin/thresholds', {
        method: 'PATCH',
        body: JSON.stringify({
          id: row.id,
          value: Number(draft.value),
          minValue,
          maxValue,
          description: draft.description,
          ...(activeOverride !== undefined ? { isActive: activeOverride } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: 'Threshold policy updated successfully.' });
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to update threshold.' });
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
      showSnackbar({ variant: 'error', message: 'Failed to update threshold.' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={SlidersHorizontal}
        title="Threshold Policies"
        description="Tune system thresholds used for confidence, performance, error-rate, and risk alerts."
      />

      {loading ? (
        <LoadingState label="Loading threshold policies..." />
      ) : rows.length === 0 ? (
        <EmptyState title="No threshold policies found" description="Default threshold policies will be created automatically." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((row) => {
            const draft = drafts[row.id] || row;
            const saving = savingId === row.id;
            return (
              <Panel key={row.id} className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{row.name}</h3>
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs uppercase text-slate-400">{row.category}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{row.description || 'No description'}</p>
                  </div>
                  <button onClick={() => save(row, !row.isActive)} disabled={saving} className="disabled:opacity-60">
                    {saving ? <Loader className="h-4 w-4 animate-spin text-cyan-300" /> : <StatusPill active={row.isActive} activeText="Enabled" inactiveText="Disabled" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-sm text-slate-400">
                    Value
                    <input type="number" value={draft.value ?? ''} onChange={(event) => updateDraft(row.id, 'value', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-cyan-400/60" />
                  </label>
                  <label className="text-sm text-slate-400">
                    Min
                    <input type="number" value={draft.minValue ?? ''} onChange={(event) => updateDraft(row.id, 'minValue', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-cyan-400/60" />
                  </label>
                  <label className="text-sm text-slate-400">
                    Max
                    <input type="number" value={draft.maxValue ?? ''} onChange={(event) => updateDraft(row.id, 'maxValue', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-cyan-400/60" />
                  </label>
                </div>

                <label className="mt-3 block text-sm text-slate-400">
                  Description
                  <textarea value={draft.description || ''} onChange={(event) => updateDraft(row.id, 'description', event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-white outline-none focus:border-cyan-400/60" />
                </label>

                <div className="mt-4 flex justify-end">
                  <button onClick={() => save(row)} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Policy
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
