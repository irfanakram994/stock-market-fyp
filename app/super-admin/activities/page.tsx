'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { Activity } from 'lucide-react';
import { AdminPageHeader, LoadingState, Panel } from '@/components/Admin/AdminUI';

interface Payload {
  agentActivities: Array<{ id: string; agentName: string; status: string; startedAt: string; user: { email: string; name: string | null } | null }>;
  adminActivities: Array<{ id: string; action: string; createdAt: string; admin: { email: string; name: string | null } }>;
  superAdminActivities: Array<{ id: string; action: string; createdAt: string; superAdmin: { email: string; name: string | null } }>;
}

export default function SuperAdminActivitiesPage() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    superAdminFetch('/api/super-admin/activities')
      .then((res) => res.json())
      .then((data) => data.success && setPayload(data.data));
  }, []);

  if (!payload) return <LoadingState label="Loading activities..." tone="super" />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Activity}
        tone="super"
        title="Activity Monitoring"
        description="Monitor user, admin, and super admin activities."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="p-5">
          <h2 className="text-white font-semibold mb-3">User Activities (Agent Logs)</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {payload.agentActivities.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-fuchsia-300/20 transition-colors">
                <p className="text-sm text-white">{item.agentName} • {item.status}</p>
                <p className="text-xs text-gray-400">{item.user?.email || 'system'} • {new Date(item.startedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-white font-semibold mb-3">Admin Activities</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {payload.adminActivities.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-fuchsia-300/20 transition-colors">
                <p className="text-sm text-white">{item.action}</p>
                <p className="text-xs text-gray-400">{item.admin.email} • {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-white font-semibold mb-3">Super Admin Activities</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {payload.superAdminActivities.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-fuchsia-300/20 transition-colors">
                <p className="text-sm text-white">{item.action}</p>
                <p className="text-xs text-gray-400">{item.superAdmin.email} • {new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
