import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    let email: string | undefined;

    try {
      const body = await request.json();
      email = body?.email;
    } catch {
      email = undefined;
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await verifySuperAdminSession({ email, accessToken });
    if (!result.success || !result.superAdmin) {
      return NextResponse.json(
        { success: false, error: result.error || result.message || 'Access denied' },
        { status: 401 }
      );
    }

    await prisma.superAdminUser.update({
      where: { id: result.superAdmin.id },
      data: { lastLogin: new Date() },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Super Admin signin successful',
        superAdmin: result.superAdmin,
      },
      { status: 200 }
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
