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

    const [
      totalUsers,
      totalAdmins,
      totalSuperAdmins,
      totalPredictions,
      totalAgentLogs,
      totalAdminLogs,
      totalSuperAdminLogs,
      totalModules,
      enabledModules,
      activeThresholds,
      unreadNotifications,
      recentAdminActions,
      recentSuperAdminActions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.adminUser.count(),
      prisma.superAdminUser.count(),
      prisma.prediction.count(),
      prisma.agentLog.count(),
      prisma.adminAuditLog.count(),
      prisma.superAdminAuditLog.count(),
      prisma.systemModule.count(),
      prisma.systemModule.count({ where: { isEnabled: true } }),
      prisma.systemThreshold.count({ where: { isActive: true } }),
      prisma.adminNotification.count({ where: { isRead: false } }),
      prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { email: true, name: true } } },
      }),
      prisma.superAdminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { superAdmin: { select: { email: true, name: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          users: totalUsers,
          admins: totalAdmins,
          superAdmins: totalSuperAdmins,
          predictions: totalPredictions,
          agentLogs: totalAgentLogs,
          adminActivities: totalAdminLogs + totalSuperAdminLogs,
          modules: {
            total: totalModules,
            enabled: enabledModules,
          },
          activeThresholds,
          unreadNotifications,
        },
        recent: {
          adminActions: recentAdminActions,
          superAdminActions: recentSuperAdminActions,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
