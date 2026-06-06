import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

interface AppUserRow {
  id: string;
  email: string;
  name: string | null;
  gender?: string | null;
  profileImage?: string | null;
}

function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

async function resolveAccessToken(request: NextRequest): Promise<string | undefined> {
  const headerToken = extractBearerToken(request.headers.get('authorization'));
  if (headerToken) return headerToken;

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (typeof body?.accessToken === 'string' && body.accessToken.length > 0) {
        return body.accessToken;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

async function resolveRefreshToken(request: NextRequest): Promise<string | undefined> {
  if (request.method !== 'POST') return undefined;
  try {
    const body = await request.json();
    if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 0) {
      return body.refreshToken;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function resolveAuthenticatedUser(accessToken: string, refreshToken?: string) {
  const primary = await supabaseServer.auth.getUser(accessToken);
  if (!primary.error && primary.data.user) {
    return { user: primary.data.user };
  }

  if (!refreshToken) {
    return { user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null };
  }

  const recoveryClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const sessionResult = await recoveryClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionResult.error || !sessionResult.data.session) {
    return { user: null };
  }

  const recovered = await recoveryClient.auth.getUser(sessionResult.data.session.access_token);
  if (recovered.error || !recovered.data.user) {
    return { user: null };
  }

  return { user: recovered.data.user };
}

async function ensureAppUser(id: string, email: string, name: string | null): Promise<AppUserRow> {
  const user = await prisma.user.upsert({
    where: { id },
    update: {
      email,
      name: name ?? undefined,
    },
    create: {
      id,
      email,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      gender: true,
      profileImage: true,
    },
  });

  return user;
}

async function handleUserRequest(request: NextRequest) {
  try {
    const accessToken = await resolveAccessToken(request);
    const refreshToken = await resolveRefreshToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authResult = await resolveAuthenticatedUser(accessToken, refreshToken);

    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const appUser = await ensureAppUser(
      authResult.user.id,
      authResult.user.email || '',
      authResult.user.user_metadata?.name || null
    );

    return NextResponse.json({
      success: true,
      data: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        gender: appUser.gender,
        profileImage: appUser.profileImage,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleUserRequest(request);
}

export async function POST(request: NextRequest) {
  return handleUserRequest(request);
}
