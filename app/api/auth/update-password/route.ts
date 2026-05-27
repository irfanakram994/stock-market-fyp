import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

function isStrongEnoughPassword(password: string) {
  return typeof password === 'string' && password.length >= 6;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : '';

    if (!isStrongEnoughPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Recovery token is missing or expired.' },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } = await supabaseServer.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: userError?.message || 'Invalid recovery token.' },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabaseServer.auth.admin.updateUserById(userData.user.id, {
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message || 'Unable to update password.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Password updated successfully. You can now sign in.',
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