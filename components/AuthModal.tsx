'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Loader, Eye, EyeOff, Sparkles, TrendingUp, Newspaper, CandlestickChart, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCurrentRole } from '@/lib/roleRouting';
import { useSnackbar } from '@/components/SnackbarProvider';
import { usePostLoginTransition } from '@/components/PostLoginTransition';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

function getFallbackDisplayName(email?: string | null) {
    if (!email) return undefined;
    const [localPart] = email.split('@');
    if (!localPart) return undefined;
    return localPart
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const router = useRouter();
    const { showSnackbar } = useSnackbar();
    const { startTransition } = usePostLoginTransition();
    const [isSignIn, setIsSignIn] = useState(true);
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    if (!isOpen) return null;

    const modeTitle = isSignIn ? 'Welcome back' : 'Create your account';
    const modeSubtitle = isSignIn
        ? 'Sign in to continue to your forecasts, watchlist, and AI market workspace.'
        : 'Set up your TradeFlux workspace with your account details.';
    const submitLabel = isSignIn ? 'Sign in' : 'Sign up';
    const panelContent = isSignIn
        ? {
            eyebrow: 'Your workspace is ready',
            title: 'Fresh market signals are waiting for you.',
            subtitle: 'Open your dashboard to review today\'s news, track trends, and continue watching the stocks that matter to you.',
            accent: 'auth-side-panel--signin',
            highlights: [
                { icon: TrendingUp, label: 'Trend alerts', value: 'Updated now' },
                { icon: Newspaper, label: 'Market news', value: 'Live feed ready' },
                { icon: CandlestickChart, label: 'Saved stocks', value: 'Synced' },
            ],
            ticker: ['AAPL momentum updated', 'Latest headlines analyzed', 'Forecast dashboard ready', 'Watchlist changes synced'],
        }
        : {
            eyebrow: 'New to TradeFlux?',
            title: 'Start building a smarter trading routine.',
            subtitle: 'Create your account to unlock AI forecasts, sentiment-aware news, saved stocks, and a personal dashboard built for daily decisions.',
            accent: 'auth-side-panel--signup',
            highlights: [
                { icon: Sparkles, label: 'AI forecasts', value: 'Personalized' },
                { icon: ShieldCheck, label: 'Secure profile', value: 'Role protected' },
                { icon: TrendingUp, label: 'Market tools', value: 'Ready day one' },
            ],
            ticker: ['Join your AI trading workspace', 'Save stocks you care about', 'Read cleaner market signals', 'Turn news into insight'],
        };

    const switchMode = (nextIsSignIn: boolean) => {
        setIsSignIn(nextIsSignIn);
        setError(null);
        setForgotMessage(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const setAuthCookie = () => {
        document.cookie = 'tradeflux-auth=1; path=/; max-age=604800; samesite=lax';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setForgotMessage(null);
        setLoading(true);

        try {
            let signedInAccessToken: string | undefined;
            let signedInDisplayName: string | undefined;
            if (isSignIn) {
                // Sign in using client-side Supabase auth
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });

                if (signInError) {
                    const msg = signInError.message.toLowerCase();
                    if (msg.includes('invalid login credentials')) {
                        setError('Invalid email or password.');
                        showSnackbar({ variant: 'error', message: 'Invalid email or password.' });
                    } else if (msg.includes('email not confirmed')) {
                        setError('Please confirm your email before signing in.');
                        showSnackbar({ variant: 'warning', message: 'Please confirm your email before signing in.' });
                    } else {
                        setError(signInError.message);
                        showSnackbar({ variant: 'error', message: signInError.message });
                    }
                    return;
                }

                if (!data.user || !data.session?.access_token) {
                    setError('Failed to sign in');
                    showSnackbar({ variant: 'error', message: 'Failed to sign in.' });
                    return;
                }

                signedInAccessToken = data.session.access_token;
                signedInDisplayName =
                    data.user.user_metadata?.name || getFallbackDisplayName(data.user.email);
                setAuthCookie();
            } else {
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    showSnackbar({ variant: 'warning', message: 'Passwords do not match.' });
                    return;
                }

                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    showSnackbar({ variant: 'warning', message: 'Password must be at least 6 characters.' });
                    return;
                }

                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                        confirmPassword: formData.confirmPassword,
                    }),
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    const message = result.error || 'Failed to create account.';
                    setError(message);
                    showSnackbar({ variant: 'error', message });
                    return;
                }

                showSnackbar({
                    variant: 'success',
                    message: 'Account created successfully. Please confirm your email before signing in.',
                    duration: 7000,
                });
                setFormData({ email: formData.email, password: '', name: '', confirmPassword: '' });
                setIsSignIn(true);
                return;
            }

            const roleResult = await resolveCurrentRole(signedInAccessToken);
            if (roleResult.success && roleResult.redirectTo) {
                // Reset form only after role resolution succeeds.
                setFormData({ email: '', password: '', name: '', confirmPassword: '' });
                router.prefetch(roleResult.redirectTo);
                startTransition({
                    role: roleResult.role || 'user',
                    destination: roleResult.redirectTo,
                    displayName:
                        roleResult.account?.name ||
                        signedInDisplayName ||
                        getFallbackDisplayName(roleResult.account?.email),
                });
                onSuccess();
                router.push(roleResult.redirectTo);
            } else {
                await supabase.auth.signOut({ scope: 'global' });
                document.cookie = 'tradeflux-auth=; path=/; max-age=0; samesite=lax';
                const message = roleResult.error || 'Unable to verify your account role. Please sign in again.';
                setError(message);
                if (roleResult.code !== 'USER_BLOCKED') {
                    showSnackbar({ variant: 'error', message });
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            showSnackbar({ variant: 'error', message });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError(null);
        setForgotMessage(null);

        const email = formData.email.trim();
        if (!email) {
            setError('Please enter your registered email, then click Forgot Password.');
            return;
        }

        setForgotLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    role: 'user',
                }),
            });

            const result = await res.json();
            if (!res.ok || !result.success) {
                setError(result.error || 'Failed to process forgot password request.');
                showSnackbar({
                    variant: 'error',
                    message: result.error || 'Failed to process forgot password request.',
                });
                return;
            }

            setForgotMessage(result.message || 'Password reset email sent.');
            showSnackbar({
                variant: 'success',
                message: result.message || 'Password reset email sent.',
            });
        } catch {
            setError('Failed to process forgot password request. Please try again.');
            showSnackbar({
                variant: 'error',
                message: 'Failed to process forgot password request. Please try again.',
            });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleGoogleOAuth = async () => {
        setError(null);
        setForgotMessage(null);
        setOauthLoading(true);

        try {
            const redirectTo = `${window.location.origin}/auth/callback`;
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                },
            });

            if (oauthError) {
                setError(oauthError.message);
                showSnackbar({ variant: 'error', message: oauthError.message });
                setOauthLoading(false);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to start Google sign in.';
            setError(message);
            showSnackbar({ variant: 'error', message });
            setOauthLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md animate-fade-in sm:p-4">
            <div className="relative grid w-full max-w-[940px] max-h-[92vh] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 text-slate-950 shadow-2xl shadow-black/35 animate-slide-up md:h-[640px] md:grid-cols-[0.92fr_1.08fr]">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200/80 bg-white/85 p-2 text-slate-500 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    aria-label="Close authentication modal"
                >
                    <X className="h-4 w-4" />
                </button>

                <aside className={`auth-side-panel relative hidden min-h-0 overflow-hidden p-7 text-white transition-colors duration-700 md:flex md:flex-col ${panelContent.accent}`}>
                    <div className="auth-side-grid absolute inset-0 opacity-35" />
                    <div className="auth-side-glow" />

                    <div key={isSignIn ? 'signin-side-copy' : 'signup-side-copy'} className="auth-side-copy relative">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/30">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">{panelContent.eyebrow}</p>
                        <h3 className="mt-3 max-w-xs text-[1.7rem] font-semibold leading-tight tracking-normal text-white">
                            {panelContent.title}
                        </h3>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                            {panelContent.subtitle}
                        </p>
                    </div>

                    <div key={isSignIn ? 'signin-side-motion' : 'signup-side-motion'} className="auth-side-motion relative mt-7">
                        <div className="auth-orbit-card">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                                    {isSignIn ? 'Today' : 'Included'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]" />
                                    Live
                                </span>
                            </div>
                            <div className="mt-3 space-y-2.5">
                                {panelContent.highlights.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="auth-highlight-row">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-sky-100">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-white">{item.label}</span>
                                                <span className="block text-xs text-slate-400">{item.value}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="auth-ticker" aria-hidden="true">
                            <div className="auth-ticker-track">
                                {[...panelContent.ticker, ...panelContent.ticker].map((item, index) => (
                                    <span key={`${item}-${index}`}>{item}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="min-h-0 overflow-y-auto bg-white md:overflow-hidden">
                    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 py-4 transition-all duration-500 sm:px-7 sm:py-5 md:h-full md:justify-start md:pt-8">
                        <div className="auth-mode-toggle relative mb-4 grid h-11 grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1">
                            <span
                                className={`auth-mode-indicator ${isSignIn ? 'translate-x-0' : 'translate-x-full'}`}
                                aria-hidden="true"
                            />
                            <button
                                type="button"
                                onClick={() => switchMode(true)}
                                className={`relative z-10 h-9 rounded-md text-sm font-semibold transition-colors duration-300 ${isSignIn ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Sign in
                            </button>
                            <button
                                type="button"
                                onClick={() => switchMode(false)}
                                className={`relative z-10 h-9 rounded-md text-sm font-semibold transition-colors duration-300 ${!isSignIn ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Sign up
                            </button>
                        </div>

                        <div key={isSignIn ? 'signin-heading' : 'signup-heading'} className="auth-form-swap mb-4 min-h-[90px]">
                            <p className={`mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-500 ${isSignIn ? 'text-sky-600' : 'text-cyan-600'}`}>TradeFlux account</p>
                            <h2 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-[1.7rem]">{modeTitle}</h2>
                            <p className="mt-1.5 text-sm leading-5 text-slate-500">{modeSubtitle}</p>
                        </div>

                        <form key={isSignIn ? 'signin-form' : 'signup-form'} onSubmit={handleSubmit} className="auth-form-swap h-[320px] space-y-2.5">
                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {forgotMessage && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                                    <p className="text-sm text-emerald-700">{forgotMessage}</p>
                                </div>
                            )}

                            {!isSignIn && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-normal text-slate-500">
                                        Name *
                                    </label>
                                    <div className="group relative">
                                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500" />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                                            required={!isSignIn}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-normal text-slate-500">
                                    Email *
                                </label>
                                <div className="group relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label className="block text-xs font-semibold uppercase tracking-normal text-slate-500">
                                        Password *
                                    </label>
                                    {isSignIn && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={forgotLoading}
                                            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 disabled:opacity-50"
                                        >
                                            {forgotLoading ? 'Sending...' : 'Forgot password?'}
                                        </button>
                                    )}
                                </div>
                                <div className="group relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {!isSignIn && (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-normal text-slate-500">
                                        Confirm Password *
                                    </label>
                                    <div className="group relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-500" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                                            required={!isSignIn}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || oauthLoading}
                                className="group mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/18 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin" />
                                        {isSignIn ? 'Signing in...' : 'Signing up...'}
                                    </>
                                ) : (
                                    submitLabel
                                )}
                            </button>
                        </form>

                        <div className="my-3 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-medium text-slate-400">or continue with</span>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleOAuth}
                            disabled={loading || oauthLoading}
                            className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {oauthLoading ? (
                                <Loader className="h-4 w-4 animate-spin text-sky-500" />
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            {oauthLoading ? 'Opening Google...' : 'Continue with Google'}
                        </button>

                        <div className="mt-4 text-center text-sm text-slate-500 md:hidden">
                            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                onClick={() => switchMode(!isSignIn)}
                                className="font-semibold text-sky-600 transition hover:text-sky-700"
                            >
                                {isSignIn ? 'Sign up' : 'Sign in'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
