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
  isBlocked?: boolean;
  blockedReason?: string | null;
}

const BLOCKED_ACCOUNT_MESSAGE =
  'Your account has been blocked. Please contact the TradeFlux team to resolve this matter, as this restriction may be related to policy violations on your account.';

function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

async function readJsonBody(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function resolveAccessToken(request: NextRequest, body: any): string | undefined {
  const headerToken = extractBearerToken(request.headers.get('authorization'));
  if (headerToken) return headerToken;

  if (request.method === 'POST' && typeof body?.accessToken === 'string' && body.accessToken.length > 0) {
    return body.accessToken;
  }

  return undefined;
}

function resolveRefreshToken(request: NextRequest, body: any): string | undefined {
  if (request.method !== 'POST') return undefined;
  if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 0) {
    return body.refreshToken;
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
      isBlocked: true,
      blockedReason: true,
    },
  });

  return user;
}

async function handleUserRequest(request: NextRequest) {
  try {
    const body = request.method === 'POST' ? await readJsonBody(request) : {};
    const accessToken = resolveAccessToken(request, body);
    const refreshToken = resolveRefreshToken(request, body);
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

    if (appUser.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          error: BLOCKED_ACCOUNT_MESSAGE,
          code: 'USER_BLOCKED',
        },
        { status: 403 }
      );
    }

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
