'use client';

import { FormEvent, useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';

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
  const [rows, setRows] = useState<GlobalConfigRow[]>([]);
  const [configKey, setConfigKey] = useState('');
  const [configValue, setConfigValue] = useState('{}');
  const [description, setDescription] = useState('');

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/config');
    const data = await res.json();
    if (data.success) setRows(data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const createConfig = async (e: FormEvent) => {
    e.preventDefault();
    await superAdminFetch('/api/super-admin/config', {
      method: 'POST',
      body: JSON.stringify({ configKey, configValue: JSON.parse(configValue), description }),
    });
    setConfigKey('');
    setConfigValue('{}');
    setDescription('');
    load();
  };

  const toggle = async (id: string, isActive: boolean) => {
    await superAdminFetch('/api/super-admin/config', {
      method: 'PATCH',
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">System-wide Configuration</h1>
        <p className="text-gray-400">Global configuration control managed by Super Admin only</p>
      </div>

      <form onSubmit={createConfig} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={configKey} onChange={(e) => setConfigKey(e.target.value)} placeholder="config key" className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" required />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="description" className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" />
          <button className="px-4 py-2 rounded bg-fuchsia-600 text-white hover:bg-fuchsia-700">Save Config</button>
        </div>
        <textarea value={configValue} onChange={(e) => setConfigValue(e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" placeholder='{"key":"value"}' />
      </form>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-medium">{row.configKey}</p>
              <p className="text-gray-400 text-sm">{row.description || 'No description'}</p>
              <p className="text-xs text-gray-500 mt-1">Updated by {row.updatedBy || 'N/A'} • {new Date(row.updatedAt).toLocaleString()}</p>
            </div>
            <button onClick={() => toggle(row.id, row.isActive)} className={`px-3 py-1 rounded text-xs ${row.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {row.isActive ? 'Active' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
