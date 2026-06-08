'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Loader, RefreshCw, Zap } from 'lucide-react';
import { fetchMarketData, fetchNews, fetchNewsLive, fetchPredictions, fetchStocks, runAgent, NewsItem, Stock, RunPredictionData } from '@/lib/api';
import { useSnackbar } from '@/components/SnackbarProvider';
import StockSymbolCombobox from '@/components/StockSymbolCombobox';
import { getLastSelectedStockSymbol, mergeStockOptions } from '@/lib/stockCatalog';

const PriceChart = dynamic(() => import('@/components/Charts/PriceChart'), {
    loading: () => <div className="h-[300px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});
const ForecastChart = dynamic(() => import('@/components/Charts/ForecastChart'), {
    loading: () => <div className="h-[430px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});
const RSIChart = dynamic(() => import('@/components/Charts/RSIChart'), {
    loading: () => <div className="h-[250px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});
const MACDChart = dynamic(() => import('@/components/Charts/MACDChart'), {
    loading: () => <div className="h-[250px] rounded-lg bg-slate-800/60 animate-pulse" />,
    ssr: false,
});

interface PredictionData {
    date: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
}

export default function StockAnalysisPage() {
    const { showSnackbar } = useSnackbar();
    const [selectedSymbol, setSelectedSymbol] = useState(() => getLastSelectedStockSymbol());
    const [userStocks, setUserStocks] = useState<Stock[]>([]);
    const [stockName, setStockName] = useState<string>('');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [predictions, setPredictions] = useState<PredictionData[]>([]);
    const [forecastPayload, setForecastPayload] = useState<RunPredictionData | null>(null);
    const [priceChartData, setPriceChartData] = useState<Array<{ date: string; price: number }>>([]);
    const [latestPrice, setLatestPrice] = useState<number | null>(null);
    const [trend, setTrend] = useState<string>('');
    const [sentiment, setSentiment] = useState<number | null>(null);
    const [insight, setInsight] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [liveLoading, setLiveLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [newsError, setNewsError] = useState<string | null>(null);
    const requestSeq = useRef(0);

    const stockOptions = useMemo(
        () => mergeStockOptions(userStocks.map((stock) => ({
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
        }))),
        [userStocks],
    );

    const predictionChartData = predictions
        .map((p) => ({ date: p.date, price: p.predictedPrice }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const displayChartData = priceChartData.length > 0 ? priceChartData : predictionChartData;
    const chartSourceLabel = priceChartData.length > 0 ? 'Market price history' : predictionChartData.length > 0 ? 'Prediction history' : null;

    const loadStoredData = useCallback(async (sym: string) => {
        const seq = requestSeq.current + 1;
        requestSeq.current = seq;
        setLoading(true);
        setLoadError(null);
        setNewsError(null);
        const symUpper = sym.toUpperCase();

        try {
            const [newsRes, predRes] = await Promise.all([
                fetchNews(symUpper, 20),
                fetchPredictions(symUpper, 10),
            ]);

            if (requestSeq.current !== seq) return;

            setPriceChartData([]);
            setLatestPrice(null);
            setForecastPayload(null);
            const knownStock = stockOptions.find((stock) => stock.symbol === symUpper);
            setStockName(knownStock?.name || symUpper);

            if (newsRes.success && newsRes.data) {
                setNews(newsRes.data);
            } else {
                setNews([]);
                if (!newsRes.success) setNewsError(newsRes.error || 'Stored news is unavailable for this symbol.');
            }

            if (predRes.success && predRes.data) {
                const stored = predRes.data.map((p) => ({
                    date: p.predictionDate,
                    predictedPrice: p.predictedPrice,
                    lowerBound: p.lowerBound,
                    upperBound: p.upperBound,
                    confidence: p.confidence,
                }));
                setPredictions(stored);
                setTrend(predRes.data[0]?.trend || '');
                setSentiment(null);
                setInsight(predRes.data[0]?.llmSummary || '');
            } else {
                setPredictions([]);
                setTrend('');
                setSentiment(null);
                setInsight('');
                if (!predRes.success) setLoadError(predRes.error || `Stored predictions for ${symUpper} are unavailable.`);
            }
        } catch (error) {
            if (requestSeq.current !== seq) return;
            const message = error instanceof Error ? error.message : String(error);
            setLoadError(`Failed to load stock data: ${message}`);
            setPriceChartData([]);
            setLatestPrice(null);
            setForecastPayload(null);
            setStockName(symUpper);
            setNews([]);
            setNewsError('Failed to load news. Please check your Python agents and API configuration.');
            setPredictions([]);
            setTrend('');
            setSentiment(null);
            setInsight('');
        } finally {
            if (requestSeq.current === seq) setLoading(false);
        }
    }, [stockOptions]);

    useEffect(() => {
        loadStoredData(selectedSymbol);
    }, [selectedSymbol, loadStoredData]);

    useEffect(() => {
        async function loadStockOptions() {
            const res = await fetchStocks();
            if (res.success && res.data) {
                setUserStocks(res.data);
            }
        }

        loadStockOptions();
    }, []);

    const handleRunLiveAnalysis = useCallback(async (forecastDays = 30) => {
        const seq = requestSeq.current + 1;
        requestSeq.current = seq;
        const symUpper = selectedSymbol.toUpperCase();

        setLiveLoading(true);
        setLoadError(null);
        setNewsError(null);

        try {
            const [marketRes, newsRes, predRes] = await Promise.all([
                fetchMarketData(symUpper),
                fetchNewsLive(symUpper),
                runAgent('prediction', symUpper, forecastDays),
            ]);

            if (requestSeq.current !== seq) return;

            if (marketRes.success && marketRes.data?.prices?.length) {
                const prices = marketRes.data.prices
                    .map((p) => ({ date: p.date.split('T')[0] || p.date, price: p.price }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setPriceChartData(prices);
                setLatestPrice(prices[prices.length - 1]?.price ?? null);
                setStockName((marketRes.data.info as { name?: string })?.name || symUpper);
            } else {
                setPriceChartData([]);
                setLatestPrice(null);
                setLoadError(
                    marketRes.error ||
                    (marketRes.success ? 'No market price data available for this symbol.' : 'No market data'),
                );
            }

            if (newsRes.success && newsRes.data) {
                setNews(newsRes.data);
            } else {
                const fallbackRes = await fetchNews(symUpper);
                if (requestSeq.current !== seq) return;
                if (fallbackRes.success && fallbackRes.data) {
                    setNews(fallbackRes.data);
                    setNewsError(
                        newsRes.error
                            ? `Live news unavailable: ${newsRes.error}. Showing stored news.`
                            : 'Live news unavailable; showing stored news.',
                    );
                } else {
                    setNewsError(newsRes.error || fallbackRes.error || 'No news available for this symbol.');
                }
            }

            if (predRes.success && predRes.data) {
                const pd = predRes.data as any;
                setPredictions(pd.predictions || []);
                setForecastPayload(pd as RunPredictionData);
                setTrend(pd.trend || '');
                setSentiment(pd.sentimentScore ?? null);
                setInsight(pd.insight || '');
            } else {
                showSnackbar({
                    variant: 'warning',
                    message: predRes.error || `Live prediction for ${symUpper} was unavailable.`,
                });
            }
        } catch (error) {
            if (requestSeq.current !== seq) return;
            const message = error instanceof Error ? error.message : String(error);
            setLoadError(`Failed to run live analysis: ${message}`);
        } finally {
            if (requestSeq.current === seq) setLiveLoading(false);
        }
    }, [selectedSymbol, showSnackbar]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Stock Analysis</h1>
                    <p className="text-gray-400">Stored insights first, live agent analysis on demand</p>
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
                        onClick={() => handleRunLiveAnalysis(30)}
                        disabled={liveLoading || loading}
                        className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {liveLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {liveLoading ? 'Analyzing...' : 'Run Live Analysis'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Stock Info Card */}
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{selectedSymbol}</h2>
                                <p className="text-gray-400">{stockName || selectedSymbol}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-primary">
                                    {latestPrice != null ? `$${latestPrice.toFixed(2)}` : predictions[0] ? `$${predictions[0].predictedPrice.toFixed(2)}` : '—'}
                                </div>
                                {trend && (
                                    <div className={`flex items-center justify-end space-x-2 ${trend === 'bullish' ? 'text-green-400' : trend === 'bearish' ? 'text-red-400' : 'text-gray-400'}`}>
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="font-semibold">{trend}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                                {loadError && (
                                    <p className="text-amber-400 text-sm mt-2">{loadError}</p>
                                )}
                                {!liveLoading && priceChartData.length === 0 && predictions.length > 0 && (
                                    <p className="text-slate-500 text-sm mt-2">
                                        Showing stored prediction data. Run live analysis for current market data.
                                    </p>
                                )}
                            </div>

                    {/* Price Chart */}
                    <div className="card">
                        <h3 className="text-xl font-bold mb-4">Price History</h3>
                        {forecastPayload?.forecast?.length || forecastPayload?.predictions?.length ? (
                            <ForecastChart
                                data={predictionChartData.map((point) => ({
                                    date: point.date,
                                    actual: null,
                                    predicted: point.price,
                                    lower: null,
                                    upper: null,
                                }))}
                                forecast={forecastPayload.forecast || forecastPayload.predictions}
                                historical={forecastPayload.historical}
                                components={forecastPayload.components}
                                modelMetrics={forecastPayload.modelMetrics}
                                symbol={selectedSymbol}
                                forecastDays={forecastPayload.modelMetrics?.forecastDays || forecastPayload.forecast?.length || 30}
                                loading={liveLoading}
                                onHorizonChange={handleRunLiveAnalysis}
                            />
                        ) : displayChartData.length > 0 ? (
                            <>
                                <PriceChart data={displayChartData} />
                                {chartSourceLabel && (
                                    <p className="mt-3 text-sm text-gray-400">
                                        Showing <span className="font-semibold">{chartSourceLabel}</span>.
                                        {priceChartData.length === 0 && predictionChartData.length > 0 &&
                                            ' Live market data was unavailable, so the chart uses the latest prediction data instead.'}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2">
                                <p>No price data available for {selectedSymbol}</p>
                                <p className="text-sm">Run live analysis to fetch current market data from the agent.</p>
                                {loadError && <p className="text-sm text-amber-400">{loadError}</p>}
                            </div>
                        )}
                    </div>

                    {/* Prediction Summary */}
                    {predictions.length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold mb-4">AI Prediction & Insight</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">7-Day Forecast</h4>
                                    <div className="space-y-2">
                                        {predictions.slice(0, 7).map((pred, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-dark-200 rounded">
                                                <span className="text-sm">{new Date(pred.date).toLocaleDateString()}</span>
                                                <span className="font-semibold text-primary">${pred.predictedPrice.toFixed(2)}</span>
                                                <span className="text-xs text-gray-400">{Math.round(pred.confidence * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Analysis</h4>
                                    <div className="space-y-3">
                                        {sentiment !== null && (
                                            <div>
                                                <p className="text-xs text-gray-400">Sentiment</p>
                                                <p className={`text-lg font-semibold ${sentiment > 0 ? 'text-green-400' : sentiment < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {sentiment > 0 ? 'Positive' : sentiment < 0 ? 'Negative' : 'Neutral'} ({sentiment.toFixed(2)})
                                                </p>
                                            </div>
                                        )}
                                        {insight && (
                                            <div>
                                                <p className="text-xs text-gray-400">Insight</p>
                                                <p className="text-sm text-gray-300">{insight}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Technical Indicators Grid */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* RSI */}
                        <div className="card">
                            <h3 className="text-xl font-bold mb-4">RSI (14)</h3>
                            <RSIChart />
                        </div>

                        {/* MACD */}
                        <div className="card">
                            <h3 className="text-xl font-bold mb-4">MACD</h3>
                            <MACDChart />
                        </div>
                    </div>

                    {/* News Feed */}
                    <div className="card">
                        <h3 className="text-xl font-bold mb-4">Recent News</h3>
                        <button
                            type="button"
                            onClick={() => handleRunLiveAnalysis(30)}
                            disabled={liveLoading}
                            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-primary/60 hover:bg-slate-700 disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${liveLoading ? 'animate-spin' : ''}`} />
                            Refresh live data
                        </button>
                        {newsError && (
                            <p className="text-sm text-amber-400 mb-4">{newsError}</p>
                        )}
                        {news.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No news found for {selectedSymbol}</p>
                        ) : (
                            <div className="space-y-4">
                                {news.map((item, idx) => (
                                    <a
                                        key={idx}
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4 bg-dark-200 rounded-lg hover:bg-dark-300 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold flex-1">{item.title}</h4>
                                            {item.sentiment && (
                                                <span className={`ml-3 px-2 py-1 rounded text-xs font-semibold ${item.sentiment.label === 'positive' ? 'bg-green-500/20 text-green-400' :
                                                    item.sentiment.label === 'negative' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {item.sentiment.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                                            <span>{item.source}</span>
                                            <span>•</span>
                                            <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
