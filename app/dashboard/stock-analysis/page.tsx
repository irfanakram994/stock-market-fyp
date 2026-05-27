'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, TrendingUp, Loader } from 'lucide-react';
import PriceChart from '@/components/Charts/PriceChart';
import RSIChart from '@/components/Charts/RSIChart';
import MACDChart from '@/components/Charts/MACDChart';
import { fetchMarketData, fetchNewsLive, runPrediction, NewsItem } from '@/lib/api';

interface PredictionData {
    date: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
}

export default function StockAnalysisPage() {
    const [symbol, setSymbol] = useState('AAPL');
    const [searchSymbol, setSearchSymbol] = useState('AAPL');
    const [stockName, setStockName] = useState<string>('');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [predictions, setPredictions] = useState<PredictionData[]>([]);
    const [priceChartData, setPriceChartData] = useState<Array<{ date: string; price: number }>>([]);
    const [latestPrice, setLatestPrice] = useState<number | null>(null);
    const [trend, setTrend] = useState<string>('');
    const [sentiment, setSentiment] = useState<number | null>(null);
    const [insight, setInsight] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadData = useCallback(async (sym: string) => {
        setLoading(true);
        setLoadError(null);
        const symUpper = sym.toUpperCase();
        const [marketRes, newsRes, predRes] = await Promise.all([
            fetchMarketData(symUpper),
            fetchNewsLive(symUpper),
            runPrediction(symUpper, 30),
        ]);

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
            setStockName(symUpper);
            if (!marketRes.success) setLoadError(marketRes.error || 'No market data');
        }
        if (newsRes.success && newsRes.data) setNews(newsRes.data);
        else setNews([]);
        if (predRes.success && predRes.data) {
            const pd = predRes.data as any;
            setPredictions(pd.predictions || []);
            setTrend(pd.trend || '');
            setSentiment(pd.sentimentScore ?? null);
            setInsight(pd.insight || '');
        } else {
            setPredictions([]);
            setTrend('');
            setSentiment(null);
            setInsight('');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData(searchSymbol);
    }, [searchSymbol, loadData]);

    const handleSearch = () => {
        setSearchSymbol(symbol.toUpperCase());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Stock Analysis</h1>
                    <p className="text-gray-400">Real-time data and technical indicators</p>
                </div>

                {/* Stock Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter symbol..."
                        className="w-full pl-10 pr-4 py-2 bg-dark-200 border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors text-gray-200"
                    />
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
                                <h2 className="text-2xl font-bold mb-1">{searchSymbol}</h2>
                                <p className="text-gray-400">{stockName || searchSymbol}</p>
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
                    </div>

                    {/* Price Chart */}
                    <div className="card">
                        <h3 className="text-xl font-bold mb-4">Price History</h3>
                        {priceChartData.length > 0 ? (
                            <PriceChart data={priceChartData} />
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2">
                                <p>No price data available for {searchSymbol}</p>
                                <p className="text-sm">Ensure Python agents are installed and the market agent can reach Yahoo Finance.</p>
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
                        {news.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No news found for {searchSymbol}</p>
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
