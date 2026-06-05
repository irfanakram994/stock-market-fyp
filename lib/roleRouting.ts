import { supabase } from './supabaseClient';

export type ResolvedRole = 'user' | 'admin' | 'super_admin';

export interface RoleResolution {
  success: boolean;
  role?: ResolvedRole;
  redirectTo?: string;
  error?: string;
  code?: string;
}

export async function resolveCurrentRole(): Promise<RoleResolution> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const res = await fetch('/api/auth/resolve-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!res) {
        return { success: false, error: 'No response from role resolver' };
      }

      const result = await res.json();
      if (!res.ok || !result.success) {
        return {
          success: false,
          error: result?.error || 'Unable to resolve account role',
          code: result?.code,
        };
      }

      return {
        success: true,
        role: result.role,
        redirectTo: result.redirectTo,
      };
    } catch (err) {
      // Network or runtime failure during fetch
      // eslint-disable-next-line no-console
      console.error('Role resolution fetch failed:', err);
      return { success: false, error: (err as Error).message || 'Network error' };
    }
  } catch (err) {
    // Unexpected error while getting session
    // eslint-disable-next-line no-console
    console.error('Failed to get session for role resolution:', err);
    return { success: false, error: (err as Error).message || 'Session error' };
  }
}
