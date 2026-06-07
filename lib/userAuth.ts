import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

export async function requireUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email || '',
  };
}
