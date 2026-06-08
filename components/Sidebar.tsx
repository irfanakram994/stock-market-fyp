'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    // Wallet, // Temporarily disabled
    TrendingUp,
    Brain,
    FlaskConical,
    BarChart3,
    ScrollText,
    Info,
    MessageSquare,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    // { icon: Wallet, label: 'Portfolio', href: '/dashboard/portfolio' }, // Temporarily disabled
    { icon: TrendingUp, label: 'Stock Analysis', href: '/dashboard/stock-analysis' },
    { icon: Brain, label: 'AI Predictions', href: '/dashboard/ai-predictions' },
    { icon: MessageSquare, label: 'Chatbot', href: '/dashboard/chatbot' },
    { icon: FlaskConical, label: 'Backtesting', href: '/dashboard/backtesting' },
    { icon: BarChart3, label: 'Visualizations', href: '/dashboard/visualizations' },
    { icon: ScrollText, label: 'Agent Logs', href: '/dashboard/agent-logs' },
    { icon: Info, label: 'About Project', href: '/dashboard/about' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div
            className={`h-screen bg-gradient-to-b from-dark-100 to-dark-100/80 border-r border-gray-700/50 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
                } flex flex-col`}
        >
            {/* Logo */}
            <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-dark-100 to-dark-100/50">
                {!collapsed && (
                    <div className="flex items-center space-x-3">
                        <Image
                            src="/logo-only-no-text.png"
                            alt="TradeFlux"
                            width={42}
                            height={42}
                            className="h-10 w-10 object-contain"
                        />
                        <div className="flex flex-col leading-tight">
                            <span className="gradient-text text-lg font-semibold">TradeFlux</span>
                            <span className="text-xs text-gray-400 -mt-0.5">AI Stock Insights</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <Image
                        src="/logo-only-no-text.png"
                        alt="TradeFlux"
                        width={36}
                        height={36}
                        className="mx-auto h-9 w-9 object-contain"
                    />
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-white shadow-lg shadow-primary/30 font-medium'
                                : 'text-gray-400 hover:bg-dark-200/60 hover:text-primary hover:shadow-md hover:shadow-primary/10'
                                } ${collapsed ? 'justify-center' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!collapsed && <span className="font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <div className="p-4 border-t border-gray-700/50 bg-gradient-to-r from-dark-100/50 to-dark-100">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg bg-dark-200/40 hover:bg-primary/10 hover:text-primary text-gray-400 transition-all duration-200 border border-gray-700/30 hover:border-primary/50"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5 mr-2" />
                            <span className="font-medium">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
