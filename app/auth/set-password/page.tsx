'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { resolveCurrentRole } from '@/lib/roleRouting';
import { usePostLoginTransition } from '@/components/PostLoginTransition';
import { useSnackbar } from '@/components/SnackbarProvider';

function setAuthCookie(isAuthenticated: boolean) {
  document.cookie = isAuthenticated
    ? 'tradeflux-auth=1; path=/; max-age=604800; samesite=lax'
    : 'tradeflux-auth=; path=/; max-age=0; samesite=lax';
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

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSnackbar } = useSnackbar();
  const { startTransition } = usePostLoginTransition();
  const nextPath = useMemo(() => {
    const next = searchParams.get('next') || '/dashboard';
    return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        setAuthCookie(false);
        router.replace('/');
        return;
      }

      if (mounted) {
        setEmail(data.session.user.email || '');
        setInitializing(false);
      }
    };

    void loadSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setAuthCookie(false);
    router.replace('/');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session expired. Please sign in with Google again.');
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPassword: '',
          newPassword: password,
          confirmPassword,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to set password.');
      }

      setSuccess(true);
      showSnackbar({
        variant: 'success',
        message: payload.message || 'Password set successfully.',
      });

      const signedIn = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signedIn.error || !signedIn.data.session?.access_token) {
        throw new Error(signedIn.error?.message || 'Password was set, but sign in could not be refreshed. Please sign in again.');
      }

      setAuthCookie(true);
      const freshAccessToken = signedIn.data.session.access_token;
      const roleResult = await resolveCurrentRole(freshAccessToken);
      const destination = roleResult.success && roleResult.redirectTo ? roleResult.redirectTo : nextPath;
      router.prefetch(destination);
      window.setTimeout(() => {
        startTransition({
          role: roleResult.role || 'user',
          destination,
          displayName:
            roleResult.account?.name ||
            getFallbackDisplayName(roleResult.account?.email || email),
        });
        router.replace(destination);
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to set password.';
      setError(message);
      showSnackbar({ variant: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-white text-slate-950 shadow-2xl shadow-black/40">
        <div className="bg-slate-950 px-7 py-6 text-white">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-200">
            <KeyRound className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">Secure your account</p>
          <h1 className="mt-3 text-2xl font-semibold">Create your TradeFlux password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Your Google sign-in is ready. Set a password now so you can also sign in with your email later.
          </p>
        </div>

        <div className="p-7">
          {initializing ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              Checking your secure session...
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Google account</p>
                <p className="mt-1 truncate text-sm font-medium text-slate-900">{email}</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Password set. Opening your dashboard...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-2 top-1/2 rounded-md p-1.5 -translate-y-1/2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting password...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
          <div className="flex items-center gap-3 text-sky-200">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading account security...</span>
          </div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
