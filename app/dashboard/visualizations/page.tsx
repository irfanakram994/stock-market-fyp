'use client';

import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStocks, fetchPredictions, Stock, Prediction } from '@/lib/api';

export default function VisualizationsPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [predictions, setPredictions] = useState<Record<string, Prediction[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const stockRes = await fetchStocks();
            if (stockRes.success && stockRes.data) {
                setStocks(stockRes.data);

                // Fetch predictions for each stock (up to 6 stocks)
                const predMap: Record<string, Prediction[]> = {};
                const topStocks = stockRes.data.slice(0, 6);
                await Promise.all(
                    topStocks.map(async (s) => {
                        const predRes = await fetchPredictions(s.symbol, 10);
                        if (predRes.success && predRes.data) {
                            predMap[s.symbol] = predRes.data;
                        }
                    })
                );
                setPredictions(predMap);
            }
            setLoading(false);
        }
        loadData();
    }, []);

    // Build multi-stock comparison data
    const allDates = new Set<string>();
    Object.values(predictions).forEach(preds => {
        preds.forEach(p => allDates.add(new Date(p.predictionDate).toLocaleDateString('en-CA')));
    });
    const sortedDates = Array.from(allDates).sort();

    const chartData = sortedDates.map(date => {
        const row: Record<string, string | number> = { date };
        Object.entries(predictions).forEach(([symbol, preds]) => {
            const match = preds.find(p => new Date(p.predictionDate).toLocaleDateString('en-CA') === date);
            if (match) row[symbol.toLowerCase()] = match.predictedPrice;
        });
        return row;
    });

    const chartColors = ['#0ea5e9', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#ec4899'];
    const stockSymbols = Object.keys(predictions);

    // Compute top performers, losers, volatile from predictions
    const stockChanges = stockSymbols.map(symbol => {
        const preds = predictions[symbol];
        if (preds.length < 2) return { symbol, change: 0 };
        const sorted = [...preds].sort((a, b) => new Date(a.predictionDate).getTime() - new Date(b.predictionDate).getTime());
        const first = sorted[0].predictedPrice;
        const last = sorted[sorted.length - 1].predictedPrice;
        const change = ((last - first) / first) * 100;
        return { symbol, change: parseFloat(change.toFixed(1)) };
    });

    const topPerformers = [...stockChanges].sort((a, b) => b.change - a.change).slice(0, 3);
    const topLosers = [...stockChanges].sort((a, b) => a.change - b.change).slice(0, 3);

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
            <div>
                <h1 className="text-3xl font-bold mb-2">Advanced Visualizations</h1>
                <p className="text-gray-400">Multi-stock comparisons and advanced analytics</p>
            </div>

            {/* Multi-Stock Comparison */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Multi-Stock Comparison</h2>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData}>
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
                            />
                            {stockSymbols.map((sym, idx) => (
                                <Line
                                    key={sym}
                                    type="monotone"
                                    dataKey={sym.toLowerCase()}
                                    stroke={chartColors[idx % chartColors.length]}
                                    strokeWidth={2}
                                    name={sym}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-400">
                        No prediction data available. Add stocks and run predictions to see comparisons.
                    </div>
                )}
            </div>

            {/* Sentiment Timeline */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Sentiment Timeline</h2>
                <div className="h-64 flex items-center justify-center text-gray-400">
                    Sentiment timeline chart will be displayed here
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="font-bold mb-4">Top Performers</h3>
                    <div className="space-y-3">
                        {topPerformers.length > 0 ? topPerformers.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-semibold">{item.symbol}</span>
                                <span className={item.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {item.change >= 0 ? '+' : ''}{item.change}%
                                </span>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-sm">No data yet</p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold mb-4">Top Losers</h3>
                    <div className="space-y-3">
                        {topLosers.length > 0 ? topLosers.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-semibold">{item.symbol}</span>
                                <span className={item.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {item.change >= 0 ? '+' : ''}{item.change}%
                                </span>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-sm">No data yet</p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold mb-4">Active Stocks</h3>
                    <div className="space-y-3">
                        {stocks.length > 0 ? stocks.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <span className="font-semibold">{item.symbol}</span>
                                <span className="text-primary">{item.name}</span>
                            </div>
                        )) : (
                            <p className="text-gray-400 text-sm">No stocks tracked</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
