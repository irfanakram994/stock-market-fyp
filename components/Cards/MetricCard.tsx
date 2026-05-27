'use client';

import { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change: number;
    icon: React.ReactNode;
    trend: 'up' | 'down';
}

export default function MetricCard({ title, value, change, icon, trend }: MetricCardProps) {
    const isPositive = change > 0;

    return (
        <div className="card">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {icon}
                </div>
                <div className={`flex items-center space-x-1 text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span>{Math.abs(change)}%</span>
                </div>
            </div>
            <div>
                <p className="text-gray-400 text-sm mb-1">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}
