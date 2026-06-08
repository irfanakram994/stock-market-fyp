import { NextRequest, NextResponse } from 'next/server';
import { superAdminSignIn } from '@/lib/superAdminAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await superAdminSignIn(email, password);

    return NextResponse.json(
      result.success
        ? result
        : { success: false, error: result.error || result.message },
      { status: result.success ? 200 : 401 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sign in',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
