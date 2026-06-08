'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { resolveCurrentRole } from '@/lib/roleRouting';
import { useSnackbar } from '@/components/SnackbarProvider';
import { usePostLoginTransition } from '@/components/PostLoginTransition';

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

function hasEmailPasswordProvider(user: any) {
  if (user?.app_metadata?.tradeflux_password_set === true) return true;

  const providers = user?.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes('email')) return true;

  const identities = user?.identities;
  if (Array.isArray(identities)) {
    return identities.some((identity) => identity?.provider === 'email');
  }

  return false;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { startTransition } = usePostLoginTransition();
  const [status, setStatus] = useState('Completing secure sign in...');

  useEffect(() => {
    let mounted = true;

    const redirectHomeWithError = async (message: string) => {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Local cleanup is enough if the remote signout cannot complete.
      } finally {
        setAuthCookie(false);
      }

      if (!mounted) return;
      setStatus(message);
      showSnackbar({ variant: 'error', message, duration: 7000 });
      window.setTimeout(() => {
        if (mounted) router.replace('/');
      }, 1200);
    };

    const completeOAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const providerError = url.searchParams.get('error_description') || url.searchParams.get('error');
        if (providerError) {
          throw new Error(providerError);
        }

        setStatus('Verifying Google session...');
        let session: Session | null = null;
        const code = url.searchParams.get('code');

        if (code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) {
            const latest = await supabase.auth.getSession();
            if (!latest.data.session) {
              throw exchanged.error;
            }
            session = latest.data.session;
          } else {
            session = exchanged.data.session;
          }
        }

        if (!session) {
          const latest = await supabase.auth.getSession();
          session = latest.data.session;
        }

        if (!session?.access_token) {
          throw new Error('Unable to complete Google sign in. Please try again.');
        }

        setAuthCookie(true);
        setStatus('Resolving account access...');
        const roleResult = await resolveCurrentRole(session.access_token);

        if (!roleResult.success || !roleResult.redirectTo) {
          await redirectHomeWithError(roleResult.error || 'Unable to verify your account role. Please sign in again.');
          return;
        }

        if (
          roleResult.role === 'user' &&
          !hasEmailPasswordProvider(session.user)
        ) {
          if (!mounted) return;
          setStatus('Preparing your account security step...');
          router.replace(`/auth/set-password?next=${encodeURIComponent(roleResult.redirectTo)}`);
          return;
        }

        if (!mounted) return;
        router.prefetch(roleResult.redirectTo);
        startTransition({
          role: roleResult.role || 'user',
          destination: roleResult.redirectTo,
          displayName:
            roleResult.account?.name ||
            getFallbackDisplayName(roleResult.account?.email || session.user?.email),
        });
        router.replace(roleResult.redirectTo);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Google sign in failed. Please try again.';
        await redirectHomeWithError(message);
      }
    };

    void completeOAuth();

    return () => {
      mounted = false;
    };
  }, [router, showSnackbar, startTransition]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-200">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-white">TradeFlux authentication</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{status}</p>
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-sky-300" />
      </div>
    </div>
  );
}
