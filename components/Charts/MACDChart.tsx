'use client';

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const defaultData = [
    { date: '2026-01-01', macd: 0.5, signal: 0.3, histogram: 0.2 },
    { date: '2026-01-08', macd: 1.2, signal: 0.8, histogram: 0.4 },
    { date: '2026-01-15', macd: 1.8, signal: 1.3, histogram: 0.5 },
    { date: '2026-01-22', macd: 1.5, signal: 1.6, histogram: -0.1 },
    { date: '2026-01-29', macd: 2.1, signal: 1.8, histogram: 0.3 },
    { date: '2026-02-05', macd: 2.5, signal: 2.2, histogram: 0.3 },
];

interface MACDChartProps {
    data?: { date: string; macd: number; signal: number; histogram: number }[];
}

export default function MACDChart({ data = defaultData }: MACDChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={data}>
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
                <Legend />
                <Line
                    type="monotone"
                    dataKey="macd"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="MACD"
                    dot={false}
                />
                <Line
                    type="monotone"
                    dataKey="signal"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Signal"
                    dot={false}
                />
                <Bar
                    dataKey="histogram"
                    fill="#22c55e"
                    name="Histogram"
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
