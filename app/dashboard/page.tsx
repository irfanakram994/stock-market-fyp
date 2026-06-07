'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Target, Activity, Loader, Plus, X, List, Trash2, BadgeCheck, WalletCards, BarChart2 } from 'lucide-react';
import MetricCard from '@/components/Cards/MetricCard';
import StockSymbolCombobox from '@/components/StockSymbolCombobox';
import { createStockPurchase, deleteStockPurchase, fetchDashboardSummary, fetchMarketData, fetchPredictions, fetchStockPurchases, Prediction, Stock, AgentLog, StockPurchase } from '@/lib/api';
import { getLastSelectedStockSymbol } from '@/lib/stockCatalog';

const getTodayDate = () => new Date().toISOString().split('T')[0];

interface SelectedStockTracking {
    stockName: string;
    purchaseDate: string;
    purchasePrice: number;
    currentPrice: number;
    totalProfitLoss: number;
    isUp: boolean;
    predictedPrice: number | null;
    modelAccuracy: number | null;
}

function toDateOnly(raw: string) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toISOString().split('T')[0];
}

function findClosestPriceOnDate(prices: Array<{ date: string; price: number }>, targetDate: string) {
    const target = new Date(`${targetDate}T00:00:00Z`).getTime();
    if (Number.isNaN(target) || prices.length === 0) return null;

    let selected: { date: string; price: number } | null = null;
    let minDiff = Number.POSITIVE_INFINITY;

    for (const item of prices) {
        const ts = new Date(item.date).getTime();
        if (Number.isNaN(ts) || !Number.isFinite(item.price) || item.price <= 0) continue;

        const diff = Math.abs(ts - target);
        if (diff < minDiff) {
            minDiff = diff;
            selected = item;
        }
    }

    return selected?.price ?? null;
}

function findLatestPrice(prices: Array<{ date: string; price: number }>) {
    if (prices.length === 0) return null;

    let latest: { date: string; price: number } | null = null;
    for (const item of prices) {
        const ts = new Date(item.date).getTime();
        if (Number.isNaN(ts) || !Number.isFinite(item.price) || item.price <= 0) continue;
        if (!latest || ts > new Date(latest.date).getTime()) latest = item;
    }

    return latest?.price ?? null;
}

function calcAccuracy(predictedPrice: number, currentPrice: number) {
    if (!Number.isFinite(predictedPrice) || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;
    const pctError = (Math.abs(predictedPrice - currentPrice) / currentPrice) * 100;
    return Math.max(0, 100 - pctError);
}

export default function DashboardPage() {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [showYourStocksModal, setShowYourStocksModal] = useState(false);
    const [savingStock, setSavingStock] = useState(false);
    const [saveStockError, setSaveStockError] = useState<string | null>(null);
    const [saveStockSuccess, setSaveStockSuccess] = useState<string | null>(null);
    const [savedStockPurchases, setSavedStockPurchases] = useState<StockPurchase[]>([]);
    const [loadingSavedStocks, setLoadingSavedStocks] = useState(false);
    const [deletingStockId, setDeletingStockId] = useState<string | null>(null);
    const [savedStocksError, setSavedStocksError] = useState<string | null>(null);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [selectedTracking, setSelectedTracking] = useState<SelectedStockTracking | null>(null);
    const [addStockForm, setAddStockForm] = useState({
        stockName: '',
        purchaseAmount: '',
        purchaseDate: getTodayDate(),
    });

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const summaryRes = await fetchDashboardSummary();
            if (summaryRes.success && summaryRes.data) {
                setPredictions(summaryRes.data.predictions);
                setStocks(summaryRes.data.stocks);
                setAgentLogs(summaryRes.data.agentLogs);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    // Compute metrics from real data
    const activeStocks = stocks.length;
    const completedLogs = agentLogs.filter(l => l.status === 'completed');
    const accuracy = completedLogs.length > 0
        ? (completedLogs.length / agentLogs.length * 100).toFixed(1)
        : '—';
    const agentTaskCount = agentLogs.length;

    // Format prediction rows for the table
    const predictionRows = predictions.map(p => ({
        symbol: p.stock?.symbol || 'N/A',
        predicted: p.predictedPrice,
        trend: p.trend || 'neutral',
        confidence: p.confidence,
        date: new Date(p.predictionDate).toLocaleDateString('en-CA'),
    }));

    const handleAddStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaveStockError(null);
        setSaveStockSuccess(null);

        const symbol = addStockForm.stockName.trim().toUpperCase();
        if (!symbol) {
            setSaveStockError('Stock name is required.');
            return;
        }

        setSavingStock(true);

        // Always try to fetch the historical purchase-day price from market agent data.
        const marketRes = await fetchMarketData(symbol);
        if (!marketRes.success || !marketRes.data) {
            setSavingStock(false);
            setSaveStockError(marketRes.error || 'Failed to fetch stock price from market agent.');
            return;
        }

        const fetchedPurchasePrice = findClosestPriceOnDate(marketRes.data.prices || [], addStockForm.purchaseDate);
        if (!fetchedPurchasePrice) {
            setSavingStock(false);
            setSaveStockError('Could not find stock price near selected purchase date. Try another date.');
            return;
        }

        const result = await createStockPurchase(
            symbol,
            fetchedPurchasePrice,
            addStockForm.purchaseDate
        );
        setSavingStock(false);

        if (!result.success) {
            setSaveStockError(result.error || 'Failed to save stock purchase.');
            return;
        }

        setSaveStockSuccess(`Stock saved. Purchase price fetched from agent: $${fetchedPurchasePrice.toFixed(2)}`);
        setAddStockForm({
            stockName: '',
            purchaseAmount: '',
            purchaseDate: getTodayDate(),
        });

        setTimeout(() => {
            setShowAddStockModal(false);
            setSaveStockSuccess(null);
        }, 800);
    };

    const handleOpenYourStocks = async () => {
        setShowYourStocksModal(true);
        setSavedStocksError(null);
        setLoadingSavedStocks(true);

        const result = await fetchStockPurchases();
        if (!result.success) {
            setSavedStocksError(result.error || 'Failed to load saved stocks.');
            setSavedStockPurchases([]);
            setLoadingSavedStocks(false);
            return;
        }

        setSavedStockPurchases(result.data || []);
        setLoadingSavedStocks(false);
    };

    const handleDeleteSavedStock = async (id: string) => {
        setSavedStocksError(null);
        setDeletingStockId(id);

        const result = await deleteStockPurchase(id);
        setDeletingStockId(null);

        if (!result.success) {
            setSavedStocksError(result.error || 'Failed to delete stock.');
            return;
        }

        setSavedStockPurchases((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSelectSavedStock = async (item: StockPurchase) => {
        const symbol = item.stockName.trim().toUpperCase();
        if (!symbol) {
            setSavedStocksError('Invalid stock symbol.');
            return;
        }

        setTrackingError(null);
        setTrackingLoading(true);

        const [marketRes, predRes] = await Promise.all([
            fetchMarketData(symbol),
            fetchPredictions(symbol, 1),
        ]);

        if (!marketRes.success || !marketRes.data) {
            setTrackingLoading(false);
            setTrackingError(marketRes.error || 'Failed to fetch current stock price from market agent.');
            return;
        }

        const currentPrice = findLatestPrice(marketRes.data.prices || []);
        if (!currentPrice) {
            setTrackingLoading(false);
            setTrackingError('Unable to determine current price for selected stock.');
            return;
        }

        const purchasePrice = item.purchaseAmount;
        const totalProfitLoss = currentPrice - purchasePrice;
        const predictedPrice = predRes.success && predRes.data && predRes.data.length > 0
            ? predRes.data[0].predictedPrice
            : null;
        const modelAccuracy = predictedPrice ? calcAccuracy(predictedPrice, currentPrice) : null;

        setSelectedTracking({
            stockName: symbol,
            purchaseDate: item.purchaseDate,
            purchasePrice,
            currentPrice,
            totalProfitLoss,
            isUp: totalProfitLoss >= 0,
            predictedPrice,
            modelAccuracy,
        });
        setTrackingLoading(false);
        setShowYourStocksModal(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
                    <p className="text-gray-400">Welcome back! Here&apos;s your market summary.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenYourStocks}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 font-medium text-slate-100 transition-colors hover:border-primary/60 hover:bg-slate-700"
                    >
                        <List className="h-4 w-4" />
                        Your Stocks
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSaveStockError(null);
                            setSaveStockSuccess(null);
                            setAddStockForm((current) => ({
                                ...current,
                                stockName: current.stockName || getLastSelectedStockSymbol(),
                            }));
                            setShowAddStockModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Add Stocks
                    </button>
                </div>
            </div>

            {showYourStocksModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-sky-900/30">
                        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                            <h2 className="text-lg font-semibold text-white">Your Stocks</h2>
                            <button
                                type="button"
                                onClick={() => setShowYourStocksModal(false)}
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-5 py-5">
                            {loadingSavedStocks ? (
                                <div className="flex items-center justify-center py-12 text-slate-300">
                                    <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
                                    Loading saved stocks...
                                </div>
                            ) : savedStocksError ? (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {savedStocksError}
                                </div>
                            ) : savedStockPurchases.length === 0 ? (
                                <p className="py-10 text-center text-slate-300">No saved stocks yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[620px]">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-left text-sm text-slate-300">
                                                <th className="px-3 py-3 font-medium">Stock Name</th>
                                                <th className="px-3 py-3 font-medium">Purchase Price ($)</th>
                                                <th className="px-3 py-3 font-medium">Purchase Date</th>
                                                <th className="px-3 py-3 font-medium">Saved At</th>
                                                <th className="px-3 py-3 font-medium text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {savedStockPurchases.map((item) => (
                                                <tr key={item.id} className="border-b border-slate-800 text-sm text-slate-100">
                                                    <td className="px-3 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectSavedStock(item)}
                                                            className="font-medium text-primary underline-offset-2 hover:underline"
                                                            title="Track this stock"
                                                        >
                                                            {item.stockName}
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-3">${item.purchaseAmount.toFixed(2)}</td>
                                                    <td className="px-3 py-3">{toDateOnly(item.purchaseDate)}</td>
                                                    <td className="px-3 py-3 text-slate-400">
                                                        {new Date(item.createdAt).toLocaleString('en-CA')}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSavedStock(item.id)}
                                                            disabled={deletingStockId === item.id}
                                                            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {deletingStockId === item.id ? (
                                                                <>
                                                                    <Loader className="h-3.5 w-3.5 animate-spin" />
                                                                    Deleting...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    Delete
                                                                </>
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showAddStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-sky-900/30">
                        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                            <h2 className="text-lg font-semibold text-white">Add Stocks</h2>
                            <button
                                type="button"
                                onClick={() => setShowAddStockModal(false)}
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStockSubmit} className="space-y-4 px-5 py-5">
                            {saveStockError && (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {saveStockError}
                                </div>
                            )}

                            {saveStockSuccess && (
                                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                                    {saveStockSuccess}
                                </div>
                            )}

                            <div>
                                <label htmlFor="stockName" className="mb-1.5 block text-sm font-medium text-slate-200">
                                    Stock Name
                                </label>
                                <StockSymbolCombobox
                                    value={addStockForm.stockName}
                                    onChange={(symbol) => setAddStockForm({ ...addStockForm, stockName: symbol })}
                                    stocks={stocks.map((stock) => ({
                                        symbol: stock.symbol,
                                        name: stock.name || stock.symbol,
                                    }))}
                                    placeholder="Search stock..."
                                />
                            </div>

                            <div>
                                <label htmlFor="purchaseAmount" className="mb-1.5 block text-sm font-medium text-slate-200">
                                    Purchase Price ($)
                                </label>
                                <input
                                    id="purchaseAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="e.g. 1500"
                                    value={addStockForm.purchaseAmount}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, purchaseAmount: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder:text-slate-400 focus:border-primary focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="purchaseDate" className="mb-1.5 block text-sm font-medium text-slate-200">
                                    Purchase Date
                                </label>
                                <input
                                    id="purchaseDate"
                                    type="date"
                                    value={addStockForm.purchaseDate}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, purchaseDate: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-primary focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddStockModal(false)}
                                    disabled={savingStock}
                                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingStock}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                                >
                                    {savingStock ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            {trackingError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {trackingError}
                </div>
            )}

            {trackingLoading ? (
                <div className="card flex items-center justify-center py-10 text-slate-300">
                    <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
                    Loading selected stock tracking metrics...
                </div>
            ) : selectedTracking ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">
                            Tracking: {selectedTracking.stockName}
                            <span className="ml-2 text-sm font-normal text-gray-400">
                                (from {toDateOnly(selectedTracking.purchaseDate)} to today)
                            </span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                        <div className="card">
                            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-gray-400">Am I Up or Down?</p>
                            <p className={`text-2xl font-bold ${selectedTracking.isUp ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedTracking.isUp ? 'Up' : 'Down'}
                            </p>
                        </div>

                        <div className="card">
                            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                                <WalletCards className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-gray-400">Total Profit/Loss</p>
                            <p className={`text-2xl font-bold ${selectedTracking.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedTracking.totalProfitLoss >= 0 ? '+' : '-'}${Math.abs(selectedTracking.totalProfitLoss).toFixed(2)}
                            </p>
                        </div>

                        <div className="card">
                            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                                <BadgeCheck className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-gray-400">Model Predicted Accuracy</p>
                            <p className="text-2xl font-bold">
                                {selectedTracking.modelAccuracy !== null
                                    ? `${selectedTracking.modelAccuracy.toFixed(1)}%`
                                    : 'N/A'}
                            </p>
                        </div>

                        <div className="card">
                            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-gray-400">Purchased Price</p>
                            <p className="text-2xl font-bold">${selectedTracking.purchasePrice.toFixed(2)}</p>
                        </div>

                        <div className="card">
                            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                                <BarChart2 className="h-5 w-5" />
                            </div>
                            <p className="text-sm text-gray-400">Current Price</p>
                            <p className="text-2xl font-bold">${selectedTracking.currentPrice.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Predictions"
                        value={String(predictions.length)}
                        change={predictions.length > 0 ? +5.2 : 0}
                        icon={<DollarSign className="w-6 h-6" />}
                        trend="up"
                    />
                    <MetricCard
                        title="Agent Success Rate"
                        value={`${accuracy}%`}
                        change={completedLogs.length > 0 ? +2.1 : 0}
                        icon={<Target className="w-6 h-6" />}
                        trend="up"
                    />
                    <MetricCard
                        title="Active Stocks"
                        value={String(activeStocks)}
                        change={activeStocks}
                        icon={<TrendingUp className="w-6 h-6" />}
                        trend="up"
                    />
                    <MetricCard
                        title="Agent Tasks"
                        value={String(agentTaskCount)}
                        change={agentTaskCount > 0 ? -5 : 0}
                        icon={<Activity className="w-6 h-6" />}
                        trend={agentTaskCount > 0 ? 'down' : 'up'}
                    />
                </div>
            )}

            {/* Recent Predictions */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Recent Predictions</h2>
                {predictionRows.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No predictions yet. Run a prediction from the AI Predictions page.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Symbol</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Predicted</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Trend</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Confidence</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {predictionRows.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-800 hover:bg-dark-200 transition-colors">
                                        <td className="py-3 px-4 font-bold text-primary">{item.symbol}</td>
                                        <td className="py-3 px-4">${item.predicted.toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${item.trend === 'bullish' ? 'bg-green-500/20 text-green-400' :
                                                item.trend === 'bearish' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {item.trend}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">{(item.confidence * 100).toFixed(0)}%</td>
                                        <td className="py-3 px-4 text-gray-400">{item.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="card cursor-pointer hover:border-primary">
                    <h3 className="font-bold mb-2">Run New Prediction</h3>
                    <p className="text-sm text-gray-400">Analyze a stock with AI agents</p>
                </div>
                <div className="card cursor-pointer hover:border-primary">
                    <h3 className="font-bold mb-2">View Agent Logs</h3>
                    <p className="text-sm text-gray-400">Monitor agent execution</p>
                </div>
                <div className="card cursor-pointer hover:border-primary">
                    <h3 className="font-bold mb-2">Backtest Strategy</h3>
                    <p className="text-sm text-gray-400">Test your trading strategy</p>
                </div>
            </div>
        </div>
    );
}
