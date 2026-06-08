import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const result = await verifyAdminSession({ accessToken });
    return NextResponse.json(result, { status: result.success ? 200 : 401 });
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
