'use client';

import { useEffect, useState } from 'react';
import { Play, Loader, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchBacktests, runBacktest, BacktestResult } from '@/lib/api';
import { useSnackbar } from '@/components/SnackbarProvider';

export default function BacktestingPage() {
    const { showSnackbar, updateSnackbar } = useSnackbar();
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [symbol, setSymbol] = useState('AAPL');
    const [startDate, setStartDate] = useState('2025-01-01');
    const [endDate, setEndDate] = useState('2025-12-31');
    const [initialCapital, setInitialCapital] = useState(100000);
    const [results, setResults] = useState<BacktestResult[]>([]);

    const loadResults = async () => {
        setLoading(true);
        const res = await fetchBacktests();
        if (res.success && res.data) {
            setResults(res.data);
        } else if (!res.success) {
            showSnackbar({ variant: 'error', message: res.error || 'Failed to load your backtests.' });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadResults();
    }, []);

    const handleRunBacktest = async () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const capital = Number(initialCapital);

        if (!symbol.trim()) {
            showSnackbar({ variant: 'warning', message: 'Enter a stock symbol before running a backtest.' });
            return;
        }
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            showSnackbar({ variant: 'warning', message: 'Choose a valid start date before the end date.' });
            return;
        }
        if (!Number.isFinite(capital) || capital <= 0) {
            showSnackbar({ variant: 'warning', message: 'Initial capital must be greater than 0.' });
            return;
        }

        setRunning(true);
        const snackbarId = showSnackbar({
            variant: 'loading',
            message: `Running ${symbol} backtest...`,
        });
        const res = await runBacktest(symbol.trim().toUpperCase(), startDate, endDate, capital);
        if (res.success) {
            updateSnackbar(snackbarId, { variant: 'success', message: res.message || 'Backtest created.' });
            await loadResults(); // Refresh results
        } else {
            updateSnackbar(snackbarId, { variant: 'error', message: res.error || 'Failed to run backtest.' });
        }
        setRunning(false);
    };

    const latestResult = results[0]; // Most recent
    const equityCurve = Array.isArray(latestResult?.equityCurve) ? latestResult.equityCurve : [];
    const trades = Array.isArray(latestResult?.trades) ? latestResult.trades : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Backtesting</h1>
                <p className="text-gray-400">Test your trading strategies with historical data</p>
            </div>

            <div className="card border border-primary/20 bg-primary/5">
                <h2 className="text-lg font-bold mb-2">What backtesting does here</h2>
                <p className="text-sm leading-relaxed text-gray-300">
                    Backtesting replays historical prices for your selected stock and simulates a moving-average crossover strategy.
                    It estimates capital growth, trade results, win rate, max drawdown, and risk-adjusted performance before a strategy is trusted live.
                </p>
            </div>

            {/* Configuration */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Strategy Configuration</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Stock Symbol</label>
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Initial Capital</label>
                        <input
                            type="number"
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
                        />
                    </div>
                </div>
                <div className="mt-4 flex items-center space-x-4">
                    <button
                        onClick={handleRunBacktest}
                        disabled={running}
                        className="btn-primary flex items-center"
                    >
                        {running ? (
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-5 h-5 mr-2" />
                        )}
                        {running ? 'Running...' : 'Run Backtest'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loader className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : latestResult ? (
                <>
                    {/* Performance Metrics */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="card">
                            <div className="text-sm text-gray-400 mb-1">Total Return</div>
                            <div className={`text-2xl font-bold ${latestResult.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {latestResult.totalReturn >= 0 ? '+' : ''}{latestResult.totalReturn.toFixed(1)}%
                            </div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-gray-400 mb-1">Sharpe Ratio</div>
                            <div className="text-2xl font-bold">{latestResult.sharpeRatio != null ? latestResult.sharpeRatio.toFixed(2) : '-'}</div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
                            <div className="text-2xl font-bold text-red-400">{latestResult.maxDrawdown != null ? `${latestResult.maxDrawdown.toFixed(1)}%` : '-'}</div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                            <div className="text-2xl font-bold text-green-400">{latestResult.winRate != null ? `${latestResult.winRate.toFixed(1)}%` : '-'}</div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="card">
                        <h2 className="text-xl font-bold mb-4">Equity Curve</h2>
                        {equityCurve.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={equityCurve}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                        tick={{ fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        tick={{ fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            color: '#f8fafc'
                                        }}
                                        formatter={(value: number) => `$${value.toLocaleString()}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                No equity curve data available
                            </div>
                        )}
                    </div>

                    {/* Trade Log */}
                    <div className="card">
                        <h2 className="text-xl font-bold mb-4">Trade Log</h2>
                        {trades.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Price</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Shares</th>
                                            <th className="text-left py-3 px-4 text-gray-400 font-medium">P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((trade, idx) => (
                                            <tr key={idx} className="border-b border-gray-800 hover:bg-dark-200 transition-colors">
                                                <td className="py-3 px-4">{trade.date}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${trade.type === 'BUY' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {trade.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">${trade.price.toFixed(2)}</td>
                                                <td className="py-3 px-4">{trade.shares}</td>
                                                <td className="py-3 px-4">
                                                    {trade.pnl > 0 ? (
                                                        <span className="text-green-400 flex items-center">
                                                            <TrendingUp className="w-4 h-4 mr-1" />
                                                            +${trade.pnl}
                                                        </span>
                                                    ) : trade.pnl < 0 ? (
                                                        <span className="text-red-400 flex items-center">
                                                            <TrendingDown className="w-4 h-4 mr-1" />
                                                            -${Math.abs(trade.pnl)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">No trades in this backtest yet</p>
                        )}
                    </div>
                </>
            ) : (
                <div className="card">
                    <p className="text-gray-400 text-center py-8">No backtest results found. Configure a strategy and click &quot;Run Backtest&quot; to get started.</p>
                </div>
            )}
        </div>
    );
}
