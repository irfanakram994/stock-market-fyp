import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabaseClient';

function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

function validPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 6;
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase client configuration is missing.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = await supabaseServer.auth.getUser(accessToken);
    const user = authUser.data.user;
    if (authUser.error || !user?.id || !user.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
    const requiresCurrentPassword = hasEmailPasswordProvider(user);

    if (requiresCurrentPassword && !currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is required.' }, { status: 400 });
    }

    if (!validPassword(newPassword)) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: 'New password and confirmation do not match.' }, { status: 400 });
    }

    if (currentPassword && newPassword === currentPassword) {
      return NextResponse.json({ success: false, error: 'New password must be different from current password.' }, { status: 400 });
    }

    if (requiresCurrentPassword) {
      const signInCheck = await createAnonClient().auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInCheck.error) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
      }
    }

    const { error } = await supabaseServer.auth.admin.updateUserById(user.id, {
      password: newPassword,
      app_metadata: {
        ...(user.app_metadata || {}),
        tradeflux_password_set: true,
      },
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message || 'Unable to update password.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: requiresCurrentPassword
        ? 'Password updated successfully.'
        : 'Password set successfully. You can now sign in with email and password too.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update password.' },
      { status: 500 },
    );
  }
}
