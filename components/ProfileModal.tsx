'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2, Trash2, User as UserIcon, Mail, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useSnackbar } from '@/components/SnackbarProvider';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, refreshUser } = useAuth();
    const { showSnackbar } = useSnackbar();
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [name, setName] = useState(user?.name || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
    const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
    const [removeProfileImage, setRemoveProfileImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
            return;
        }
        if (closeTimerRef.current) return;

        setName(user?.name || '');
        setGender(user?.gender || '');
        setProfileImage(user?.profileImage || null);
        setSelectedImageDataUrl(null);
        setRemoveProfileImage(false);
        setError(null);
        setSuccess(null);
    }, [isOpen, user?.name, user?.gender, user?.profileImage]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }

        // Keep metadata size safe for auth profile payload.
        if (file.size > 1024 * 1024) {
            setError('Please upload an image smaller than 1MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : null;
            setProfileImage(dataUrl);
            setSelectedImageDataUrl(dataUrl);
            setRemoveProfileImage(false);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        const getValidAccessToken = async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData.session;

            // Refresh if the token is missing or about to expire.
            if (!session?.access_token || (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60)) {
                const refreshed = await supabase.auth.refreshSession();
                return refreshed.data.session?.access_token;
            }

            return session.access_token;
        };

        let accessToken = await getValidAccessToken();
        const { data: latestSessionData } = await supabase.auth.getSession();
        let refreshToken = latestSessionData.session?.refresh_token;

        if (!accessToken) {
            setSaving(false);
            setError('Your session has expired. Please sign in again.');
            return;
        }

        const requestBody = {
            accessToken,
            refreshToken,
            name: name.trim(),
            gender: gender || null,
            profileImageDataUrl: selectedImageDataUrl,
            removeProfileImage,
        };

        let response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        // Retry once on Unauthorized using a freshly refreshed token.
        if (response.status === 401) {
            const refreshed = await supabase.auth.refreshSession();
            accessToken = refreshed.data.session?.access_token;
            refreshToken = refreshed.data.session?.refresh_token;

            if (accessToken) {
                response = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...requestBody,
                        accessToken,
                        refreshToken,
                    }),
                });
            }
        }

        const payload = await response.json();

        setSaving(false);

        if (!response.ok || !payload?.success) {
            setError(payload?.error || 'Failed to save profile.');
            return;
        }

        await refreshUser();
        const message = payload?.message || 'Profile updated successfully.';
        setSuccess(message);
        showSnackbar({ variant: 'success', message });
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            onClose();
        }, 600);
    };

    const handleRemovePhoto = () => {
        setProfileImage(null);
        setSelectedImageDataUrl(null);
        setRemoveProfileImage(true);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl shadow-black/50 animate-slide-up">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-400 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                    aria-label="Close profile modal"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-6 py-5">
                    <div className="flex items-start gap-4 pr-12">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/30">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">Account details</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">Your Profile</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-400">Keep your TradeFlux identity clean and up to date.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="grid gap-6 p-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner shadow-black/30">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-11 w-11 text-slate-500" />
                                )}
                            </div>

                            <p className="mt-4 text-sm font-semibold text-white">{name.trim() || user?.name || 'TradeFlux user'}</p>
                            <p className="mt-1 max-w-full truncate text-xs text-slate-400">{user?.email || ''}</p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/60 hover:bg-sky-400/10 hover:text-sky-100">
                                <Upload className="h-4 w-4" />
                                Upload
                                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 text-sm font-semibold text-red-200 transition hover:border-red-300/50 hover:bg-red-500/15"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove
                            </button>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-slate-500">Use PNG, JPG, WebP, or GIF. Keep it under 1MB.</p>
                    </div>

                    <div className="space-y-4">
                        {error && (
                            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-900/70 pl-10 pr-3 text-sm text-slate-500 outline-none"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">Email cannot be changed after registration.</p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="h-11 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-white outline-none transition hover:border-slate-700 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
                            >
                                <option value="">Prefer not to say</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non-binary">Non-binary</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Profile'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
