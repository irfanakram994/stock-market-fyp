'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader,
    Filter,
    Calendar,
    User,
    Activity,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';

interface AuditLog {
    id: string;
    adminId: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
    admin: {
        name: string | null;
        email: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface Summary {
    topActions: Array<{ action: string; count: number }>;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });
    const [summary, setSummary] = useState<Summary | null>(null);
    const [filters, setFilters] = useState({
        action: '',
        targetType: '',
        adminId: '',
        startDate: '',
        endDate: '',
    });
    const filtersRef = useRef(filters);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
            });

            const activeFilters = filtersRef.current;
            if (activeFilters.action) params.append('action', activeFilters.action);
            if (activeFilters.targetType) params.append('targetType', activeFilters.targetType);
            if (activeFilters.adminId) params.append('adminId', activeFilters.adminId);
            if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
            if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

            const res = await adminFetch(`/api/admin/audit-logs?${params}`);
            const data = await res.json();

            if (data.success) {
                setLogs(data.data);
                setPagination(data.pagination);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs(1);
    };

    const handlePageChange = (newPage: number) => {
        fetchLogs(newPage);
    };

    const getActionColor = (action: string) => {
        if (action.includes('delete')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (action.includes('create')) return 'bg-green-500/20 text-green-400 border-green-500/30';
        if (action.includes('update') || action.includes('edit'))
            return 'bg-teal-400/10 text-teal-200 border-teal-300/25';
        if (action.includes('signin') || action.includes('signout'))
            return 'bg-emerald-400/10 text-emerald-200 border-emerald-300/25';
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const formatAction = (action: string) => {
        return action
            .replace(/_/g, ' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
                    <p className="text-gray-400">Track all administrative actions</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2">
                    <FileText className="w-5 h-5 text-emerald-300" />
                    <span className="text-white font-semibold">{pagination.total}</span>
                    <span className="text-gray-400">total logs</span>
                </div>
            </div>

            {/* Top Actions Summary */}
            {summary && summary.topActions.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4">TOP ACTIONS</h3>
                    <div className="flex flex-wrap gap-3">
                        {summary.topActions.map((item) => (
                            <div
                                key={item.action}
                                className="flex items-center space-x-2 bg-slate-700/50 rounded-lg px-3 py-2"
                            >
                                <span className="text-white text-sm">
                                    {formatAction(item.action)}
                                </span>
                                <span className="bg-emerald-400/20 text-emerald-300 text-xs px-2 py-0.5 rounded">
                                    {item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Filter className="w-5 h-5" />
                    <span>Filters</span>
                </button>

                {showFilters && (
                    <form
                        onSubmit={handleApplyFilters}
                        className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4"
                    >
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Action</label>
                            <input
                                type="text"
                                value={filters.action}
                                onChange={(e) =>
                                    setFilters({ ...filters, action: e.target.value })
                                }
                                placeholder="e.g., signin"
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Target Type</label>
                            <select
                                value={filters.targetType}
                                onChange={(e) =>
                                    setFilters({ ...filters, targetType: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            >
                                <option value="">All</option>
                                <option value="user">User</option>
                                <option value="threshold">Threshold</option>
                                <option value="notification">Notification</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex items-end md:col-span-2">
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-semibold rounded-lg"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-emerald-300" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No audit logs found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/30">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="p-4 hover:bg-slate-700/20 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0 mt-1">
                                            <Activity className="w-5 h-5 text-emerald-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(
                                                        log.action
                                                    )}`}
                                                >
                                                    {formatAction(log.action)}
                                                </span>
                                                {log.targetType && (
                                                    <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-gray-400">
                                                        {log.targetType}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                                                <span className="flex items-center space-x-1">
                                                    <User className="w-3 h-3" />
                                                    <span>
                                                        {log.admin.name || log.admin.email}
                                                    </span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </span>
                                                </span>
                                                {log.ipAddress && (
                                                    <span className="text-gray-500">
                                                        IP: {log.ipAddress}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {log.details &&
                                        Object.keys(log.details as object).length > 0 && (
                                            <button
                                                onClick={() =>
                                                    setExpandedLog(
                                                        expandedLog === log.id ? null : log.id
                                                    )
                                                }
                                                className="text-gray-400 hover:text-white text-sm"
                                            >
                                                {expandedLog === log.id
                                                    ? 'Hide Details'
                                                    : 'View Details'}
                                            </button>
                                        )}
                                </div>

                                {expandedLog === log.id && log.details && (
                                    <div className="mt-3 ml-9 p-3 bg-slate-900/50 rounded-lg">
                                        <pre className="text-xs text-gray-400 overflow-x-auto">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-t border-slate-700/50">
                        <p className="text-gray-400 text-sm">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                            {pagination.total} logs
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 rounded-lg bg-slate-700/50 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-gray-300 px-4">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
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
            </div>
        </div>
    );
}
