import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

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

    const result = await verifySuperAdminSession({ email, accessToken });
    return NextResponse.json(result, { status: result.success ? 200 : 401 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to verify session',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
