'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const defaultData = [
    { date: '2026-01-01', price: 165.20 },
    { date: '2026-01-08', price: 168.50 },
    { date: '2026-01-15', price: 171.30 },
    { date: '2026-01-22', price: 169.80 },
    { date: '2026-01-29', price: 174.20 },
    { date: '2026-02-05', price: 178.50 },
];

interface PriceChartProps {
    data?: { date: string; price: number }[];
}

export default function PriceChart({ data = defaultData }: PriceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
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
                <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
