'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowRight, TrendingUp, Brain, BarChart3, Sparkles,
    Shield, Activity, Zap, ChevronRight, Star
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import Image from 'next/image';
import { useAuth } from '@/lib/authContext';
import { resolveCurrentRole } from '@/lib/roleRouting';

export default function LandingPage() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [redirectResolved, setRedirectResolved] = useState(false);
    const router = useRouter();
    const { user, loading } = useAuth();

    // Redirect to the right panel when the logged-in account is already authenticated
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
            } else {
                router.push('/dashboard');
            }
            setRedirectResolved(true);
        };

        redirectBasedOnRole();
    }, [user, loading, redirectResolved, router]);

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
    };

    return (
        <>
            <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #060b17 0%, #0a1628 40%, #0d1f3c 70%, #060b17 100%)' }}>

                {/* Sticky Glassmorphism Navbar */}
                <nav style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    background: 'rgba(6, 11, 23, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(14, 165, 233, 0.12)',
                }}>
                    <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/tradeflux-logo.png"
                                alt="TradeFlux"
                                width={140}
                                height={44}
                                className="object-contain"
                                style={{ mixBlendMode: 'screen', filter: 'brightness(1.05)' }}
                            />
                            <div className="flex flex-col leading-tight">
                                <span className="gradient-text text-lg font-semibold">TradeFlux</span>
                                <span className="text-xs text-gray-400 -mt-0.5">Market Forecasting with Agentic AI</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!loading && user ? (
                                <>
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        style={{
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                            color: 'white',
                                            padding: '0.4rem 1rem',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: 'none',
                                            fontSize: '0.88rem',
                                            transition: 'all 0.18s',
                                            boxShadow: '0 6px 18px rgba(14, 165, 233, 0.28)',
                                        }}
                                    >
                                        Dashboard
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(14,165,233,0.35)',
                                            color: '#cbd5e1',
                                            padding: '0.35rem 0.9rem',
                                            borderRadius: '8px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.18s',
                                            fontSize: '0.85rem',
                                        }}
                                        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#e2e8f0'; (e.target as HTMLElement).style.borderColor = 'rgba(14,165,233,0.65)'; }}
                                        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#cbd5e1'; (e.target as HTMLElement).style.borderColor = 'rgba(14,165,233,0.35)'; }}
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                            color: 'white',
                                            padding: '0.4rem 1rem',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: 'none',
                                            fontSize: '0.88rem',
                                            transition: 'all 0.18s',
                                            boxShadow: '0 6px 18px rgba(14, 165, 233, 0.28)',
                                        }}
                                    >
                                        Get Started
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div style={{ position: 'relative', overflow: 'hidden', minHeight: '90vh', display: 'flex', alignItems: 'center' }}>
                    {/* Animated Orbs */}
                    <div style={{
                        position: 'absolute', top: '-10%', left: '-5%',
                        width: '500px', height: '500px',
                        background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
                        borderRadius: '50%', animation: 'pulse 6s ease-in-out infinite',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '-10%', right: '-5%',
                        width: '600px', height: '600px',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                        borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite 2s',
                    }} />
                    {/* Grid pattern */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />

                    <div className="max-w-7xl mx-auto px-6 py-20 w-full" style={{ position: 'relative', zIndex: 10 }}>
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left */}
                            <div style={{ animation: 'slideUp 0.8s ease-out' }}>
                                {/* Badge */}
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                                    <span style={{
                                        padding: '0.4rem 1rem',
                                        background: 'rgba(14,165,233,0.1)',
                                        border: '1px solid rgba(14,165,233,0.3)',
                                        borderRadius: '100px',
                                        fontSize: '0.8rem',
                                        color: '#38bdf8',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <Sparkles style={{ width: '14px', height: '14px' }} />
                                        Powered by Multi-Agent AI
                                    </span>
                                </div>

                                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                                    Predict Stock Markets
                                    <br />
                                    with{' '}
                                    <span style={{
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}>
                                        AI Precision
                                    </span>
                                </h1>

                                <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '500px' }}>
                                    Harness multi-agent AI, Prophet forecasting, and real-time sentiment analysis to make smarter, data-driven trading decisions.
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                            color: 'white',
                                            padding: '0.85rem 2rem',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: 'none',
                                            fontSize: '1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 8px 25px rgba(14,165,233,0.4)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Try Now <ArrowRight style={{ width: '18px', height: '18px' }} />
                                    </button>
                                    <button
                                        style={{
                                            background: 'rgba(30,41,59,0.6)',
                                            color: '#e2e8f0',
                                            padding: '0.85rem 2rem',
                                            borderRadius: '10px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: '1px solid rgba(51,65,85,0.8)',
                                            fontSize: '1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        Learn More <ChevronRight style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>

                                {/* Stats Row */}
                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    {[
                                        { val: '7', label: 'AI Agents', color: '#0ea5e9' },
                                        { val: '95%', label: 'Accuracy', color: '#6366f1' },
                                        { val: '24/7', label: 'Monitoring', color: '#10b981' },
                                    ].map(stat => (
                                        <div key={stat.label}>
                                            <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.val}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right - Feature Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 1s ease-out 0.3s both' }}>
                                {[
                                    {
                                        icon: <TrendingUp style={{ width: '22px', height: '22px' }} />,
                                        title: 'AI-Powered Predictions',
                                        desc: 'Prophet-based forecasting with confidence intervals and trend analysis',
                                        gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                                        glow: 'rgba(14,165,233,0.2)',
                                    },
                                    {
                                        icon: <Brain style={{ width: '22px', height: '22px' }} />,
                                        title: 'Sentiment Analysis',
                                        desc: 'Real-time news sentiment using VADER and Groq LLM insights',
                                        gradient: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                                        glow: 'rgba(99,102,241,0.2)',
                                    },
                                    {
                                        icon: <BarChart3 style={{ width: '22px', height: '22px' }} />,
                                        title: 'Advanced Analytics',
                                        desc: 'RSI, MACD, Bollinger Bands, and custom performance metrics',
                                        gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                        glow: 'rgba(245,158,11,0.2)',
                                    },
                                ].map(card => (
                                    <div key={card.title} style={{
                                        background: 'rgba(15, 23, 42, 0.7)',
                                        border: '1px solid rgba(51,65,85,0.6)',
                                        borderRadius: '16px',
                                        padding: '1.25rem 1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        backdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s',
                                        cursor: 'default',
                                    }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.4)';
                                            (e.currentTarget as HTMLElement).style.transform = 'translateX(6px)';
                                            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${card.glow}`;
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,65,85,0.6)';
                                            (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: card.gradient, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', color: 'white', flexShrink: 0,
                                            boxShadow: `0 4px 15px ${card.glow}`,
                                        }}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{card.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{card.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Grid Section */}
                <div style={{ padding: '5rem 1.5rem', position: 'relative' }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)',
                    }} />
                    <div className="max-w-7xl mx-auto">
                        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                            <p style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                Everything You Need
                            </p>
                            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                Complete <span style={{
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                }}>AI Trading Suite</span>
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                                Everything you need to make data-driven investment decisions
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                            {[
                                { icon: <Brain style={{ width: '24px', height: '24px' }} />, title: 'Multi-Agent System', desc: '7 specialized AI agents working in perfect harmony', color: '#0ea5e9' },
                                { icon: <Activity style={{ width: '24px', height: '24px' }} />, title: 'Prophet Forecasting', desc: 'Industry-leading time series prediction models', color: '#6366f1' },
                                { icon: <Zap style={{ width: '24px', height: '24px' }} />, title: 'News Integration', desc: 'Real-time news pipelines from trusted sources', color: '#f59e0b' },
                                { icon: <Sparkles style={{ width: '24px', height: '24px' }} />, title: 'Sentiment Analysis', desc: 'VADER + Groq LLM-powered market insights', color: '#a78bfa' },
                                { icon: <Shield style={{ width: '24px', height: '24px' }} />, title: 'Backtesting Engine', desc: 'Validate trading strategies with historical data', color: '#10b981' },
                                { icon: <TrendingUp style={{ width: '24px', height: '24px' }} />, title: 'Real-time Data', desc: 'Live market data streamed from Yahoo Finance', color: '#f43f5e' },
                            ].map(feat => (
                                <div key={feat.title} style={{
                                    background: 'rgba(15,23,42,0.5)',
                                    border: '1px solid rgba(51,65,85,0.5)',
                                    borderRadius: '16px',
                                    padding: '1.75rem',
                                    transition: 'all 0.3s',
                                    cursor: 'default',
                                }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = `${feat.color}40`;
                                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${feat.color}20`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,65,85,0.5)';
                                        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '10px',
                                        background: `${feat.color}18`, border: `1px solid ${feat.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: feat.color, marginBottom: '1rem',
                                    }}>
                                        {feat.icon}
                                    </div>
                                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#f1f5f9' }}>{feat.title}</h3>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{feat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Testimonial / Social Proof */}
                <div style={{ padding: '4rem 1.5rem' }}>
                    <div className="max-w-7xl mx-auto">
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                            border: '1px solid rgba(14,165,233,0.2)',
                            borderRadius: '24px',
                            padding: 'clamp(2rem, 5vw, 4rem)',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
                                width: '400px', height: '400px',
                                background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
                                borderRadius: '50%',
                            }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '1.5rem' }}>
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} style={{ width: '20px', height: '20px', fill: '#f59e0b', color: '#f59e0b' }} />
                                    ))}
                                </div>
                                <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                                    Ready to Transform
                                    <br />
                                    <span style={{
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                    }}>
                                        Your Trading?
                                    </span>
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem', maxWidth: '460px', margin: '0 auto 2rem' }}>
                                    Join thousands of traders using AI-powered insights to gain a real edge in the market.
                                </p>
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    style={{
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                        color: 'white',
                                        padding: '1rem 2.5rem',
                                        borderRadius: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: 'none',
                                        fontSize: '1rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 10px 35px rgba(14,165,233,0.4)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Get Started Now <ArrowRight style={{ width: '18px', height: '18px' }} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer style={{ borderTop: '1px solid rgba(51,65,85,0.4)', padding: '2rem 1.5rem' }}>
                    <div className="max-w-7xl mx-auto" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <Image
                            src="/tradeflux-logo.png"
                            alt="TradeFlux"
                            width={130}
                            height={44}
                            className="object-contain"
                            style={{ mixBlendMode: 'screen', filter: 'brightness(1.1)' }}
                        />
                        <p style={{ color: '#475569', fontSize: '0.85rem' }}>
                            © 2026 TradeFlux. Built for FYP with ❤️
                        </p>
                    </div>
                </footer>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={handleAuthSuccess}
            />
        </>
    );
}
