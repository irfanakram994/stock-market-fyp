import { NextResponse } from 'next/server';
import { adminSignOut } from '@/lib/adminAuth';

export async function POST() {
  try {
    const result = await adminSignOut();
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Admin signout error:', error);
    return NextResponse.json(
      { success: false, error: 'Signout failed' },
      { status: 500 }
    );
  }
}
