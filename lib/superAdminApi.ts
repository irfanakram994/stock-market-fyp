import { supabase } from './supabaseClient';

export async function superAdminFetch(input: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (init?.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
