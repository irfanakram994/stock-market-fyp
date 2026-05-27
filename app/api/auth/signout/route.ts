import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const success = await signOut();

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to sign out' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Signed out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Signout API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
