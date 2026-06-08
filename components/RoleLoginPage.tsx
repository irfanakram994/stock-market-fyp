"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { resolveCurrentRole, type ResolvedRole } from "@/lib/roleRouting";
import { useSnackbar } from "@/components/SnackbarProvider";
import { usePostLoginTransition } from "@/components/PostLoginTransition";

type RoleLoginConfig = {
  expectedRole: Extract<ResolvedRole, "admin" | "super_admin">;
  title: string;
  subtitle: string;
  targetPath: string;
  accentClass: string;
  buttonClass: string;
};

function getFallbackDisplayName(email?: string | null) {
  if (!email) return undefined;
  const [localPart] = email.split("@");
  if (!localPart) return undefined;
  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clearBrowserAuthState() {
  if (typeof window === "undefined") return;

  document.cookie = "tradeflux-auth=; path=/; max-age=0; samesite=lax";

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }
}

async function clearExistingSession() {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Continue with local cleanup. Login should not be blocked by stale signout.
  } finally {
    clearBrowserAuthState();
  }
}

export default function RoleLoginPage({
  expectedRole,
  title,
  subtitle,
  targetPath,
  accentClass,
  buttonClass,
}: RoleLoginConfig) {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { startTransition } = usePostLoginTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkExistingRole = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        const roleResult = await resolveCurrentRole(accessToken);
        if (roleResult.success && roleResult.role === expectedRole) {
          router.replace(targetPath);
          return;
        }

        await clearExistingSession();
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkExistingRole();

    return () => {
      mounted = false;
    };
  }, [expectedRole, router, targetPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await clearExistingSession();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session?.access_token) {
        const message = signInError?.message || "Unable to sign in.";
        setError(message);
        showSnackbar({ variant: "error", message });
        return;
      }

      const roleResult = await resolveCurrentRole(data.session.access_token);
      if (!roleResult.success || roleResult.role !== expectedRole) {
        await clearExistingSession();
        const message =
          roleResult.success
            ? `Access denied. This account is not allowed to access ${title}.`
            : roleResult.error || "Unable to verify account role.";
        setError(message);
        showSnackbar({ variant: "error", message });
        return;
      }

      router.prefetch(targetPath);
      startTransition({
        role: expectedRole,
        destination: targetPath,
        displayName: roleResult.account?.name || getFallbackDisplayName(roleResult.account?.email || email),
      });
      router.replace(targetPath);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
      showSnackbar({ variant: "error", message });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-gray-300">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p>Checking existing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accentClass}`}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 text-slate-100 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="admin@tradeflux.local"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-12 text-slate-100 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
