'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Close Button */}
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close change password modal"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                <div className="p-7">
                    <div className="mb-5 flex items-start gap-3 pr-10">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Change Password</h2>
                            <p className="mt-1 text-sm leading-5 text-gray-600">
                                {requiresCurrentPassword
                                    ? 'Confirm your current password, then choose a new one.'
                                    : 'Your Google account does not have a TradeFlux password yet. Set one below if you want email/password login too.'}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        {requiresCurrentPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    placeholder="Enter current password"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                    required={requiresCurrentPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm New Password *
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all text-gray-900"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={loading}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-slate-950 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center justify-center gap-2"
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
