'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ArrowRight,
    ArrowUpRight,
    Bot,
    Brain,
    CandlestickChart,
    ChevronRight,
    Database,
    FlaskConical,
    Gauge,
    LineChart,
    Newspaper,
    PieChart,
    Shield,
    TrendingUp,
    Users,
    Workflow,
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/authContext';
import { resolveCurrentRole } from '@/lib/roleRouting';

const marketTickers = [
    { symbol: 'AAPL', value: '$214.32', change: '+1.8%' },
    { symbol: 'MSFT', value: '$468.14', change: '+0.9%' },
    { symbol: 'NVDA', value: '$142.76', change: '+2.4%' },
    { symbol: 'TSLA', value: '$186.90', change: '-0.7%' },
    { symbol: 'AMZN', value: '$183.22', change: '+1.1%' },
];

const platformFeatures = [
    {
        icon: Brain,
        title: 'AI Predictions',
        description: 'Run Prophet-backed forecasts with trend direction, confidence, and LLM summaries.',
        accent: 'text-sky-300',
        soft: 'bg-sky-400/10',
        border: 'border-sky-300/20',
    },
    {
        icon: CandlestickChart,
        title: 'Stock Analysis',
        description: 'Inspect live market context, price history, and technical indicator snapshots.',
        accent: 'text-emerald-300',
        soft: 'bg-emerald-400/10',
        border: 'border-emerald-300/20',
    },
    {
        icon: FlaskConical,
        title: 'Backtesting',
        description: 'Validate strategies against historical candles before trusting a new idea.',
        accent: 'text-violet-300',
        soft: 'bg-violet-400/10',
        border: 'border-violet-300/20',
    },
    {
        icon: Newspaper,
        title: 'News Sentiment',
        description: 'Blend market news, VADER sentiment, and AI explanation into readable signals.',
        accent: 'text-amber-300',
        soft: 'bg-amber-400/10',
        border: 'border-amber-300/20',
    },
    {
        icon: PieChart,
        title: 'Visualizations',
        description: 'Move from raw forecasts into charts that are easier to compare and explain.',
        accent: 'text-cyan-300',
        soft: 'bg-cyan-400/10',
        border: 'border-cyan-300/20',
    },
    {
        icon: Bot,
        title: 'Agent Logs',
        description: 'Review agent execution records so the workflow stays transparent and debuggable.',
        accent: 'text-rose-300',
        soft: 'bg-rose-400/10',
        border: 'border-rose-300/20',
    },
];

const workflowSteps = [
    {
        icon: LineChart,
        label: 'Choose a stock',
        description: 'Search a symbol and pull the latest market context into the workspace.',
    },
    {
        icon: Brain,
        label: 'Run AI forecast',
        description: 'Forecasting agents prepare price projections, confidence, and trend notes.',
    },
    {
        icon: Newspaper,
        label: 'Read the signal',
        description: 'News sentiment and AI summaries add context around the prediction.',
    },
    {
        icon: Shield,
        label: 'Validate decision',
        description: 'Backtesting and visualizations help compare risk before acting.',
    },
];

const systemPillars = [
    { label: 'Forecasting core', value: 'Prophet', icon: Gauge },
    { label: 'Market data', value: 'Yahoo Finance', icon: Database },
    { label: 'News layer', value: 'Sentiment AI', icon: Newspaper },
    { label: 'Transparency', value: 'Agent logs', icon: Activity },
];

const teamMembers = [
    { name: 'Irfan Ali', rollNo: '22011519-029' },
    { name: 'Zainab Mazhar', rollNo: '22011519-043' },
    { name: 'Syed Mohsin Taseer Naqvi', rollNo: '22011519-067' },
];

export default function LandingPage() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [redirectResolved, setRedirectResolved] = useState(false);
    const router = useRouter();
    const { user, loading } = useAuth();

    const openAuthModal = () => setShowAuthModal(true);

    const navigateToResolvedDashboard = async () => {
        const roleResult = await resolveCurrentRole();
        if (roleResult.success && roleResult.redirectTo) {
            router.push(roleResult.redirectTo);
        }
    };

    useEffect(() => {
        if (loading) return;
        if (!user) {
            setRedirectResolved(false);
            return;
        }
        if (redirectResolved) return;

        const redirectBasedOnRole = async () => {
            const roleResult = await resolveCurrentRole();
            if (roleResult.success && roleResult.redirectTo) {
                router.push(roleResult.redirectTo);
            }
            setRedirectResolved(true);
        };

        void redirectBasedOnRole();
    }, [user, loading, redirectResolved, router]);

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
    };

    return (
        <>
            <main className="landing-shell min-h-screen overflow-hidden bg-slate-950 text-slate-100">
                <nav className="sticky top-0 z-50 border-b border-sky-100/10 bg-slate-950/72 backdrop-blur-xl">
                    <div className="mx-auto flex h-20 w-full max-w-[1500px] items-center justify-between gap-4 px-3 sm:px-5 lg:px-6">
                        <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="TradeFlux home">
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-sky-300/25 bg-sky-300/10 shadow-lg shadow-sky-950/20 sm:h-16 sm:w-16">
                                <Image
                                    src="/logo-only-no-text.png"
                                    alt="TradeFlux"
                                    width={58}
                                    height={58}
                                    priority
                                    className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                                />
                            </span>
                            <span className="min-w-0 leading-tight">
                                <span className="block text-lg font-semibold text-white sm:text-xl">TradeFlux</span>
                                <span className="hidden text-xs font-medium text-sky-100/70 md:block">
                                    Agentic AI Market Forecasting System
                                </span>
                            </span>
                        </a>

                        <div className="hidden items-center gap-6 text-sm font-medium text-slate-300/80 lg:flex">
                            <a href="#features" className="transition hover:text-white">Features</a>
                            <a href="#workflow" className="transition hover:text-white">Workflow</a>
                            <a href="#system" className="transition hover:text-white">System</a>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {!loading && user ? (
                                <button
                                    type="button"
                                    onClick={navigateToResolvedDashboard}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400"
                                >
                                    Dashboard
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={openAuthModal}
                                        className="hidden h-10 items-center justify-center rounded-lg border border-sky-200/15 bg-white/[0.03] px-4 text-sm font-semibold text-slate-200 transition hover:border-sky-300/45 hover:bg-sky-400/10 hover:text-white sm:inline-flex"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openAuthModal}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400"
                                    >
                                        Get Started
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                <section id="top" className="relative">
                    <div className="landing-grid-bg absolute inset-0" />
                    <div className="landing-ambient landing-ambient-one" />
                    <div className="landing-ambient landing-ambient-two" />

                    <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1500px] items-end gap-8 px-3 py-10 sm:px-5 lg:grid-cols-2 lg:px-6 lg:py-12">
                        <div className="landing-reveal flex h-full flex-col justify-end pb-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-sm font-semibold text-sky-50">
                                    
                                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
                                    Live AI trading workspace
                                </div>
                            </div>

                            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:text-[3.45rem]">
                                Forecast stocks with an AI system built for daily market decisions.
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                                TradeFlux brings forecasts, news sentiment, strategy testing, agent logs, and visual analytics into one focused dashboard for stock-market research.
                            </p>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={openAuthModal}
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 shadow-2xl shadow-sky-950/30 transition hover:-translate-y-0.5 hover:bg-sky-50"
                                >
                                    Open TradeFlux
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <a
                                    href="#features"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/5 px-5 text-sm font-semibold text-white transition hover:border-sky-300/35 hover:bg-sky-400/10"
                                >
                                    Explore Features
                                    <ChevronRight className="h-4 w-4" />
                                </a>
                            </div>

                            <div className="mt-8 grid w-full grid-cols-3 gap-3">
                                {[
                                    { value: '7', label: 'AI agents' },
                                    { value: '29d', label: 'Forecast view' },
                                    { value: '24/7', label: 'Market context' },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-lg border border-sky-100/10 bg-white/[0.055] p-3.5 shadow-lg shadow-sky-950/10">
                                        <p className="text-2xl font-semibold text-white">{stat.value}</p>
                                        <p className="mt-1 text-xs font-medium text-slate-400">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="landing-reveal landing-reveal-delay">
                            <div className="landing-dashboard-panel relative mx-auto w-full overflow-hidden rounded-xl border border-sky-100/[0.14] bg-slate-900/[0.64] p-3 shadow-2xl shadow-sky-950/30 backdrop-blur-xl sm:p-3.5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-sky-200">Forecast cockpit</p>
                                        <h2 className="mt-1 text-base font-semibold text-white">AAPL AI Prediction</h2>
                                    </div>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                                        Agents online
                                    </span>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
                                    <div className="rounded-lg border border-sky-100/10 bg-slate-950/52 p-3">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-slate-400">Predicted trend</p>
                                                <p className="mt-1 text-xl font-semibold text-emerald-300">Bullish +4.6%</p>
                                            </div>
                                            <div className="rounded-lg bg-emerald-400/10 p-3 text-emerald-300">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                        </div>

                                        <div className="landing-chart h-32 rounded-lg border border-white/[0.08] bg-slate-950/60 p-3 sm:h-36">
                                            <svg viewBox="0 0 520 230" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
                                                <defs>
                                                    <linearGradient id="chartGlow" x1="0" x2="1" y1="0" y2="0">
                                                        <stop offset="0%" stopColor="#38bdf8" />
                                                        <stop offset="55%" stopColor="#22c55e" />
                                                        <stop offset="100%" stopColor="#a78bfa" />
                                                    </linearGradient>
                                                </defs>
                                                {[42, 88, 134, 180].map((y) => (
                                                    <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" />
                                                ))}
                                                <path
                                                    className="landing-chart-area"
                                                    d="M0 172 C52 154 83 176 130 142 C171 112 200 136 246 102 C290 70 330 96 374 74 C430 44 474 66 520 34 L520 230 L0 230 Z"
                                                    fill="rgba(56,189,248,0.10)"
                                                />
                                                <path
                                                    className="landing-chart-line"
                                                    d="M0 172 C52 154 83 176 130 142 C171 112 200 136 246 102 C290 70 330 96 374 74 C430 44 474 66 520 34"
                                                    fill="none"
                                                    stroke="url(#chartGlow)"
                                                    strokeLinecap="round"
                                                    strokeWidth="5"
                                                />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        {[
                                            { label: 'Confidence', value: '82%', icon: Gauge, tone: 'text-sky-300' },
                                            { label: 'News mood', value: 'Positive', icon: Newspaper, tone: 'text-emerald-300' },
                                            { label: 'Backtest', value: 'Ready', icon: FlaskConical, tone: 'text-violet-300' },
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={item.label} className="landing-metric-card rounded-lg border border-white/10 bg-white/[0.04] p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-400">{item.label}</p>
                                                            <p className="mt-1 text-base font-semibold text-white">{item.value}</p>
                                                        </div>
                                                        <Icon className={`h-5 w-5 ${item.tone}`} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="landing-ticker mt-3 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                                    <div className="landing-ticker-track">
                                        {[...marketTickers, ...marketTickers].map((ticker, index) => (
                                            <span key={`${ticker.symbol}-${index}`} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                                                {ticker.symbol}
                                                <span className="text-slate-400">{ticker.value}</span>
                                                <span className={ticker.change.startsWith('+') ? 'text-emerald-300' : 'text-red-300'}>
                                                    {ticker.change}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="relative mx-auto w-full max-w-[1500px] px-3 py-16 sm:px-5 lg:px-6">
                    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                        <div>
                            <p className="text-sm font-semibold uppercase text-sky-300">TradeFlux platform</p>
                            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                                A complete stock research workspace, not just a prediction screen.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-slate-400">
                            Every module maps to a real dashboard capability, from AI forecasts to backtesting and agent observability.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {platformFeatures.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <article
                                    key={feature.title}
                                    className="landing-feature-card group rounded-xl border border-sky-100/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-sky-300/35 hover:bg-white/[0.065] hover:shadow-2xl hover:shadow-sky-950/20"
                                >
                                    <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg border ${feature.border} ${feature.soft} ${feature.accent}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                                    <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 transition group-hover:text-sky-200">
                                        View in dashboard
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section id="workflow" className="mx-auto w-full max-w-[1500px] px-3 py-16 sm:px-5 lg:px-6">
                    <div className="rounded-2xl border border-sky-100/10 bg-slate-900/50 p-5 shadow-2xl shadow-sky-950/20 sm:p-7">
                        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                            <div>
                                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                                    <Workflow className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-semibold uppercase text-cyan-300">Research flow</p>
                                <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                                    Move from market question to supported decision.
                                </h2>
                                <p className="mt-5 text-sm leading-7 text-slate-400">
                                    The landing page now explains the actual TradeFlux journey: select a stock, run an AI forecast, compare market context, then validate with tools before making a decision.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {workflowSteps.map((step, index) => {
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.label} className="landing-step-card rounded-xl border border-sky-100/10 bg-slate-950/48 p-4">
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-sky-200">
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-500">0{index + 1}</span>
                                            </div>
                                            <h3 className="font-semibold text-white">{step.label}</h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="system" className="mx-auto w-full max-w-[1500px] px-3 py-16 sm:px-5 lg:px-6">
                    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase text-violet-300">Project intelligence</p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                                Built around visible agents, measurable signals, and explainable outputs.
                            </h2>
                            <p className="mt-5 text-sm leading-7 text-slate-400">
                                TradeFlux combines market data, forecasting, sentiment, backtesting, and agent monitoring into one system. The page avoids exaggerated claims and frames the product as decision support.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {systemPillars.map((pillar) => {
                                const Icon = pillar.icon;
                                return (
                                    <div key={pillar.label} className="rounded-xl border border-sky-100/10 bg-white/[0.045] p-5">
                                        <Icon className="h-5 w-5 text-sky-300" />
                                        <p className="mt-5 text-sm text-slate-400">{pillar.label}</p>
                                        <p className="mt-1 text-xl font-semibold text-white">{pillar.value}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-[1500px] px-3 py-16 sm:px-5 lg:px-6">
                    <div className="relative overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-300/[0.12] p-6 shadow-2xl shadow-sky-950/20 sm:p-8">
                        <div className="landing-cta-sheen" />
                        <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                            <div>
                                <div className="mb-5 flex items-center gap-4">
                                    <div className="landing-finale-logo">
                                        <Image
                                            src="/logo-only-no-text.png"
                                            alt="TradeFlux"
                                            width={92}
                                            height={92}
                                            className="h-20 w-20 object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold uppercase text-sky-200">TradeFlux Team</p>
                                        <h2 className="mt-1 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                                            TradeFlux
                                        </h2>
                                    </div>
                                </div>
                                <p className="max-w-2xl text-sm leading-7 text-slate-300">
                                    An Agentic AI Market Forecasting System created as a final year project to make stock analysis, forecasting, sentiment, and agent visibility easier to explore from one dashboard.
                                </p>
                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={openAuthModal}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
                                    >
                                        Get Started
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <a
                                        href="#top"
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                                    >
                                        Back to top
                                        <ChevronRight className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>

                            <div>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sky-100">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Project Members</h3>
                                        <p className="text-sm text-slate-400">Final Year Project team</p>
                                    </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {teamMembers.map((member) => (
                                        <div
                                            key={member.rollNo}
                                            className="rounded-xl border border-white/10 bg-slate-950/35 p-4 transition hover:-translate-y-1 hover:border-sky-300/30 hover:bg-white/[0.06]"
                                        >
                                            <p className="font-semibold text-white">{member.name}</p>
                                            <p className="mt-2 text-sm font-medium text-sky-200">{member.rollNo}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="border-t border-sky-100/10 px-3 py-8 sm:px-5 lg:px-6">
                    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/logo-only-no-text.png"
                                alt="TradeFlux"
                                width={44}
                                height={44}
                                className="h-11 w-11 object-contain"
                            />
                           
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span>© 2026 TradeFlux</span>
                            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
                            <span>Forecasting, sentiment, backtesting, and agent visibility.</span>
                        </div>
                    </div>
                </footer>
            </main>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={handleAuthSuccess}
            />
        </>
    );
}
