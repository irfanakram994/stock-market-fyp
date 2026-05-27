'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const defaultData = [
    { date: '2026-01-01', rsi: 45 },
    { date: '2026-01-08', rsi: 52 },
    { date: '2026-01-15', rsi: 58 },
    { date: '2026-01-22', rsi: 48 },
    { date: '2026-01-29', rsi: 62 },
    { date: '2026-02-05', rsi: 68 },
];

interface RSIChartProps {
    data?: { date: string; rsi: number }[];
}

export default function RSIChart({ data = defaultData }: RSIChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    domain={[0, 100]}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc'
                    }}
                />
                {/* Overbought line */}
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overbought', fill: '#ef4444', fontSize: 12 }} />
                {/* Oversold line */}
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Oversold', fill: '#22c55e', fontSize: 12 }} />
                <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
