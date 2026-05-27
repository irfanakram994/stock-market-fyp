'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';

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

export default function SuperAdminThresholdsPage() {
  const [rows, setRows] = useState<Threshold[]>([]);

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/thresholds');
    const data = await res.json();
    if (data.success) setRows(data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string, isActive: boolean) => {
    await superAdminFetch('/api/super-admin/thresholds', {
      method: 'PATCH',
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Threshold Policies</h1>
        <p className="text-gray-400">System-wide threshold policy management</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{row.name}</h3>
              <span className="text-xs px-2 py-1 rounded bg-slate-700 text-gray-300 uppercase">{row.category}</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{row.description || 'No description'}</p>
            <p className="text-gray-200 mt-3">Value: <span className="font-semibold">{row.value}</span></p>
            <p className="text-xs text-gray-500">Range: {row.minValue ?? '-'} to {row.maxValue ?? '-'}</p>
            <button onClick={() => toggle(row.id, row.isActive)} className={`mt-3 px-3 py-1 rounded text-xs ${row.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {row.isActive ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
