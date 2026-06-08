'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Facebook, Linkedin, Loader, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCurrentRole } from '@/lib/roleRouting';
import { useSnackbar } from '@/components/SnackbarProvider';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const router = useRouter();
    const { showSnackbar } = useSnackbar();
    const [isSignIn, setIsSignIn] = useState(true);
    const [loading, setLoading] = useState(false);
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
                onSuccess();
                showSnackbar({ variant: 'success', message: 'Signed in successfully.' });
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

    const handleSocialLogin = (provider: string) => {
        setError(`${provider} login coming soon`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-600" />
                </button>

                <div className="grid md:grid-cols-2">
                    {/* Left Side - Form */}
                    <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-8">
                            {isSignIn ? 'Signin' : 'Signup'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {forgotMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-sm text-emerald-700">{forgotMessage}</p>
                                </div>
                            )}

                            {!isSignIn && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                            required={!isSignIn}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Password *
                                    </label>
                                    {isSignIn && (
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={forgotLoading}
                                            className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                        >
                                            {forgotLoading ? 'Sending...' : 'Forgot Password?'}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {!isSignIn && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password *
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                            required={!isSignIn}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        {isSignIn ? 'Signing in...' : 'Signing up...'}
                                    </>
                                ) : (
                                    isSignIn ? 'Signin' : 'Signup'
                                )}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">or signin with</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-center space-x-4">
                                <button
                                    onClick={() => handleSocialLogin('facebook')}
                                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    <Facebook className="w-5 h-5" fill="currentColor" />
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('google')}
                                    className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('linkedin')}
                                    className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors shadow-lg"
                                >
                                    <Linkedin className="w-5 h-5" fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Welcome Message */}
                    <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 text-white">
                        <div className="text-center">
                            <h3 className="text-4xl font-bold mb-4">
                                {isSignIn ? 'Welcome back!' : 'Hello, Friend!'}
                            </h3>
                            <p className="text-slate-200 mb-8 leading-relaxed">
                                {isSignIn
                                    ? "Welcome back! We are so happy to have you here. It's great to see you again. We hope you had a safe and enjoyable time away."
                                    : "Enter your personal details and start your journey with us today!"}
                            </p>
                            <button
                                onClick={() => setIsSignIn(!isSignIn)}
                                className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-slate-700 transition-all"
                            >
                                {isSignIn ? 'No account yet? Signup.' : 'Already have an account? Signin.'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <div className="md:hidden p-6 text-center border-t border-gray-200">
                    <button
                        onClick={() => setIsSignIn(!isSignIn)}
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                        <span className="text-yellow-500 font-semibold">
                            {isSignIn ? 'Sign up' : 'Sign in'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
