'use client';

import { useEffect, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronLeft,
    ChevronRight,
    Loader,
    Calendar,
    Filter,
} from 'lucide-react';
import { adminFetch } from '@/lib/adminApi';
import StockSymbolCombobox from '@/components/StockSymbolCombobox';

interface Prediction {
    id: string;
    stockId: string;
    predictionDate: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend: string | null;
    modelVersion: string;
    llmSummary: string | null;
    createdAt: string;
    stock: {
        symbol: string;
        name: string;
        sector: string | null;
    };
}

interface Stats {
    avgConfidence: number | string;
    avgPredictedPrice: number | string;
    trendDistribution: Record<string, number>;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        symbol: '',
        trend: '',
        startDate: '',
        endDate: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchPredictions = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });

            if (filters.symbol) params.append('symbol', filters.symbol);
            if (filters.trend) params.append('trend', filters.trend);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await adminFetch(`/api/admin/predictions?${params}`);
            const data = await res.json();

            if (data.success) {
                setPredictions(data.data);
                setStats(data.stats);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching predictions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPredictions();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPredictions(1);
    };

    const handlePageChange = (newPage: number) => {
        fetchPredictions(newPage);
    };

    const getTrendIcon = (trend: string | null) => {
        switch (trend) {
            case 'bullish':
                return <TrendingUp className="w-5 h-5 text-green-400" />;
            case 'bearish':
                return <TrendingDown className="w-5 h-5 text-red-400" />;
            default:
                return <Minus className="w-5 h-5 text-gray-400" />;
        }
    };

    const getTrendColor = (trend: string | null) => {
        switch (trend) {
            case 'bullish':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'bearish':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Prediction Monitoring</h1>
                    <p className="text-gray-400">Monitor and analyze AI predictions</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Total Predictions</p>
                        <p className="text-2xl font-bold text-white">{pagination.total}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Avg Confidence</p>
                        <p className="text-2xl font-bold text-green-400">{stats.avgConfidence}%</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Bullish Predictions</p>
                        <p className="text-2xl font-bold text-green-400">
                            {stats.trendDistribution.bullish || 0}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Bearish Predictions</p>
                        <p className="text-2xl font-bold text-red-400">
                            {stats.trendDistribution.bearish || 0}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                        <span>Filters</span>
                    </button>
                </div>

                {showFilters && (
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Stock Symbol</label>
                            <StockSymbolCombobox
                                value={filters.symbol}
                                onChange={(symbol) => setFilters({ ...filters, symbol })}
                                allowEmpty
                                emptyLabel="All stocks"
                                placeholder="All stocks"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Trend</label>
                            <select
                                value={filters.trend}
                                onChange={(e) => setFilters({ ...filters, trend: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            >
                                <option value="">All</option>
                                <option value="bullish">Bullish</option>
                                <option value="bearish">Bearish</option>
                                <option value="neutral">Neutral</option>
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
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
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
                                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Predictions Table */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : predictions.length === 0 ? (
                    <div className="text-center py-12">
                        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No predictions found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700/50">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                                    Stock
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                                    Predicted Price
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">
                                    Confidence
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">
                                    Trend
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                                    Range
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {predictions.map((pred) => (
                                <tr
                                    key={pred.id}
                                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getTrendColor(
                                                    pred.trend
                                                )}`}
                                            >
                                                {pred.stock.symbol.slice(0, 4)}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">
                                                    {pred.stock.symbol}
                                                </p>
                                                <p className="text-gray-400 text-sm">
                                                    {pred.stock.name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-white font-semibold text-lg">
                                            ${pred.predictedPrice.toFixed(2)}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center space-x-2">
                                            <div className="w-16 bg-slate-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        pred.confidence >= 0.7
                                                            ? 'bg-green-500'
                                                            : pred.confidence >= 0.4
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                    }`}
                                                    style={{
                                                        width: `${pred.confidence * 100}%`,
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-white text-sm">
                                                {(pred.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            {getTrendIcon(pred.trend)}
                                            <span
                                                className={`text-sm capitalize ${
                                                    pred.trend === 'bullish'
                                                        ? 'text-green-400'
                                                        : pred.trend === 'bearish'
                                                        ? 'text-red-400'
                                                        : 'text-gray-400'
                                                }`}
                                            >
                                                {pred.trend || 'neutral'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-400 text-sm">
                                            ${pred.lowerBound.toFixed(2)} - $
                                            {pred.upperBound.toFixed(2)}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {new Date(pred.predictionDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-t border-slate-700/50">
                        <p className="text-gray-400 text-sm">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                            {pagination.total} predictions
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
