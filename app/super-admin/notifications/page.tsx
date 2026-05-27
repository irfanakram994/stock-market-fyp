'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export default function SuperAdminNotificationsPage() {
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<{ email: boolean; inApp: boolean; criticalOnly: boolean }>({
    email: true,
    inApp: true,
    criticalOnly: false,
  });

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/notifications');
    const data = await res.json();
    if (data.success) {
      setRows(data.data);
      setSettings(data.settings);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string, isRead: boolean) => {
    await superAdminFetch('/api/super-admin/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id, isRead: !isRead }),
    });
    load();
  };

  const saveSettings = async () => {
    await superAdminFetch('/api/super-admin/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Global Notification Control</h1>
        <p className="text-gray-400">Control notification behavior across the platform</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">Notification Settings</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setSettings((prev) => ({ ...prev, email: !prev.email }))} className={`px-3 py-2 rounded ${settings.email ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-gray-300'}`}>Email</button>
          <button onClick={() => setSettings((prev) => ({ ...prev, inApp: !prev.inApp }))} className={`px-3 py-2 rounded ${settings.inApp ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-gray-300'}`}>In-App</button>
          <button onClick={() => setSettings((prev) => ({ ...prev, criticalOnly: !prev.criticalOnly }))} className={`px-3 py-2 rounded ${settings.criticalOnly ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-gray-300'}`}>Critical Only</button>
          <button onClick={saveSettings} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">Save</button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-start justify-between gap-4">
            <div>
              <p className="text-white font-medium">{row.title}</p>
              <p className="text-gray-400 text-sm">{row.message}</p>
              <p className="text-xs text-gray-500 mt-1">{row.type} • {row.priority} • {new Date(row.createdAt).toLocaleString()}</p>
            </div>
            <button onClick={() => markRead(row.id, row.isRead)} className={`px-3 py-1 rounded text-xs ${row.isRead ? 'bg-slate-700 text-gray-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
              {row.isRead ? 'Read' : 'Mark Read'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
