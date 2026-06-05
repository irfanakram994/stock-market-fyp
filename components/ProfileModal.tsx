'use client';

import { useEffect, useState } from 'react';
import { X, Upload, Loader2, Trash2, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [gender, setGender] = useState(user?.gender || '');
    const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
    const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
    const [removeProfileImage, setRemoveProfileImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        setName(user?.name || '');
        setGender(user?.gender || '');
        setProfileImage(user?.profileImage || null);
        setSelectedImageDataUrl(null);
        setRemoveProfileImage(false);
        setError(null);
        setSuccess(null);
    }, [isOpen, user?.name, user?.gender, user?.profileImage]);

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
        setSuccess('Profile updated successfully.');
    };

    const handleRemovePhoto = () => {
        setProfileImage(null);
        setSelectedImageDataUrl(null);
        setRemoveProfileImage(true);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-600" />
                </button>

                <div className="p-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h2>
                    <p className="text-gray-600 mb-6">Update your profile information</p>

                    <form onSubmit={handleSave} className="space-y-5">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                {success}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-8 h-8 text-gray-400" />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4" />
                                    Upload
                                    <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                                </label>
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed after registration.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-900"
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
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Profile'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
