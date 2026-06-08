'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Loader,
  Mail,
  Calendar,
  BarChart3,
  Activity,
  Eye,
  UserX,
  UserCheck,
} from 'lucide-react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { useSnackbar } from '@/components/SnackbarProvider';
import { AdminPageHeader, EmptyState, LoadingState, Panel, SearchInput, StatusPill } from '@/components/Admin/AdminUI';

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  blockedReason: string | null;
  _count: {
    stocks: number;
    agentLogs: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SuperAdminUsersPage() {
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const res = await superAdminFetch(`/api/super-admin/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
        setPagination(data.pagination);
      } else {
        showSnackbar({ variant: 'error', message: data.error || 'Failed to load platform users.' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar({ variant: 'error', message: 'Failed to load platform users.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, search);
  };

  const handleUserAction = async (user: User) => {
    const action = user.isBlocked ? 'unblock' : 'block';
    const previousUsers = users;
    setSavingUserId(user.id);
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? {
              ...item,
              isBlocked: !user.isBlocked,
              blockedReason: user.isBlocked ? null : 'Account blocked by Super Admin.',
            }
          : item
      )
    );

    try {
      const res = await superAdminFetch('/api/super-admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = await res.json();
      if (data.success) {
        showSnackbar({ variant: 'success', message: data.message || `User ${action}ed successfully.` });
        await fetchUsers(pagination.page, search);
      } else {
        setUsers(previousUsers);
        showSnackbar({ variant: 'error', message: data.error || `Failed to ${action} user.` });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setUsers(previousUsers);
      showSnackbar({ variant: 'error', message: `Failed to ${action} user.` });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Users}
        tone="super"
        title="Platform Users"
        description="View and control registered user accounts separately from admin accounts."
        actions={
        <div className="flex items-center space-x-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
          <Users className="w-5 h-5 text-fuchsia-300" />
          <span className="text-white font-semibold">{pagination.total}</span>
          <span className="text-gray-400">total users</span>
        </div>
        }
      />

      <form onSubmit={handleSearch} className="flex items-center space-x-4">
        <SearchInput tone="super" value={search} onChange={setSearch} placeholder="Search by email or name..." />
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-fuchsia-400 to-violet-400 text-slate-950 font-semibold rounded-lg hover:from-fuchsia-300 hover:to-violet-300 transition-all"
        >
          Search
        </button>
      </form>

      <Panel className="overflow-hidden">
        {loading ? (
          <LoadingState label="Loading users..." tone="super" />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search term." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Joined</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Stocks</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Agent Tasks</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-fuchsia-400 to-violet-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name || 'Unnamed User'}</p>
                        <p className="text-gray-400 text-sm flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium">{user._count.stocks}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Activity className="w-4 h-4 text-fuchsia-300" />
                      <span className="text-white font-medium">{user._count.agentLogs}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusPill active={!user.isBlocked} activeText="Active" inactiveText="Blocked" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 rounded-lg hover:bg-slate-600/50 text-gray-400 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction(user)}
                        disabled={savingUserId === user.id}
                        className={`p-2 rounded-lg text-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${user.isBlocked ? 'hover:bg-green-500/20 hover:text-green-400' : 'hover:bg-red-500/20 hover:text-red-400'}`}
                        title={user.isBlocked ? 'Unblock User' : 'Block User'}
                      >
                        {savingUserId === user.id ? <Loader className="w-4 h-4 animate-spin" /> : user.isBlocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-t border-slate-700/50">
            <p className="text-gray-400 text-sm">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg bg-slate-700/50 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-300 px-4">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg bg-slate-700/50 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </Panel>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">×</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-fuchsia-400 to-violet-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white text-xl font-semibold">{selectedUser.name || 'Unnamed User'}</p>
                  <p className="text-gray-400">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Joined</p>
                  <p className="text-white font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Last Updated</p>
                  <p className="text-white font-semibold">{new Date(selectedUser.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Stocks Tracked</p>
                  <p className="text-white font-semibold">{selectedUser._count.stocks}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Agent Tasks</p>
                  <p className="text-white font-semibold">{selectedUser._count.agentLogs}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Status</p>
                  <div className="mt-1">
                    <StatusPill active={!selectedUser.isBlocked} activeText="Active" inactiveText="Blocked" />
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Block Reason</p>
                  <p className="text-white font-semibold">{selectedUser.blockedReason || '-'}</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    handleUserAction(selectedUser);
                    setSelectedUser(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-colors ${selectedUser.isBlocked ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'}`}
                >
                  {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
