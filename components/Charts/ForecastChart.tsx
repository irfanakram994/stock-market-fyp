'use client';

import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const defaultData = [
    // Historical data
    { date: '2026-01-15', actual: 171.30, predicted: null, lower: null, upper: null },
    { date: '2026-01-22', actual: 169.80, predicted: null, lower: null, upper: null },
    { date: '2026-01-29', actual: 174.20, predicted: null, lower: null, upper: null },
    { date: '2026-02-05', actual: 178.50, predicted: null, lower: null, upper: null },
    // Forecast data
    { date: '2026-02-12', actual: null, predicted: 180.20, lower: 176.50, upper: 183.90 },
    { date: '2026-02-19', actual: null, predicted: 182.10, lower: 177.80, upper: 186.40 },
    { date: '2026-02-26', actual: null, predicted: 183.80, lower: 178.50, upper: 189.10 },
    { date: '2026-03-05', actual: null, predicted: 185.20, lower: 179.20, upper: 191.20 },
];

interface ForecastChartProps {
    data?: { date: string; actual: number | null; predicted: number | null; lower: number | null; upper: number | null }[];
}

export default function ForecastChart({ data = defaultData }: ForecastChartProps) {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
                <defs>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc'
                    }}
                />
                <Legend />

                {/* Confidence interval */}
                <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="url(#colorConfidence)"
                    name="Upper Bound"
                />
                <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="url(#colorConfidence)"
                    name="Lower Bound"
                />

                {/* Actual price */}
                <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    name="Actual"
                    dot={{ fill: '#94a3b8', r: 4 }}
                />

                {/* Predicted price */}
                <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Predicted"
                    dot={{ fill: '#0ea5e9', r: 5 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
