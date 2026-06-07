import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const adminEmail = request.nextUrl.searchParams.get('adminEmail') || undefined;
    const session = await verifyAdminSession({ email: adminEmail, accessToken });
    if (!session.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const disabled = await requireModuleEnabled('admin_panel');
    if (disabled) return disabled;

    // Get current date info
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all stats in parallel
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalPredictions,
      predictionsToday,
      predictionsThisWeek,
      totalStocks,
      activeStocks,
      totalAgentLogs,
      completedAgentLogs,
      failedAgentLogs,
      runningAgentLogs,
      totalBacktests,
      recentAgentLogs,
      recentPredictions,
      avgConfidence,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.prediction.count(),
      prisma.prediction.count({ where: { createdAt: { gte: today } } }),
      prisma.prediction.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.stock.count(),
      prisma.stock.count({ where: { isActive: true } }),
      prisma.agentLog.count(),
      prisma.agentLog.count({ where: { status: 'completed' } }),
      prisma.agentLog.count({ where: { status: 'failed' } }),
      prisma.agentLog.count({ where: { status: 'running' } }),
      prisma.backtestResult.count(),
      prisma.agentLog.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          agentName: true,
          status: true,
          duration: true,
          startedAt: true,
        },
      }),
      prisma.prediction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          stock: { select: { symbol: true, name: true } },
        },
      }),
      prisma.prediction.aggregate({
        _avg: { confidence: true },
      }),
    ]);

    // Calculate success rate
    const totalFinished = completedAgentLogs + failedAgentLogs;
    const successRate = totalFinished > 0 
      ? ((completedAgentLogs / totalFinished) * 100).toFixed(1) 
      : 0;

    // System health metrics
    const systemHealth = {
      agentStatus: runningAgentLogs > 0 ? 'active' : 'idle',
      successRate: parseFloat(successRate.toString()),
      avgConfidence: avgConfidence._avg.confidence 
        ? (avgConfidence._avg.confidence * 100).toFixed(1) 
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek,
          newThisMonth: newUsersThisMonth,
        },
        predictions: {
          total: totalPredictions,
          today: predictionsToday,
          thisWeek: predictionsThisWeek,
          avgConfidence: systemHealth.avgConfidence,
        },
        stocks: {
          total: totalStocks,
          active: activeStocks,
        },
        agents: {
          total: totalAgentLogs,
          completed: completedAgentLogs,
          failed: failedAgentLogs,
          running: runningAgentLogs,
          successRate: systemHealth.successRate,
        },
        backtests: {
          total: totalBacktests,
        },
        systemHealth,
        recentActivity: {
          agentLogs: recentAgentLogs,
          predictions: recentPredictions,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
