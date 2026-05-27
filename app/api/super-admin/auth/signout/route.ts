import { NextResponse } from 'next/server';
import { superAdminSignOut } from '@/lib/superAdminAuth';

export async function POST() {
  try {
    const result = await superAdminSignOut();
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sign out',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
