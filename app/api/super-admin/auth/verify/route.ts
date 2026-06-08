import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const result = await verifySuperAdminSession({ accessToken });
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
