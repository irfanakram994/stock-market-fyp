'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';

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
  const [rows, setRows] = useState<ModuleRow[]>([]);

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/modules');
    const data = await res.json();
    if (data.success) setRows(data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string, isEnabled: boolean) => {
    await superAdminFetch('/api/super-admin/modules', {
      method: 'PATCH',
      body: JSON.stringify({ id, isEnabled: !isEnabled }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Module Control</h1>
        <p className="text-gray-400">Enable or disable major system modules when required</p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-medium">{row.moduleName}</p>
              <p className="text-gray-400 text-sm">{row.description || row.moduleKey}</p>
              <p className="text-xs text-gray-500 mt-1">Updated by {row.updatedBy || 'N/A'} • {new Date(row.updatedAt).toLocaleString()}</p>
            </div>
            <button onClick={() => toggle(row.id, row.isEnabled)} className={`px-3 py-1 rounded text-xs ${row.isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {row.isEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
