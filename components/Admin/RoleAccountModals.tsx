'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import type React from 'react';
import Image from 'next/image';
import { AlertCircle, Camera, CheckCircle2, Eye, EyeOff, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useSnackbar } from '@/components/SnackbarProvider';

type RoleTone = 'admin' | 'super';
type RoleFetcher = (input: string, init?: RequestInit) => Promise<Response>;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export interface RoleAccount {
  id: string;
  email: string;
  name: string | null;
  gender: string | null;
  profileImage: string | null;
  role: string;
}

const toneStyles: Record<RoleTone, { accent: string; button: string; soft: string; text: string; border: string; ring: string }> = {
  admin: {
    accent: '#34d399',
    button: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    soft: 'bg-emerald-400/10',
    text: 'text-emerald-300',
    border: 'border-emerald-400/25',
    ring: 'focus:border-emerald-300/70',
  },
  super: {
    accent: '#e879f9',
    button: 'bg-fuchsia-400 text-slate-950 hover:bg-fuchsia-300',
    soft: 'bg-fuchsia-400/10',
    text: 'text-fuchsia-300',
    border: 'border-fuchsia-400/25',
    ring: 'focus:border-fuchsia-300/70',
  },
};

function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  tone,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  tone: RoleTone;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  const styles = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-slate-800 bg-[#0b1220] shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg border border-slate-800 p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Feedback({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      }`}
    >
      {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{error || success}</span>
    </div>
  );
}

export function RoleProfileModal({
  isOpen,
  onClose,
  account,
  endpoint,
  fetcher,
  refreshAccount,
  onProfileSaved,
  tone,
  roleLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  account: RoleAccount | null;
  endpoint: string;
  fetcher: RoleFetcher;
  refreshAccount: () => Promise<void>;
  onProfileSaved?: (profile: Partial<Pick<RoleAccount, 'name' | 'gender' | 'profileImage'>>) => void;
  tone: RoleTone;
  roleLabel: string;
}) {
  const { showSnackbar } = useSnackbar();
  const styles = toneStyles[tone];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      return;
    }
    if (!account || closeTimerRef.current) return;
    setName(account.name || '');
    setGender(account.gender || '');
    setPreview(account.profileImage);
    setImageDataUrl('');
    setRemoveProfileImage(false);
    setError('');
    setSuccess('');
  }, [account, isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Use a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Profile image must be 1MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPreview(result);
      setImageDataUrl(result);
      setRemoveProfileImage(false);
      setError('');
      setSuccess('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setImageDataUrl('');
    setRemoveProfileImage(true);
    setSuccess('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account) return;

    const trimmedName = name.trim();
    if (trimmedName.length > 120) {
      setError('Name is too long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetcher(endpoint, {
        method: 'PUT',
        body: JSON.stringify({
          name: trimmedName || null,
          gender: gender || null,
          profileImageDataUrl: imageDataUrl || undefined,
          removeProfileImage,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update profile.');
      }

      if (payload.data) {
        onProfileSaved?.({
          name: payload.data.name ?? null,
          gender: payload.data.gender ?? null,
          profileImage: payload.data.profileImage ?? null,
        });
        setName(payload.data.name || '');
        setGender(payload.data.gender || '');
        setPreview(payload.data.profileImage || null);
      }
      try {
        await withTimeout(refreshAccount(), 5000, 'Profile refresh');
      } catch (refreshError) {
        console.warn('Profile saved, but refresh was skipped:', refreshError);
      }
      const message = payload.message || 'Profile updated successfully.';
      setSuccess(message);
      showSnackbar({ variant: 'success', message });
      setImageDataUrl('');
      setRemoveProfileImage(false);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={`${roleLabel} Profile`} subtitle="Update your admin identity and avatar." tone={tone}>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            {preview ? (
              <Image src={preview} alt="Profile preview" width={96} height={96} unoptimized className="h-full w-full object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center ${styles.soft}`}>
                <Camera className={`h-8 w-8 ${styles.text}`} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border ${styles.border} bg-slate-900 px-3 text-sm font-medium ${styles.text} transition-colors hover:bg-slate-800`}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>

        <Feedback error={error} success={success} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 ${styles.ring}`}
              placeholder="Your name"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Gender</span>
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className={`h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition-colors ${styles.ring}`}
            >
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Email</span>
          <input
            value={account?.email || ''}
            readOnly
            className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-500 outline-none"
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={loading} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles.button}`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Profile
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function RolePasswordModal({
  isOpen,
  onClose,
  endpoint,
  fetcher,
  tone,
  roleLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  endpoint: string;
  fetcher: RoleFetcher;
  tone: RoleTone;
  roleLabel: string;
}) {
  const { showSnackbar } = useSnackbar();
  const styles = toneStyles[tone];
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!isOpen) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError('');
    setSuccess('');
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update password.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const message = payload.message || 'Password updated successfully.';
      setSuccess(message);
      showSnackbar({ variant: 'success', message });
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 ${styles.ring}`;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={`${roleLabel} Password`} subtitle="Change your account password after confirming the current one." tone={tone}>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <Feedback error={error} success={success} />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Current Password</span>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={`${inputClass} pr-11`}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCurrent((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-slate-500 hover:text-slate-200">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">New Password</span>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={`${inputClass} pr-11`}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-slate-500 hover:text-slate-200">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Confirm Password</span>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={loading} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles.button}`}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
