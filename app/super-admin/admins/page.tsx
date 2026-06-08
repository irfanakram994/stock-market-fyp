'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, StatusPill } from '@/components/Admin/AdminUI';

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
  const { showSnackbar } = useSnackbar();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const load = async () => {
    try {
      const res = await superAdminFetch('/api/super-admin/admins');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data);
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load admin accounts.' });
      }
    } catch (error) {
      console.error('Error loading admins:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load admin accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 8) {
      showSnackbar({ variant: 'warning', message: 'Password is mandatory and must be at least 8 characters.' });
      return;
    }

    setSaving(true);
    try {
      const res = await superAdminFetch('/api/super-admin/admins', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: 'Admin account created successfully.' });
        setEmail('');
        setName('');
        setPassword('');
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to create admin account.' });
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      showSnackbar({ variant: 'error', message: 'Failed to create admin account.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAdmin = async (id: string, isActive: boolean) => {
    setSavingId(id);
    try {
      const res = await superAdminFetch('/api/super-admin/admins', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: `Admin ${isActive ? 'deactivated' : 'activated'} successfully.` });
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to update admin account.' });
      }
    } catch (error) {
      console.error('Error toggling admin:', error);
      showSnackbar({ variant: 'error', message: 'Failed to update admin account.' });
    } finally {
      setSavingId(null);
    }
  };

  const removeAdmin = async (id: string) => {
    const admin = admins.find((item) => item.id === id);
    if (!window.confirm(`Delete ${admin?.email || 'this admin'}? This removes admin panel access.`)) return;

    setSavingId(id);
    try {
      const res = await superAdminFetch(`/api/super-admin/admins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: 'Admin account deleted successfully.' });
        await load();
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to delete admin account.' });
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      showSnackbar({ variant: 'error', message: 'Failed to delete admin account.' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ShieldCheck}
        tone="super"
        title="Admin Account Management"
        description="Create, activate, deactivate, and remove admin accounts with full audit visibility."
      />

      <Panel className="p-5">
        <form onSubmit={createAdmin} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" type="email" className="h-11 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-fuchsia-300/60" required />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="h-11 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-fuchsia-300/60" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password required" type="password" minLength={8} className="h-11 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none focus:border-fuchsia-300/60" required />
          <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-400 px-4 font-semibold text-slate-950 transition-colors hover:bg-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Admin
          </button>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        {loading ? (
          <LoadingState label="Loading admin accounts..." tone="super" />
        ) : admins.length === 0 ? (
          <EmptyState title="No admin accounts found" description="Create an admin account using the form above." />
        ) : (
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
                  <button onClick={() => toggleAdmin(admin.id, admin.isActive)} disabled={savingId === admin.id} className="disabled:cursor-not-allowed disabled:opacity-60">
                    {savingId === admin.id ? <Loader className="w-4 h-4 animate-spin text-fuchsia-300" /> : <StatusPill active={admin.isActive} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-400">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeAdmin(admin.id)} disabled={savingId === admin.id} className="rounded-lg p-2 text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60" title="Delete admin">
                    {savingId === admin.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Panel>
    </div>
  );
}
