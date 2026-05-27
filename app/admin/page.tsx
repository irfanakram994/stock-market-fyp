'use client';

import { useEffect, useState } from 'react';
import {
    Users,
    TrendingUp,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    BarChart3,
    Loader,
    RefreshCw,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';
import { adminFetch } from '@/lib/adminApi';

interface DashboardStats {
    users: {
        total: number;
        newToday: number;
        newThisWeek: number;
        newThisMonth: number;
    };
    predictions: {
        total: number;
        today: number;
        thisWeek: number;
        avgConfidence: number | string;
    };
    stocks: {
        total: number;
        active: number;
    };
    agents: {
        total: number;
        completed: number;
        failed: number;
        running: number;
        successRate: number;
    };
    backtests: {
        total: number;
    };
    systemHealth: {
        agentStatus: string;
        successRate: number;
        avgConfidence: number | string;
    };
    recentActivity: {
        agentLogs: Array<{
            id: string;
            agentName: string;
            status: string;
            duration: number | null;
            startedAt: string;
        }>;
        predictions: Array<{
            id: string;
            predictedPrice: number;
            confidence: number;
            trend: string;
            createdAt: string;
            stock: { symbol: string; name: string };
        }>;
    };
}

function StatCard({
    title,
    value,
    subValue,
    icon: Icon,
    trend,
    color = 'orange',
}: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'orange' | 'green' | 'red' | 'blue' | 'purple';
}) {
    const colorClasses = {
        orange: 'from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400',
        green: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400',
        red: 'from-red-500/20 to-pink-500/20 border-red-500/30 text-red-400',
        blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
        purple: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-slate-800/50`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                            trend === 'up'
                                ? 'bg-green-500/20 text-green-400'
                                : trend === 'down'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                        }`}
                    >
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
                    </span>
                )}
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subValue && <p className="text-sm text-gray-400 mt-1">{subValue}</p>}
        </div>
    );
}

export default function AdminDashboardPage() {
    const { admin } = useAdminAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await adminFetch('/api/admin/dashboard');
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchStats();
            setLoading(false);
        };
        loadData();
    }, [admin?.email]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Failed to load dashboard data</p>
                <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">System overview and recent activity</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats.users.total}
                    subValue={`+${stats.users.newThisWeek} this week`}
                    icon={Users}
                    color="blue"
                    trend={stats.users.newThisWeek > 0 ? 'up' : 'neutral'}
                />
                <StatCard
                    title="Total Predictions"
                    value={stats.predictions.total}
                    subValue={`${stats.predictions.avgConfidence}% avg confidence`}
                    icon={TrendingUp}
                    color="green"
                    trend="up"
                />
                <StatCard
                    title="Agent Tasks"
                    value={stats.agents.total}
                    subValue={`${stats.agents.successRate}% success rate`}
                    icon={Activity}
                    color="purple"
                    trend={stats.agents.successRate > 80 ? 'up' : 'down'}
                />
                <StatCard
                    title="Active Stocks"
                    value={stats.stocks.active}
                    subValue={`${stats.stocks.total} total stocks`}
                    icon={BarChart3}
                    color="orange"
                />
            </div>

            {/* Agent Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Agent Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-gray-300">Completed</span>
                            </div>
                            <span className="text-white font-semibold">{stats.agents.completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <XCircle className="w-5 h-5 text-red-400" />
                                <span className="text-gray-300">Failed</span>
                            </div>
                            <span className="text-white font-semibold">{stats.agents.failed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Clock className="w-5 h-5 text-yellow-400" />
                                <span className="text-gray-300">Running</span>
                            </div>
                            <span className="text-white font-semibold">{stats.agents.running}</span>
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Agent Status</span>
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                        stats.systemHealth.agentStatus === 'active'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                                >
                                    {stats.systemHealth.agentStatus.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Success Rate</span>
                                <span className="text-white font-semibold">
                                    {stats.systemHealth.successRate}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                    style={{ width: `${stats.systemHealth.successRate}%` }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Avg Confidence</span>
                                <span className="text-white font-semibold">
                                    {stats.systemHealth.avgConfidence}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                                    style={{ width: `${stats.systemHealth.avgConfidence}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                            <span className="text-gray-400">New Users Today</span>
                            <span className="text-white font-semibold">{stats.users.newToday}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                            <span className="text-gray-400">Predictions Today</span>
                            <span className="text-white font-semibold">{stats.predictions.today}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                            <span className="text-gray-400">Total Backtests</span>
                            <span className="text-white font-semibold">{stats.backtests.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Agent Logs */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Agent Activity</h3>
                    <div className="space-y-3">
                        {stats.recentActivity.agentLogs.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No recent activity</p>
                        ) : (
                            stats.recentActivity.agentLogs.slice(0, 5).map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                log.status === 'completed'
                                                    ? 'bg-green-400'
                                                    : log.status === 'failed'
                                                    ? 'bg-red-400'
                                                    : 'bg-yellow-400'
                                            }`}
                                        ></div>
                                        <div>
                                            <p className="text-white text-sm font-medium">
                                                {log.agentName}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {new Date(log.startedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded ${
                                            log.status === 'completed'
                                                ? 'bg-green-500/20 text-green-400'
                                                : log.status === 'failed'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                        }`}
                                    >
                                        {log.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Predictions */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Predictions</h3>
                    <div className="space-y-3">
                        {stats.recentActivity.predictions.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No recent predictions</p>
                        ) : (
                            stats.recentActivity.predictions.slice(0, 5).map((pred) => (
                                <div
                                    key={pred.id}
                                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                pred.trend === 'bullish'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : pred.trend === 'bearish'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                            }`}
                                        >
                                            {pred.stock.symbol.slice(0, 4)}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">
                                                ${pred.predictedPrice.toFixed(2)}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {(pred.confidence * 100).toFixed(0)}% confidence
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded capitalize ${
                                            pred.trend === 'bullish'
                                                ? 'bg-green-500/20 text-green-400'
                                                : pred.trend === 'bearish'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-gray-500/20 text-gray-400'
                                        }`}
                                    >
                                        {pred.trend}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
