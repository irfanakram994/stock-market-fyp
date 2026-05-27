import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

type ForgotPasswordRole = 'user' | 'admin' | 'super-admin';

function isValidRole(role: string): role is ForgotPasswordRole {
  return role === 'user' || role === 'admin' || role === 'super-admin';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === 'string' ? body.email : '';
    const rawRole = typeof body?.role === 'string' ? body.role : 'user';

    const email = rawEmail.trim().toLowerCase();
    const role: ForgotPasswordRole = isValidRole(rawRole) ? rawRole : 'user';

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectTo = `${appBaseUrl}/auth/update-password?role=${encodeURIComponent(role)}`;

    const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Unable to send reset email' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If this email is registered, a password reset link has been sent.',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}