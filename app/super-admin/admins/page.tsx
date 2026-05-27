'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';

interface AdminRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const load = async () => {
    const res = await superAdminFetch('/api/super-admin/admins');
    const data = await res.json();
    if (data.success) setAdmins(data.data);
  };

  useEffect(() => {
    load();
  }, []);

  const createAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const res = await superAdminFetch('/api/super-admin/admins', {
      method: 'POST',
      body: JSON.stringify({ email, name, password: password || undefined }),
    });
    const data = await res.json();
    if (data.success) {
      setEmail('');
      setName('');
      setPassword('');
      load();
    }
  };

  const toggleAdmin = async (id: string, isActive: boolean) => {
    await superAdminFetch('/api/super-admin/admins', {
      method: 'PATCH',
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    load();
  };

  const removeAdmin = async (id: string) => {
    await superAdminFetch(`/api/super-admin/admins?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Account Management</h1>
        <p className="text-gray-400">Create, update, and remove admin accounts</p>
      </div>

      <form onSubmit={createAdmin} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (optional)" className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white" />
        <button className="px-4 py-2 rounded bg-fuchsia-600 text-white hover:bg-fuchsia-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Admin</button>
      </form>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/70 text-gray-300">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Last Login</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-t border-slate-700/50 text-gray-200">
                <td className="px-4 py-3">{admin.email}</td>
                <td className="px-4 py-3">{admin.name || '-'}</td>
                <td className="px-4 py-3 uppercase">{admin.role}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAdmin(admin.id, admin.isActive)} className={`px-2 py-1 rounded text-xs ${admin.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeAdmin(admin.id)} className="text-red-300 hover:text-red-200"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
