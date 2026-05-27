import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifySuperAdminSession } from '@/lib/superAdminAuth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get('limit') || '25');

    const [agentActivities, adminActivities, superAdminActivities] = await Promise.all([
      prisma.agentLog.findMany({
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.adminAuditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { email: true, name: true } } },
      }),
      prisma.superAdminAuditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { superAdmin: { select: { email: true, name: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        agentActivities,
        adminActivities,
        superAdminActivities,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
