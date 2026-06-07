'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type Role = 'user' | 'admin' | 'super-admin';

function getLoginPath(role: string): string {
  if (role === 'admin') return '/admin/login';
  if (role === 'super-admin') return '/super-admin/login';
  return '/';
}

function getRoleLabel(role: string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'super-admin') return 'Super Admin';
  return 'User';
}

function UpdatePasswordContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') ?? 'user';
  const role = (roleParam === 'admin' || roleParam === 'super-admin' || roleParam === 'user')
    ? (roleParam as Role)
    : 'user';

  const loginPath = useMemo(() => getLoginPath(role), [role]);
  const roleLabel = useMemo(() => getRoleLabel(role), [role]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryAccessToken, setRecoveryAccessToken] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const initializeRecoverySession = async () => {
      setError('');

      try {
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get('access_token');
        const code = searchParams.get('code');

        if (accessToken) {
          setRecoveryAccessToken(accessToken);
          setHasRecoverySession(true);
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message || 'Recovery code is invalid or expired.');
            setHasRecoverySession(false);
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          const exchangedAccessToken = sessionData.session?.access_token;

          if (!exchangedAccessToken) {
            setError('Recovery session could not be established. Please request a new reset email.');
            setHasRecoverySession(false);
            return;
          }

          setRecoveryAccessToken(exchangedAccessToken);
          setHasRecoverySession(true);
          return;
        }

        setError('Recovery link is invalid or expired. Please request a new password reset email.');
        setHasRecoverySession(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize password recovery.');
        setHasRecoverySession(false);
      } finally {
        setInitializing(false);
      }
    };

    initializeRecoverySession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!recoveryAccessToken) {
      setError('Recovery token not found. Please use the latest password reset email link.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          accessToken: recoveryAccessToken,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || 'Unable to update password. Please retry using the email link.');
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-gray-400 mb-6">{roleLabel} account password recovery</p>

        {initializing && (
          <div className="mb-4 flex items-start space-x-2 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <Loader2 className="w-5 h-5 text-cyan-300 mt-0.5 flex-shrink-0 animate-spin" />
            <p className="text-cyan-200 text-sm">Verifying recovery link...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="flex items-start space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">Password updated successfully. You can now log in.</p>
            </div>
            <Link
              href={loginPath}
              className="w-full inline-flex items-center justify-center py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  placeholder="Enter new password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || initializing || !hasRecoverySession}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="flex items-center gap-3 text-cyan-200">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading password recovery...</span>
          </div>
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
