'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BadgeDollarSign,
    BarChart3,
    CheckCircle2,
    Loader,
    Play,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { fetchBacktests, runBacktest, BacktestResult } from '@/lib/api';
import { useSnackbar } from '@/components/SnackbarProvider';
import StockSymbolCombobox from '@/components/StockSymbolCombobox';
import { getLastSelectedStockSymbol } from '@/lib/stockCatalog';

const STRATEGY_TYPE = 'moving_average_crossover' as const;

function getDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function formatMoney(value: number | null | undefined) {
    if (!isNumber(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
}

function formatPercent(value: number | null | undefined, signed = true) {
    if (!isNumber(value)) return 'N/A';
    return `${signed && value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatNumber(value: number | null | undefined, digits = 2) {
    if (!isNumber(value)) return 'N/A';
    return value.toFixed(digits);
}

function parseInputNumber(value: string) {
    if (value.trim() === '') return NaN;
    return Number(value);
}

function MetricTile({
    label,
    value,
    subValue,
    tone = 'neutral',
    icon,
}: {
    label: string;
    value: string;
    subValue?: string;
    tone?: 'positive' | 'negative' | 'neutral';
    icon?: ReactNode;
}) {
    const toneClass = tone === 'positive'
        ? 'text-emerald-400'
        : tone === 'negative'
            ? 'text-rose-400'
            : 'text-slate-100';
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                {icon && <div className="text-slate-500">{icon}</div>}
            </div>
            <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
            {subValue && <div className="mt-1 text-sm text-slate-400">{subValue}</div>}
        </div>
    );
}

function validationMessage({
    symbol,
    startDate,
    endDate,
    initialCapital,
    shortWindow,
    longWindow,
}: {
    symbol: string;
    startDate: string;
    endDate: string;
    initialCapital: string;
    shortWindow: string;
    longWindow: string;
}) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const capital = parseInputNumber(initialCapital);
    const short = parseInputNumber(shortWindow);
    const long = parseInputNumber(longWindow);

    if (!symbol.trim()) return 'Symbol is required.';
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return 'Start date must be before end date.';
    }
    if (end > today) return 'End date must be today or earlier.';
    if (!Number.isFinite(capital) || capital <= 0) return 'Initial capital must be positive.';
    if (!Number.isInteger(short) || short < 2 || short > 250) return 'Short MA must be an integer from 2 to 250.';
    if (!Number.isInteger(long) || long < 3 || long > 250) return 'Long MA must be an integer from 3 to 250.';
    if (short >= long) return 'Short MA must be less than long MA.';
    return null;
}

export default function BacktestingPage() {
    const { showSnackbar, updateSnackbar } = useSnackbar();
    const defaults = useMemo(() => getDefaultDates(), []);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(true);
    const [symbol, setSymbol] = useState(() => getLastSelectedStockSymbol());
    const [startDate, setStartDate] = useState(defaults.startDate);
    const [endDate, setEndDate] = useState(defaults.endDate);
    const [initialCapital, setInitialCapital] = useState('100000');
    const [shortWindow, setShortWindow] = useState('20');
    const [longWindow, setLongWindow] = useState('50');
    const [results, setResults] = useState<BacktestResult[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [runError, setRunError] = useState<string | null>(null);

    const loadResults = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        const res = await fetchBacktests();
        if (res.success && res.data) {
            setResults(res.data);
        } else if (!res.success) {
            const message = res.error || 'Failed to load your backtests.';
            setLoadError(message);
            showSnackbar({ variant: 'error', message });
        }
        setLoading(false);
    }, [showSnackbar]);

    useEffect(() => {
        loadResults();
    }, [loadResults]);

    const formError = validationMessage({
        symbol,
        startDate,
        endDate,
        initialCapital,
        shortWindow,
        longWindow,
    });

    const handleRunBacktest = async () => {
        const error = validationMessage({
            symbol,
            startDate,
            endDate,
            initialCapital,
            shortWindow,
            longWindow,
        });
        if (error) {
            setRunError(error);
            showSnackbar({ variant: 'warning', message: error });
            return;
        }

        setRunError(null);
        setRunning(true);
        const symbolUpper = symbol.trim().toUpperCase();
        const snackbarId = showSnackbar({
            variant: 'loading',
            message: `Running ${symbolUpper} backtest...`,
        });

        const res = await runBacktest({
            symbol: symbolUpper,
            startDate,
            endDate,
            initialCapital: Number(initialCapital),
            strategyType: STRATEGY_TYPE,
            shortWindow: Number(shortWindow),
            longWindow: Number(longWindow),
        });

        if (res.success && res.data) {
            updateSnackbar(snackbarId, { variant: 'success', message: res.message || 'Backtest completed.' });
            setLoadError(null);
            setRunError(null);
            setResults((previous) => [res.data as BacktestResult, ...previous]);
        } else {
            const message = res.error || 'Failed to run backtest.';
            setRunError(message);
            updateSnackbar(snackbarId, { variant: 'error', message });
        }
        setRunning(false);
    };

    const latestResult = results[0];
    const equityCurve = Array.isArray(latestResult?.equityCurve) ? latestResult.equityCurve : [];
    const benchmarkCurve = Array.isArray(latestResult?.benchmarkCurve) ? latestResult.benchmarkCurve : [];
    const priceSeries = Array.isArray(latestResult?.priceSeries) ? latestResult.priceSeries : [];
    const signals = Array.isArray(latestResult?.signals) ? latestResult.signals : [];
    const trades = Array.isArray(latestResult?.trades) ? latestResult.trades.filter((trade) => trade.entryDate && trade.exitDate) : [];

    const equityChartData = equityCurve.map((point) => {
        const benchmark = benchmarkCurve.find((item) => item.date === point.date);
        return {
            date: point.date,
            strategy: point.value,
            benchmark: benchmark?.value ?? null,
        };
    });

    const priceChartData = priceSeries.map((point) => {
        const dateSignals = signals.filter((signal) => signal.date === point.date);
        return {
            date: point.date,
            close: point.close,
            shortMa: point.shortMa,
            longMa: point.longMa,
            buy: dateSignals.find((signal) => signal.type === 'BUY')?.price ?? null,
            sell: dateSignals.find((signal) => signal.type === 'SELL')?.price ?? null,
        };
    });

    const latestSymbol = latestResult?.stock?.symbol || symbol || 'AAPL';
    const totalReturnTone = latestResult?.totalReturn != null && latestResult.totalReturn >= 0 ? 'positive' : 'negative';
    const benchmarkTone = latestResult?.buyHoldReturn != null && latestResult.buyHoldReturn >= 0 ? 'positive' : 'negative';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Backtesting</h1>
                    <p className="text-gray-400">Replay historical prices and evaluate a strategy before trusting it in forecasts.</p>
                </div>
                {latestResult && (
                    <div className="rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Latest Run</div>
                        <div className="mt-1 font-semibold text-slate-100">
                            {latestSymbol} / {latestResult.strategyName}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                <div className="card">
                    <div className="mb-5 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold">Strategy Configuration</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="xl:col-span-1">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Stock Symbol</label>
                            <StockSymbolCombobox value={symbol} onChange={setSymbol} />
                            <p className="mt-2 text-xs text-slate-500">Enter a ticker like AAPL, MSFT, or TSLA.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 transition-colors focus:border-primary focus:outline-none"
                            />
                            <p className="mt-2 text-xs text-slate-500">Historical range begins here.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 transition-colors focus:border-primary focus:outline-none"
                            />
                            <p className="mt-2 text-xs text-slate-500">Use a past or current trading date.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Initial Capital</label>
                            <input
                                type="number"
                                min="1"
                                value={initialCapital}
                                onChange={(event) => setInitialCapital(event.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 transition-colors focus:border-primary focus:outline-none"
                            />
                            <p className="mt-2 text-xs text-slate-500">Virtual money used for simulation.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Strategy Type</label>
                            <select
                                value={STRATEGY_TYPE}
                                disabled
                                className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 opacity-90"
                            >
                                <option value={STRATEGY_TYPE}>Moving Average Crossover</option>
                            </select>
                            <p className="mt-2 text-xs text-slate-500">Buy on bullish MA cross, sell on bearish cross.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Short MA</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="250"
                                    value={shortWindow}
                                    onChange={(event) => setShortWindow(event.target.value)}
                                    className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 transition-colors focus:border-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Long MA</label>
                                <input
                                    type="number"
                                    min="3"
                                    max="250"
                                    value={longWindow}
                                    onChange={(event) => setLongWindow(event.target.value)}
                                    className="w-full rounded-lg border border-gray-700 bg-dark-200 px-4 py-2 text-gray-200 transition-colors focus:border-primary focus:outline-none"
                                />
                            </div>
                            <p className="col-span-2 text-xs text-slate-500">Default windows are 20 and 50 trading days.</p>
                        </div>
                    </div>

                    {(formError || runError) && (
                        <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{runError || formError}</span>
                        </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="button"
                            onClick={handleRunBacktest}
                            disabled={running}
                            className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {running ? <Loader className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                            {running ? 'Running...' : 'Run Backtest'}
                        </button>
                        <div className="text-sm text-slate-500">
                            Result shows capital growth, trades, drawdown, and benchmark comparison.
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold">How to Read It</h2>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
                        <p>Symbol chooses the stock ticker. Start and end dates define the historical replay range.</p>
                        <p>Initial capital is simulated cash. Short and long MA windows define when buy and sell signals trigger.</p>
                        <p>Positive return with controlled drawdown and a useful win/risk profile suggests the strategy handled that period well.</p>
                    </div>
                    {latestResult && (
                        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
                            <div className="text-sm text-slate-400">Latest interpretation</div>
                            <div className="mt-2 text-lg font-semibold text-slate-100">
                                {latestResult.totalReturn >= (latestResult.buyHoldReturn ?? -Infinity)
                                    ? 'Strategy outperformed buy and hold for this range.'
                                    : 'Buy and hold outperformed this strategy for this range.'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : latestResult ? (
                <>
                    {loadError && (
                        <div className="card flex items-start gap-3 border-amber-500/30 bg-amber-500/10 text-amber-300">
                            <ShieldAlert className="mt-1 h-5 w-5 shrink-0" />
                            <div>
                                <h2 className="font-semibold text-slate-100">History refresh is unavailable</h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Showing the latest completed result from this session. {loadError}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label="Initial Capital" value={formatMoney(latestResult.initialCapital)} icon={<BadgeDollarSign className="h-4 w-4" />} />
                        <MetricTile label="Final Capital" value={formatMoney(latestResult.finalCapital)} tone={totalReturnTone} icon={<Activity className="h-4 w-4" />} />
                        <MetricTile label="Total Return" value={formatPercent(latestResult.totalReturn)} tone={totalReturnTone} subValue="Strategy performance" icon={latestResult.totalReturn >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} />
                        <MetricTile label="Buy & Hold Return" value={formatPercent(latestResult.buyHoldReturn)} tone={benchmarkTone} subValue="Benchmark performance" icon={<TrendingUp className="h-4 w-4" />} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label="Total Trades" value={String(latestResult.totalTrades)} subValue={`${latestResult.profitableTrades} wins / ${latestResult.losingTrades} losses`} />
                        <MetricTile label="Win Rate" value={formatPercent(latestResult.winRate, false)} tone="positive" subValue={`Loss rate ${formatPercent(latestResult.lossRate, false)}`} />
                        <MetricTile label="Max Drawdown" value={formatPercent(latestResult.maxDrawdown, false)} tone="negative" subValue="Largest equity decline" icon={<TrendingDown className="h-4 w-4" />} />
                        <MetricTile label="Risk / Reward" value={latestResult.riskReward === null || latestResult.riskReward === undefined ? 'N/A' : `${formatNumber(latestResult.riskReward)}x`} subValue={`Sharpe ${formatNumber(latestResult.sharpeRatio)}`} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <MetricTile
                            label="Best Trade"
                            value={latestResult.bestTrade ? formatMoney(latestResult.bestTrade.pnl) : 'N/A'}
                            tone={latestResult.bestTrade && latestResult.bestTrade.pnl >= 0 ? 'positive' : 'neutral'}
                            subValue={latestResult.bestTrade ? `${latestResult.bestTrade.entryDate} to ${latestResult.bestTrade.exitDate} (${formatPercent(latestResult.bestTrade.pnlPercent)})` : 'No completed winning trade'}
                            icon={<TrendingUp className="h-4 w-4" />}
                        />
                        <MetricTile
                            label="Worst Trade"
                            value={latestResult.worstTrade ? formatMoney(latestResult.worstTrade.pnl) : 'N/A'}
                            tone={latestResult.worstTrade && latestResult.worstTrade.pnl < 0 ? 'negative' : 'neutral'}
                            subValue={latestResult.worstTrade ? `${latestResult.worstTrade.entryDate} to ${latestResult.worstTrade.exitDate} (${formatPercent(latestResult.worstTrade.pnlPercent)})` : 'No completed losing trade'}
                            icon={<TrendingDown className="h-4 w-4" />}
                        />
                    </div>

                    <div className="card">
                        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-xl font-bold">Equity Curve</h2>
                            <span className="text-sm text-slate-500">Strategy capital vs buy-and-hold benchmark</span>
                        </div>
                        {equityChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={330}>
                                <LineChart data={equityChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                        formatter={(value: number, name: string) => [formatMoney(value), name === 'strategy' ? 'Strategy' : 'Buy & Hold']}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="strategy" name="Strategy" stroke="#22c55e" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="benchmark" name="Buy & Hold" stroke="#38bdf8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[330px] items-center justify-center text-slate-400">No equity curve data available.</div>
                        )}
                    </div>

                    <div className="card">
                        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-xl font-bold">Price, Moving Averages & Signals</h2>
                            <span className="text-sm text-slate-500">{latestResult.strategyConfig?.shortWindow || 20}/{latestResult.strategyConfig?.longWindow || 50} MA crossover</span>
                        </div>
                        {priceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={360}>
                                <ComposedChart data={priceChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                        formatter={(value: number, name: string) => [formatMoney(value), name]}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="close" name="Close" stroke="#e2e8f0" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="shortMa" name="Short MA" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
                                    <Line type="monotone" dataKey="longMa" name="Long MA" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                                    <Scatter dataKey="buy" name="Buy" fill="#22c55e" shape="triangle" />
                                    <Scatter dataKey="sell" name="Sell" fill="#ef4444" shape="diamond" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[360px] items-center justify-center text-slate-400">No price series data available.</div>
                        )}
                    </div>

                    <div className="card">
                        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-xl font-bold">Trade History</h2>
                            <span className="text-sm text-slate-500">Completed round-trip trades only</span>
                        </div>
                        {trades.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[820px]">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="px-4 py-3 text-left font-medium text-gray-400">Entry</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-400">Exit</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">Entry Price</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">Exit Price</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">Shares</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">Holding</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">P&L</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-400">P&L %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((trade, index) => (
                                            <tr key={`${trade.entryDate}-${trade.exitDate}-${index}`} className="border-b border-gray-800 transition-colors hover:bg-dark-200">
                                                <td className="px-4 py-3">{trade.entryDate}</td>
                                                <td className="px-4 py-3">{trade.exitDate}</td>
                                                <td className="px-4 py-3 text-right">{formatMoney(trade.entryPrice)}</td>
                                                <td className="px-4 py-3 text-right">{formatMoney(trade.exitPrice)}</td>
                                                <td className="px-4 py-3 text-right">{trade.shares.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right">{trade.holdingDays}d</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatMoney(trade.pnl)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-semibold ${trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatPercent(trade.pnlPercent)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex min-h-[160px] items-center justify-center text-center text-slate-400">
                                No completed trades were generated for this range and strategy.
                            </div>
                        )}
                    </div>
                </>
            ) : loadError ? (
                <div className="card flex items-start gap-3 text-amber-300">
                    <ShieldAlert className="mt-1 h-5 w-5 shrink-0" />
                    <div>
                        <h2 className="font-semibold text-slate-100">Backtest history is unavailable</h2>
                        <p className="mt-1 text-sm text-slate-400">{loadError}</p>
                    </div>
                </div>
            ) : (
                <div className="card flex min-h-[220px] items-center justify-center text-center">
                    <div>
                        <BarChart3 className="mx-auto mb-4 h-10 w-10 text-slate-500" />
                        <h2 className="text-xl font-semibold text-slate-100">No backtest results found</h2>
                        <p className="mt-2 max-w-xl text-slate-400">
                            Configure a ticker, historical range, capital amount, and MA windows, then run a simulation.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
