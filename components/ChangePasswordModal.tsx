'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSnackbar } from '@/components/SnackbarProvider';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const { showSnackbar } = useSnackbar();
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [requiresCurrentPassword, setRequiresCurrentPassword] = useState(true);

    const resetForm = () => {
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswords({ current: false, new: false, confirm: false });
        setLoading(false);
        setError('');
        setSuccess('');
    };

    const closeModal = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        resetForm();
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
            resetForm();
            return;
        }

        let mounted = true;

        const resolvePasswordProvider = async () => {
            const { data } = await supabase.auth.getUser();
            const user = data.user;
            const providers = user?.app_metadata?.providers;
            const identities = user?.identities;
            const hasEmailProvider =
                user?.app_metadata?.tradeflux_password_set === true ||
                (Array.isArray(providers) && providers.includes('email')) ||
                (Array.isArray(identities) && identities.some((identity) => identity.provider === 'email'));

            if (mounted) {
                setRequiresCurrentPassword(Boolean(hasEmailProvider));
            }
        };

        void resolvePasswordProvider();

        return () => {
            mounted = false;
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (requiresCurrentPassword && !formData.currentPassword) {
            setError('Current password is required.');
            showSnackbar({ variant: 'warning', message: 'Current password is required.' });
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            showSnackbar({ variant: 'warning', message: 'New password must be at least 6 characters.' });
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('New password and confirmation do not match.');
            showSnackbar({ variant: 'warning', message: 'New password and confirmation do not match.' });
            return;
        }

        if (formData.currentPassword && formData.currentPassword === formData.newPassword) {
            setError('New password must be different from current password.');
            showSnackbar({ variant: 'warning', message: 'New password must be different from current password.' });
            return;
        }

        setLoading(true);
        try {
            const { data } = await supabase.auth.getSession();
            const accessToken = data.session?.access_token;
            if (!accessToken) {
                setError('Your session expired. Please sign in again.');
                showSnackbar({ variant: 'error', message: 'Your session expired. Please sign in again.' });
                return;
            }

            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(formData),
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                const message = payload.error || 'Unable to update password.';
                setError(message);
                showSnackbar({ variant: 'error', message });
                return;
            }

            const message = payload.message || 'Password updated successfully.';
            await supabase.auth.refreshSession();
            setSuccess(message);
            showSnackbar({ variant: 'success', message });
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            closeTimerRef.current = setTimeout(() => {
                closeModal();
            }, 600);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to update password.';
            setError(message);
            showSnackbar({ variant: 'error', message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl shadow-black/50 animate-slide-up">
                <button
                    onClick={closeModal}
                    className="absolute right-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                    aria-label="Close change password modal"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-6 py-5">
                    <div className="flex items-start gap-4 pr-12">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/30">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">Account security</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">Change Password</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-400">
                                {requiresCurrentPassword
                                    ? 'Confirm your current password, then choose a new one.'
                                    : 'Your Google account does not have a TradeFlux password yet. Set one below if you want email/password login too.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="mb-5 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {requiresCurrentPassword ? 'Password protected' : 'Create password access'}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">
                                    {requiresCurrentPassword
                                        ? 'This update is applied to your secure Supabase login credentials.'
                                        : 'Google sign-in will still work after you add a TradeFlux password.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        {requiresCurrentPassword && (
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                Current Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    placeholder="Enter current password"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
                                    required={requiresCurrentPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                    aria-label={showPasswords.current ? 'Hide current password' : 'Show current password'}
                                >
                                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                New Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                    aria-label={showPasswords.new ? 'Hide new password' : 'Show new password'}
                                >
                                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                Confirm New Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                    aria-label={showPasswords.confirm ? 'Hide confirmation password' : 'Show confirmation password'}
                                >
                                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={loading}
                                className="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    requiresCurrentPassword ? 'Update Password' : 'Set Password'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
