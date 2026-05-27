import { supabase } from './supabaseClient';

export async function adminFetch(input: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (init?.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...init,
    headers,
  };

  // When running on the server during build/prerender, force a dynamic fetch
  // so Next.js doesn't try to statically render API routes that inspect
  // request headers or request.url.
  if (typeof window === 'undefined') {
    // Add Next.js-specific cache option via the standard request cache flag.
    // This will mark the fetch as non-cacheable/dynamic during prerender.
    (fetchOptions as any).cache = 'no-store';
  }

  return fetch(input, fetchOptions);
}
