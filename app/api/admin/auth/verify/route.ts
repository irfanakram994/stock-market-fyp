import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    let email: string | undefined;
    const accessToken = extractBearerToken(request.headers.get('authorization'));

    try {
      const body = await request.json();
      email = body?.email;
    } catch {
      email = undefined;
    }

    const result = await verifyAdminSession({ email, accessToken });
    return NextResponse.json(result, { status: result.success ? 200 : 401 });
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
