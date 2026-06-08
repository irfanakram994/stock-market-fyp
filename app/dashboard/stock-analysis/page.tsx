'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Brain,
    Gauge,
    Loader,
    RefreshCw,
    Shield,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    ComposedChart,
    Bar,
    CartesianGrid,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    fetchMarketData,
    fetchNewsLive,
    fetchStocks,
    runAgent,
    MarketCandle,
    MarketData,
    NewsItem,
    Stock,
    StockAnalysisData,
} from '@/lib/api';
import { useSnackbar } from '@/components/SnackbarProvider';
import StockSymbolCombobox from '@/components/StockSymbolCombobox';
import { getLastSelectedStockSymbol, mergeStockOptions } from '@/lib/stockCatalog';

const RSIChart = dynamic(() => import('@/components/Charts/RSIChart'), {
    loading: () => <div className="h-[250px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});
const MACDChart = dynamic(() => import('@/components/Charts/MACDChart'), {
    loading: () => <div className="h-[250px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});

interface SentimentAgentData {
    aggregated?: {
        score?: number;
        compound?: number;
        label?: string;
        count?: number;
    };
    articles?: Array<{
        title?: string;
        url?: string;
        publishedAt?: string;
        source?: string;
        sentiment?: {
            score?: number;
            compound?: number;
            label?: string;
        };
    }>;
}

type SentimentArticle = NonNullable<SentimentAgentData['articles']>[number];

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
}

function asText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatMoney(value: number | null | undefined, currency = 'USD') {
    if (!isNumber(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
}

function formatCompact(value: number | null | undefined) {
    if (!isNumber(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(value);
}

function formatPercent(value: number | null | undefined, fromDecimal = false) {
    if (!isNumber(value)) return 'N/A';
    const percent = fromDecimal ? value * 100 : value;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function formatPlainPercent(value: number | null | undefined, fromDecimal = false) {
    if (!isNumber(value)) return 'N/A';
    return `${(fromDecimal ? value * 100 : value).toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
    if (!isNumber(value)) return 'N/A';
    return value.toFixed(2);
}

function labelClass(label?: string) {
    const clean = label?.toLowerCase() || '';
    if (clean.includes('bullish') || clean.includes('positive') || clean.includes('above') || clean.includes('low')) {
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    }
    if (clean.includes('bearish') || clean.includes('negative') || clean.includes('below') || clean.includes('high')) {
        return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
    }
    if (clean.includes('medium') || clean.includes('overbought') || clean.includes('oversold')) {
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    }
    return 'text-slate-300 bg-slate-700/40 border-slate-600/50';
}

function trendIcon(label?: string) {
    const clean = label?.toLowerCase() || '';
    if (clean.includes('bullish')) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (clean.includes('bearish')) return <TrendingDown className="h-4 w-4 text-rose-400" />;
    return <Activity className="h-4 w-4 text-slate-400" />;
}

function normalizeCandles(data: MarketData | null): MarketCandle[] {
    if (data?.candles?.length) return data.candles;
    return (data?.prices || []).map((point) => ({
        date: point.date,
        open: null,
        high: null,
        low: null,
        close: point.price,
        volume: null,
        rsi: null,
        macd: null,
        macdSignal: null,
        macdHistogram: null,
        ema20: null,
        ema50: null,
        ema200: null,
        volatility: null,
    }));
}

function buildAnalystReport(
    symbol: string,
    stockName: string,
    analysis: StockAnalysisData | undefined,
    newsSentiment: SentimentAgentData | null,
) {
    if (!analysis) return [`No current analysis is available for ${symbol}.`];

    const lines = [
        `${stockName || symbol} is being assessed from current market prices, technical indicators, fundamentals, and recent news sentiment.`,
    ];

    const trend = analysis.trends.shortTerm.label;
    const rsi = analysis.technical.rsi;
    const macd = analysis.technical.macd;
    lines.push(
        `Technically, the short-term trend is ${trend.toLowerCase()}, RSI is ${rsi.label.toLowerCase()}${isNumber(rsi.value) ? ` at ${rsi.value.toFixed(1)}` : ''}, and MACD is ${macd.label.toLowerCase()}.`,
    );

    const pe = analysis.fundamentals.peRatio;
    const margin = analysis.fundamentals.profitMargin;
    const growth = analysis.fundamentals.revenueGrowth;
    const fundamentalParts = [
        isNumber(pe) ? `PE ratio is ${pe.toFixed(2)}` : null,
        isNumber(growth) ? `revenue growth is ${formatPlainPercent(growth, true)}` : null,
        isNumber(margin) ? `profit margin is ${formatPlainPercent(margin, true)}` : null,
    ].filter(Boolean);
    lines.push(
        fundamentalParts.length
            ? `Fundamentally, ${fundamentalParts.join(', ')}.`
            : 'Fundamental data is incomplete from the live market provider, so valuation strength should be treated as unavailable rather than assumed.',
    );

    const sentimentLabel = newsSentiment?.aggregated?.label;
    if (sentimentLabel) {
        lines.push(`Recent news sentiment is ${sentimentLabel.toLowerCase()} based on ${newsSentiment.aggregated?.count || 0} analyzed articles.`);
    } else {
        lines.push('Recent news sentiment could not be scored from live data for this symbol.');
    }

    lines.push(
        `Overall risk is ${analysis.risk.overall.toLowerCase()}, with volatility risk ${analysis.risk.volatility.toLowerCase()} and financial risk ${analysis.risk.financial.toLowerCase()}.`,
    );

    return lines;
}

function MetricTile({
    label,
    value,
    subValue,
    tone,
}: {
    label: string;
    value: string;
    subValue?: string;
    tone?: 'positive' | 'negative' | 'neutral';
}) {
    const toneClass =
        tone === 'positive' ? 'text-emerald-400' : tone === 'negative' ? 'text-rose-400' : 'text-slate-100';
    return (
        <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
            {subValue && <div className="mt-1 text-sm text-slate-400">{subValue}</div>}
        </div>
    );
}

function StatusPill({ label }: { label: string }) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${labelClass(label)}`}>
            {label}
        </span>
    );
}

function TrendRow({ label, trend }: { label: string; trend: { label: string; score: number; returnPercent: number | null } }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    {trendIcon(trend.label)}
                    <span>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{formatPercent(trend.returnPercent)}</span>
                    <StatusPill label={trend.label} />
                </div>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
                <div
                    className={`h-full rounded-full ${
                        trend.label === 'Bullish' ? 'bg-emerald-400' : trend.label === 'Bearish' ? 'bg-rose-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.max(8, Math.min(trend.score, 100))}%` }}
                />
            </div>
        </div>
    );
}

export default function StockAnalysisPage() {
    const { showSnackbar } = useSnackbar();
    const [selectedSymbol, setSelectedSymbol] = useState(() => getLastSelectedStockSymbol());
    const [userStocks, setUserStocks] = useState<Stock[]>([]);
    const [marketData, setMarketData] = useState<MarketData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [sentimentData, setSentimentData] = useState<SentimentAgentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);
    const [sentimentError, setSentimentError] = useState<string | null>(null);
    const requestSeq = useRef(0);

    const stockOptions = useMemo(
        () => mergeStockOptions(userStocks.map((stock) => ({
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
        }))),
        [userStocks],
    );

    const loadAnalysis = useCallback(async (symbol: string, mode: 'initial' | 'refresh' = 'initial') => {
        const seq = requestSeq.current + 1;
        requestSeq.current = seq;
        const symUpper = symbol.toUpperCase();

        if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setLoadError(null);
        setNewsError(null);
        setSentimentError(null);

        try {
            const [marketRes, newsRes, sentimentRes] = await Promise.all([
                fetchMarketData(symUpper),
                fetchNewsLive(symUpper),
                runAgent('sentiment', symUpper, 30),
            ]);

            if (requestSeq.current !== seq) return;

            if (marketRes.success && marketRes.data) {
                setMarketData(marketRes.data);
            } else {
                setMarketData(null);
                setLoadError(marketRes.error || `Live market data is unavailable for ${symUpper}.`);
            }

            if (newsRes.success && newsRes.data) {
                setNews(newsRes.data);
            } else {
                setNews([]);
                setNewsError(newsRes.error || `Live news is unavailable for ${symUpper}.`);
            }

            if (sentimentRes.success && sentimentRes.data) {
                setSentimentData(sentimentRes.data as SentimentAgentData);
            } else {
                setSentimentData(null);
                setSentimentError(sentimentRes.error || 'News sentiment scoring is unavailable.');
            }
        } catch (error) {
            if (requestSeq.current !== seq) return;
            const message = error instanceof Error ? error.message : String(error);
            setMarketData(null);
            setNews([]);
            setSentimentData(null);
            setLoadError(`Failed to load stock analysis: ${message}`);
            showSnackbar({ variant: 'error', message: `Failed to load ${symUpper} analysis.` });
        } finally {
            if (requestSeq.current === seq) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [showSnackbar]);

    useEffect(() => {
        loadAnalysis(selectedSymbol);
    }, [selectedSymbol, loadAnalysis]);

    useEffect(() => {
        async function loadStockOptions() {
            const res = await fetchStocks();
            if (res.success && res.data) {
                setUserStocks(res.data);
            }
        }

        loadStockOptions();
    }, []);

    const candles = useMemo(() => normalizeCandles(marketData), [marketData]);
    const analysis = marketData?.analysis;
    const currency = analysis?.metrics.currency || 'USD';
    const stockName = asText(marketData?.info?.name) || stockOptions.find((stock) => stock.symbol === selectedSymbol)?.name || selectedSymbol;
    const sector = asText(marketData?.info?.sector);
    const industry = asText(marketData?.info?.industry);
    const sentimentByUrl = useMemo(() => {
        const map = new Map<string, SentimentArticle['sentiment']>();
        for (const article of sentimentData?.articles || []) {
            if (article.url) map.set(article.url, article.sentiment);
        }
        return map;
    }, [sentimentData]);
    const newsScore = sentimentData?.aggregated?.score ?? sentimentData?.aggregated?.compound ?? null;
    const overallSentimentScore = isNumber(newsScore) ? Math.round((newsScore + 1) * 50) : null;
    const chartData = candles.slice(-90).map((candle) => ({
        date: candle.date,
        price: candle.close,
        volume: candle.volume || 0,
    }));
    const rsiData = candles
        .filter((candle) => isNumber(candle.rsi))
        .slice(-90)
        .map((candle) => ({ date: candle.date, rsi: candle.rsi as number }));
    const macdData = candles
        .filter((candle) => isNumber(candle.macd) && isNumber(candle.macdSignal) && isNumber(candle.macdHistogram))
        .slice(-90)
        .map((candle) => ({
            date: candle.date,
            macd: candle.macd as number,
            signal: candle.macdSignal as number,
            histogram: candle.macdHistogram as number,
        }));
    const analystReport = buildAnalystReport(selectedSymbol, stockName, analysis, sentimentData);

    const currentTone =
        analysis?.metrics.dayChange === null || analysis?.metrics.dayChange === undefined
            ? 'neutral'
            : analysis.metrics.dayChange >= 0
                ? 'positive'
                : 'negative';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Stock Analysis</h1>
                    <p className="text-gray-400">Current stock health, technicals, fundamentals, sentiment, and risk</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <StockSymbolCombobox
                        value={selectedSymbol}
                        onChange={setSelectedSymbol}
                        stocks={userStocks.map((stock) => ({ symbol: stock.symbol, name: stock.name || stock.symbol }))}
                        className="w-full sm:w-[360px]"
                    />
                    <button
                        type="button"
                        onClick={() => loadAnalysis(selectedSymbol, 'refresh')}
                        disabled={loading || refreshing}
                        className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {refreshing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex min-h-[360px] items-center justify-center">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="card">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-bold">{selectedSymbol}</h2>
                                    {analysis?.risk.overall && <StatusPill label={`${analysis.risk.overall} Risk`} />}
                                </div>
                                <p className="mt-1 text-slate-400">{stockName}</p>
                                {(sector || industry) && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        {[sector, industry].filter(Boolean).join(' / ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-left md:text-right">
                                <div className="text-4xl font-bold text-primary">
                                    {formatMoney(analysis?.metrics.currentPrice, currency)}
                                </div>
                                <div className={`mt-1 text-sm font-semibold ${currentTone === 'positive' ? 'text-emerald-400' : currentTone === 'negative' ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {formatMoney(analysis?.metrics.dayChange, currency)} ({formatPercent(analysis?.metrics.dayChangePercent)})
                                </div>
                            </div>
                        </div>
                        {loadError && (
                            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{loadError}</span>
                            </div>
                        )}
                    </div>

                    {analysis && (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                                <MetricTile label="Current Price" value={formatMoney(analysis.metrics.currentPrice, currency)} />
                                <MetricTile
                                    label="Day Change"
                                    value={formatPercent(analysis.metrics.dayChangePercent)}
                                    subValue={formatMoney(analysis.metrics.dayChange, currency)}
                                    tone={currentTone}
                                />
                                <MetricTile label="52 Week High" value={formatMoney(analysis.metrics.fiftyTwoWeekHigh, currency)} />
                                <MetricTile label="52 Week Low" value={formatMoney(analysis.metrics.fiftyTwoWeekLow, currency)} />
                                <MetricTile label="Market Cap" value={formatCompact(analysis.metrics.marketCap)} />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-3">
                                <div className="card xl:col-span-2">
                                    <div className="mb-4 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Price & Volume</h3>
                                    </div>
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={340}>
                                            <ComposedChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                <YAxis yAxisId="price" stroke="#38bdf8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                                                <YAxis yAxisId="volume" orientation="right" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCompact} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1e293b',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px',
                                                        color: '#f8fafc',
                                                    }}
                                                    formatter={(value: number, name: string) => name === 'Volume' ? formatCompact(value) : formatMoney(value, currency)}
                                                />
                                                <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="#475569" opacity={0.5} />
                                                <Line yAxisId="price" type="monotone" dataKey="price" name="Price" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-[340px] items-center justify-center text-slate-400">
                                            No market candles available for {selectedSymbol}.
                                        </div>
                                    )}
                                </div>

                                <div className="card">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Volume Analysis</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <MetricTile label="Latest Volume" value={formatCompact(analysis.volume.latestVolume)} />
                                        <MetricTile label="20-Day Avg Volume" value={formatCompact(analysis.volume.averageVolume20)} />
                                        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/45 p-4">
                                            <div>
                                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Volume Signal</div>
                                                <div className="mt-2 text-lg font-bold">{formatRatio(analysis.volume.ratioToAverage)}x avg</div>
                                            </div>
                                            <StatusPill label={analysis.volume.label} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="card">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Gauge className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Technical Indicators</h3>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <MetricTile label="RSI" value={isNumber(analysis.technical.rsi.value) ? analysis.technical.rsi.value.toFixed(1) : 'N/A'} subValue={analysis.technical.rsi.label} />
                                        <MetricTile label="MACD" value={isNumber(analysis.technical.macd.value) ? analysis.technical.macd.value.toFixed(2) : 'N/A'} subValue={analysis.technical.macd.label} />
                                        <MetricTile label="EMA 20" value={formatMoney(analysis.technical.ema20.value, currency)} subValue={analysis.technical.ema20.label} />
                                        <MetricTile label="EMA 50" value={formatMoney(analysis.technical.ema50.value, currency)} subValue={analysis.technical.ema50.label} />
                                        <MetricTile label="EMA 200" value={formatMoney(analysis.technical.ema200.value, currency)} subValue={analysis.technical.ema200.label} />
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Trend Analysis</h3>
                                    </div>
                                    <div className="space-y-5">
                                        <TrendRow label="Short-Term Trend" trend={analysis.trends.shortTerm} />
                                        <TrendRow label="Mid-Term Trend" trend={analysis.trends.midTerm} />
                                        <TrendRow label="Long-Term Trend" trend={analysis.trends.longTerm} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="card">
                                    <h3 className="mb-4 text-xl font-bold">RSI (14)</h3>
                                    {rsiData.length > 0 ? <RSIChart data={rsiData} /> : <div className="flex h-[250px] items-center justify-center text-slate-400">RSI data unavailable.</div>}
                                </div>
                                <div className="card">
                                    <h3 className="mb-4 text-xl font-bold">MACD</h3>
                                    {macdData.length > 0 ? <MACDChart data={macdData} /> : <div className="flex h-[250px] items-center justify-center text-slate-400">MACD data unavailable.</div>}
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-3">
                                <div className="card">
                                    <h3 className="mb-4 text-xl font-bold">Support & Resistance</h3>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                        <MetricTile label="Support 1" value={formatMoney(analysis.supportResistance.support1, currency)} />
                                        <MetricTile label="Support 2" value={formatMoney(analysis.supportResistance.support2, currency)} />
                                        <MetricTile label="Resistance 1" value={formatMoney(analysis.supportResistance.resistance1, currency)} />
                                        <MetricTile label="Resistance 2" value={formatMoney(analysis.supportResistance.resistance2, currency)} />
                                    </div>
                                </div>

                                <div className="card lg:col-span-2">
                                    <h3 className="mb-4 text-xl font-bold">Fundamental Analysis</h3>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <MetricTile label="PE Ratio" value={formatRatio(analysis.fundamentals.peRatio)} />
                                        <MetricTile label="Revenue Growth" value={formatPlainPercent(analysis.fundamentals.revenueGrowth, true)} />
                                        <MetricTile label="EPS" value={formatMoney(analysis.fundamentals.eps, currency)} />
                                        <MetricTile label="Profit Margin" value={formatPlainPercent(analysis.fundamentals.profitMargin, true)} />
                                        <MetricTile label="Debt Ratio" value={formatRatio(analysis.fundamentals.debtToEquity)} />
                                        <MetricTile label="Cash Flow" value={formatCompact(analysis.fundamentals.cashFlow)} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="card">
                                    <h3 className="mb-4 text-xl font-bold">Sentiment Analysis</h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">News Sentiment</div>
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <span className="text-xl font-bold capitalize">{sentimentData?.aggregated?.label || 'N/A'}</span>
                                                <StatusPill label={sentimentData?.aggregated?.label || 'N/A'} />
                                            </div>
                                            {sentimentError && <p className="mt-2 text-sm text-amber-400">{sentimentError}</p>}
                                        </div>
                                        <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Social Media Sentiment</div>
                                            <div className="mt-2 text-xl font-bold text-slate-400">Unavailable</div>
                                            <p className="mt-1 text-sm text-slate-500">No social data source is configured.</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Analyst Sentiment</div>
                                            <div className="mt-2 text-xl font-bold capitalize">{String(analysis.fundamentals.analystSentiment || 'N/A')}</div>
                                            <p className="mt-1 text-sm text-slate-500">Rating: {formatRatio(analysis.fundamentals.analystRating)}</p>
                                        </div>
                                        <MetricTile label="Overall Sentiment Score" value={isNumber(overallSentimentScore) ? `${overallSentimentScore}/100` : 'N/A'} />
                                    </div>
                                </div>

                                <div className="card">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-primary" />
                                        <h3 className="text-xl font-bold">Risk Assessment</h3>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <MetricTile label="Financial Risk" value={analysis.risk.financial} />
                                        <MetricTile label="Market Risk" value={analysis.risk.market} />
                                        <MetricTile label="Volatility Risk" value={analysis.risk.volatility} />
                                        <MetricTile label="Overall Risk" value={analysis.risk.overall} subValue={isNumber(analysis.risk.score) ? `${analysis.risk.score}/100` : undefined} />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="mb-4 flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-primary" />
                                    <h3 className="text-xl font-bold">AI Analyst Report</h3>
                                </div>
                                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/10 p-4 text-slate-200">
                                    {analystReport.map((line) => (
                                        <p key={line} className="leading-relaxed">{line}</p>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="card">
                        <h3 className="mb-4 text-xl font-bold">Recent News</h3>
                        {newsError && <p className="mb-4 text-sm text-amber-400">{newsError}</p>}
                        {news.length === 0 ? (
                            <p className="py-8 text-center text-slate-400">No live news found for {selectedSymbol}</p>
                        ) : (
                            <div className="space-y-4">
                                {news.slice(0, 10).map((item) => {
                                    const sentiment = sentimentByUrl.get(item.url);
                                    return (
                                        <a
                                            key={item.url || item.id}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-lg bg-dark-200 p-4 transition-colors hover:bg-dark-300"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <h4 className="font-semibold text-slate-100">{item.title}</h4>
                                                {sentiment?.label && <StatusPill label={sentiment.label} />}
                                            </div>
                                            {item.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{item.description}</p>}
                                            <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
                                                <span>{item.source}</span>
                                                <span>/</span>
                                                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
