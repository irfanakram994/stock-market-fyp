'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Users,
    Activity,
    Calendar,
    Loader,
    RefreshCw,
    PieChart,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';

interface AnalyticsData {
    timeRange: {
        start: string;
        end: string;
        days: number;
    };
    userGrowth: {
        dailyRegistrations: Array<{
            date: string;
            count: number;
        }>;
    };
    predictionAnalytics: {
        dailyPredictions: Array<{
            date: string;
            count: number;
            avgConfidence: number | null;
        }>;
        trendDistribution: Record<string, number>;
        confidenceDistribution: {
            low: number;
            medium: number;
            high: number;
            veryHigh: number;
        };
    };
    agentAnalytics: {
        dailyStats: Record<
            string,
            {
                total: number;
                completed: number;
                failed: number;
                avgDuration: number;
            }
        >;
        typeDistribution: Record<string, number>;
    };
    stockAnalytics: {
        sectorDistribution: Record<string, number>;
    };
    backtestAnalytics: {
        total: number;
        avgReturn: string | null;
        avgSharpeRatio: string | null;
        avgWinRate: string | null;
        avgMaxDrawdown: string | null;
    };
}

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'from-teal-400/10 to-emerald-400/10 border-teal-300/25 text-teal-300',
        green: 'from-emerald-400/10 to-teal-400/10 border-emerald-300/25 text-emerald-300',
        purple: 'from-lime-300/10 to-emerald-400/10 border-lime-300/25 text-lime-200',
        mint: 'from-emerald-400/10 to-teal-400/10 border-emerald-300/25 text-emerald-300',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-3">
                <Icon className="w-8 h-8" />
            </div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
    );
}

function DistributionBar({
    label,
    value,
    total,
    color,
}: {
    label: string;
    value: number;
    total: number;
    color: string;
}) {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">
                    {value} ({percentage.toFixed(1)}%)
                </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await adminFetch(`/api/admin/analytics?days=${days}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    }, [days]);

    const loadData = useCallback(async () => {
        setLoading(true);
        await fetchAnalytics();
        setLoading(false);
    }, [fetchAnalytics]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAnalytics();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin text-emerald-300" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Failed to load analytics</p>
                <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-emerald-400 text-slate-950 rounded-lg hover:bg-emerald-300"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Calculate totals
    const totalTrends = Object.values(analytics.predictionAnalytics.trendDistribution).reduce(
        (a, b) => a + b,
        0
    );
    const totalAgentTypes = Object.values(analytics.agentAnalytics.typeDistribution).reduce(
        (a, b) => a + b,
        0
    );
    const totalSectors = Object.values(analytics.stockAnalytics.sectorDistribution).reduce(
        (a, b) => a + b,
        0
    );
    const totalConfidence =
        analytics.predictionAnalytics.confidenceDistribution.low +
        analytics.predictionAnalytics.confidenceDistribution.medium +
        analytics.predictionAnalytics.confidenceDistribution.high +
        analytics.predictionAnalytics.confidenceDistribution.veryHigh;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">System Analytics</h1>
                    <p className="text-gray-400">
                        Data from {new Date(analytics.timeRange.start).toLocaleDateString()} to{' '}
                        {new Date(analytics.timeRange.end).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Backtest Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Backtests"
                    value={analytics.backtestAnalytics.total}
                    icon={BarChart3}
                    color="blue"
                />
                <StatCard
                    title="Avg Return"
                    value={
                        analytics.backtestAnalytics.avgReturn
                            ? `${analytics.backtestAnalytics.avgReturn}%`
                            : 'N/A'
                    }
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Avg Win Rate"
                    value={
                        analytics.backtestAnalytics.avgWinRate
                            ? `${analytics.backtestAnalytics.avgWinRate}%`
                            : 'N/A'
                    }
                    icon={Activity}
                    color="purple"
                />
                <StatCard
                    title="Avg Sharpe Ratio"
                    value={analytics.backtestAnalytics.avgSharpeRatio || 'N/A'}
                    icon={PieChart}
                    color="mint"
                />
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Distribution */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span>Prediction Trend Distribution</span>
                    </h3>
                    <div className="space-y-4">
                        <DistributionBar
                            label="Bullish"
                            value={analytics.predictionAnalytics.trendDistribution.bullish || 0}
                            total={totalTrends}
                            color="bg-green-500"
                        />
                        <DistributionBar
                            label="Bearish"
                            value={analytics.predictionAnalytics.trendDistribution.bearish || 0}
                            total={totalTrends}
                            color="bg-red-500"
                        />
                        <DistributionBar
                            label="Neutral"
                            value={analytics.predictionAnalytics.trendDistribution.neutral || 0}
                            total={totalTrends}
                            color="bg-gray-500"
                        />
                    </div>
                </div>

                {/* Confidence Distribution */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-emerald-300" />
                        <span>Confidence Distribution</span>
                    </h3>
                    <div className="space-y-4">
                        <DistributionBar
                            label="Very High (75-100%)"
                            value={analytics.predictionAnalytics.confidenceDistribution.veryHigh}
                            total={totalConfidence}
                            color="bg-green-500"
                        />
                        <DistributionBar
                            label="High (50-75%)"
                            value={analytics.predictionAnalytics.confidenceDistribution.high}
                            total={totalConfidence}
                            color="bg-teal-400"
                        />
                        <DistributionBar
                            label="Medium (25-50%)"
                            value={analytics.predictionAnalytics.confidenceDistribution.medium}
                            total={totalConfidence}
                            color="bg-lime-300"
                        />
                        <DistributionBar
                            label="Low (0-25%)"
                            value={analytics.predictionAnalytics.confidenceDistribution.low}
                            total={totalConfidence}
                            color="bg-red-500"
                        />
                    </div>
                </div>

                {/* Agent Type Distribution */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-emerald-300" />
                        <span>Agent Type Distribution</span>
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(analytics.agentAnalytics.typeDistribution).length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No agent data</p>
                        ) : (
                            Object.entries(analytics.agentAnalytics.typeDistribution)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([agent, count], index) => (
                                    <DistributionBar
                                        key={agent}
                                        label={agent}
                                        value={count}
                                        total={totalAgentTypes}
                                        color={
                                            [
                                                'bg-emerald-400',
                                                'bg-teal-400',
                                                'bg-emerald-300',
                                                'bg-green-500',
                                                'bg-lime-300',
                                                'bg-emerald-400',
                                            ][index % 6]
                                        }
                                    />
                                ))
                        )}
                    </div>
                </div>

                {/* Stock Sector Distribution */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <PieChart className="w-5 h-5 text-emerald-300" />
                        <span>Stock Sector Distribution</span>
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(analytics.stockAnalytics.sectorDistribution).length ===
                        0 ? (
                            <p className="text-gray-500 text-center py-4">No sector data</p>
                        ) : (
                            Object.entries(analytics.stockAnalytics.sectorDistribution)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([sector, count], index) => (
                                    <DistributionBar
                                        key={sector}
                                        label={sector}
                                        value={count}
                                        total={totalSectors}
                                        color={
                                            [
                                                'bg-emerald-400',
                                                'bg-red-500',
                                                'bg-pink-500',
                                                'bg-emerald-400',
                                                'bg-indigo-500',
                                                'bg-teal-400',
                                            ][index % 6]
                                        }
                                    />
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* Daily Activity Summary */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-emerald-300" />
                    <span>Agent Daily Performance</span>
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">
                                    Date
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                                    Total
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                                    Completed
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                                    Failed
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">
                                    Success Rate
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                                    Avg Duration
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(analytics.agentAnalytics.dailyStats).length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No daily data available
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(analytics.agentAnalytics.dailyStats)
                                    .sort((a, b) => b[0].localeCompare(a[0]))
                                    .slice(0, 10)
                                    .map(([date, stats]) => {
                                        const successRate =
                                            stats.completed + stats.failed > 0
                                                ? (
                                                      (stats.completed /
                                                          (stats.completed + stats.failed)) *
                                                      100
                                                  ).toFixed(1)
                                                : '0';
                                        return (
                                            <tr
                                                key={date}
                                                className="border-b border-slate-700/30 hover:bg-slate-700/20"
                                            >
                                                <td className="px-4 py-3 text-white">{date}</td>
                                                <td className="px-4 py-3 text-center text-white">
                                                    {stats.total}
                                                </td>
                                                <td className="px-4 py-3 text-center text-green-400">
                                                    {stats.completed}
                                                </td>
                                                <td className="px-4 py-3 text-center text-red-400">
                                                    {stats.failed}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs ${
                                                            parseFloat(successRate) >= 80
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : parseFloat(successRate) >= 50
                                                                ? 'bg-lime-300/10 text-lime-200'
                                                                : 'bg-red-500/20 text-red-400'
                                                        }`}
                                                    >
                                                        {successRate}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400">
                                                    {stats.avgDuration > 0
                                                        ? `${(stats.avgDuration / 1000).toFixed(
                                                              2
                                                          )}s`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
