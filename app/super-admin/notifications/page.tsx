'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { AdminPageHeader, EmptyState, Panel } from '@/components/Admin/AdminUI';
import { Bell } from 'lucide-react';

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
      <AdminPageHeader
        icon={Bell}
        tone="super"
        title="Global Notification Control"
        description="Control notification behavior across the platform."
      />

      <Panel className="p-5">
        <h2 className="text-white font-semibold mb-3">Notification Settings</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setSettings((prev) => ({ ...prev, email: !prev.email }))} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${settings.email ? 'bg-fuchsia-400 text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>Email</button>
          <button onClick={() => setSettings((prev) => ({ ...prev, inApp: !prev.inApp }))} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${settings.inApp ? 'bg-fuchsia-400 text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>In-App</button>
          <button onClick={() => setSettings((prev) => ({ ...prev, criticalOnly: !prev.criticalOnly }))} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${settings.criticalOnly ? 'bg-fuchsia-400 text-slate-950' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>Critical Only</button>
          <button onClick={saveSettings} className="rounded-lg bg-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-fuchsia-300">Save</button>
        </div>
      </Panel>

      <Panel className="p-3">
        <div className="space-y-2">
        {rows.length === 0 ? (
          <EmptyState title="No notifications found" description="Super admin notifications will appear here." />
        ) : rows.map((row) => (
          <div key={row.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 flex items-start justify-between gap-4 hover:border-fuchsia-300/20 transition-colors">
            <div>
              <p className="text-white font-medium">{row.title}</p>
              <p className="text-gray-400 text-sm">{row.message}</p>
              <p className="text-xs text-gray-500 mt-1">{row.type} • {row.priority} • {new Date(row.createdAt).toLocaleString()}</p>
            </div>
            <button onClick={() => markRead(row.id, row.isRead)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${row.isRead ? 'bg-slate-800 text-gray-300' : 'bg-fuchsia-400/10 text-fuchsia-300 hover:bg-fuchsia-400/15'}`}>
              {row.isRead ? 'Read' : 'Mark Read'}
            </button>
          </div>
        ))}
        </div>
      </Panel>
    </div>
  );
}
