'use client';

import { useEffect, useState } from 'react';
import {
    Bell,
    AlertTriangle,
    Info,
    CheckCircle,
    AlertCircle,
    Trash2,
    Loader,
    Check,
    Filter,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    category: string;
    isRead: boolean;
    priority: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    admin: {
        name: string | null;
        email: string;
    } | null;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        type: '',
        category: '',
        priority: '',
        isRead: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newNotification, setNewNotification] = useState({
        type: 'info',
        title: '',
        message: '',
        category: 'system',
        priority: 'normal',
    });

    const fetchNotifications = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });

            if (filters.type) params.append('type', filters.type);
            if (filters.category) params.append('category', filters.category);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.isRead) params.append('isRead', filters.isRead);

            const res = await adminFetch(`/api/admin/notifications?${params}`);
            const data = await res.json();

            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.unreadCount);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (ids: string[]) => {
        try {
            await adminFetch('/api/admin/notifications', {
                method: 'PATCH',
                body: JSON.stringify({ notificationIds: ids }),
            });
            fetchNotifications(pagination.page);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await adminFetch('/api/admin/notifications', {
                method: 'PATCH',
                body: JSON.stringify({ markAllRead: true }),
            });
            fetchNotifications(pagination.page);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await adminFetch(`/api/admin/notifications?id=${id}`, {
                method: 'DELETE',
            });
            fetchNotifications(pagination.page);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleDeleteAllRead = async () => {
        if (!confirm('Delete all read notifications?')) return;
        try {
            await adminFetch('/api/admin/notifications?deleteRead=true', {
                method: 'DELETE',
            });
            fetchNotifications(1);
        } catch (error) {
            console.error('Error deleting notifications:', error);
        }
    };

    const handleCreateNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await adminFetch('/api/admin/notifications', {
                method: 'POST',
                body: JSON.stringify(newNotification),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateModal(false);
                setNewNotification({
                    type: 'info',
                    title: '',
                    message: '',
                    category: 'system',
                    priority: 'normal',
                });
                fetchNotifications(1);
            }
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    };

    const handleApplyFilters = () => {
        fetchNotifications(1);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'alert':
                return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-400" />;
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            default:
                return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'alert':
                return 'bg-red-500/20 border-red-500/30';
            case 'warning':
                return 'bg-yellow-500/20 border-yellow-500/30';
            case 'success':
                return 'bg-green-500/20 border-green-500/30';
            default:
                return 'bg-blue-500/20 border-blue-500/30';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-500 text-white';
            case 'high':
                return 'bg-orange-500 text-white';
            case 'normal':
                return 'bg-gray-500 text-white';
            default:
                return 'bg-slate-600 text-gray-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
                    <p className="text-gray-400">System alerts and notifications</p>
                </div>
                <div className="flex items-center space-x-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            <span>Mark All Read ({unreadCount})</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create</span>
                    </button>
                </div>
            </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            >
                                <option value="">All</option>
                                <option value="alert">Alert</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="success">Success</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) =>
                                    setFilters({ ...filters, category: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            >
                                <option value="">All</option>
                                <option value="system">System</option>
                                <option value="user">User</option>
                                <option value="prediction">Prediction</option>
                                <option value="performance">Performance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Priority</label>
                            <select
                                value={filters.priority}
                                onChange={(e) =>
                                    setFilters({ ...filters, priority: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            >
                                <option value="">All</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Status</label>
                            <select
                                value={filters.isRead}
                                onChange={(e) =>
                                    setFilters({ ...filters, isRead: e.target.value })
                                }
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                            >
                                <option value="">All</option>
                                <option value="false">Unread</option>
                                <option value="true">Read</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleApplyFilters}
                                className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No notifications</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-xl border transition-all ${
                                notification.isRead
                                    ? 'bg-slate-800/30 border-slate-700/30'
                                    : `${getTypeColor(notification.type)}`
                            }`}
                        >
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 mt-1">
                                    {getTypeIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3
                                            className={`font-semibold ${
                                                notification.isRead
                                                    ? 'text-gray-400'
                                                    : 'text-white'
                                            }`}
                                        >
                                            {notification.title}
                                        </h3>
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs ${getPriorityBadge(
                                                notification.priority
                                            )}`}
                                        >
                                            {notification.priority}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-gray-400">
                                            {notification.category}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{notification.message}</p>
                                    <p className="text-gray-500 text-xs mt-2">
                                        {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => handleMarkAsRead([notification.id])}
                                            className="p-2 rounded-lg hover:bg-slate-700/50 text-gray-400 hover:text-green-400 transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notification.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleDeleteAllRead}
                        className="text-gray-400 hover:text-red-400 text-sm"
                    >
                        Delete all read notifications
                    </button>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => fetchNotifications(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="p-2 rounded-lg bg-slate-700/50 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-gray-300 px-4">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => fetchNotifications(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-2 rounded-lg bg-slate-700/50 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Create Notification</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNotification} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newNotification.title}
                                    onChange={(e) =>
                                        setNewNotification({
                                            ...newNotification,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Message</label>
                                <textarea
                                    value={newNotification.message}
                                    onChange={(e) =>
                                        setNewNotification({
                                            ...newNotification,
                                            message: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white resize-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select
                                        value={newNotification.type}
                                        onChange={(e) =>
                                            setNewNotification({
                                                ...newNotification,
                                                type: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                                    >
                                        <option value="info">Info</option>
                                        <option value="success">Success</option>
                                        <option value="warning">Warning</option>
                                        <option value="alert">Alert</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={newNotification.category}
                                        onChange={(e) =>
                                            setNewNotification({
                                                ...newNotification,
                                                category: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                                    >
                                        <option value="system">System</option>
                                        <option value="user">User</option>
                                        <option value="prediction">Prediction</option>
                                        <option value="performance">Performance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={newNotification.priority}
                                        onChange={(e) =>
                                            setNewNotification({
                                                ...newNotification,
                                                priority: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white"
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
