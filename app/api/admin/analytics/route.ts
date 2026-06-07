import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

// GET - Fetch system analytics
export async function GET(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const adminDisabled = await requireModuleEnabled('admin_panel');
    if (adminDisabled) return adminDisabled;
    const analyticsDisabled = await requireModuleEnabled('analytics_module');
    if (analyticsDisabled) return analyticsDisabled;

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily user registrations
    const userRegistrations = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get daily predictions
    const dailyPredictions = await prisma.prediction.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      _avg: {
        confidence: true,
      },
    });

    // Get agent performance over time
    const agentLogs = await prisma.agentLog.findMany({
      where: {
        startedAt: { gte: startDate },
      },
      select: {
        agentName: true,
        status: true,
        duration: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'asc' },
    });

    // Process agent logs into daily stats
    const agentStats = agentLogs.reduce((acc, log) => {
      const date = log.startedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          completed: 0,
          failed: 0,
          avgDuration: 0,
          totalDuration: 0,
        };
      }
      acc[date].total++;
      if (log.status === 'completed') acc[date].completed++;
      if (log.status === 'failed') acc[date].failed++;
      if (log.duration) {
        acc[date].totalDuration += log.duration;
        acc[date].avgDuration = acc[date].totalDuration / acc[date].total;
      }
      return acc;
    }, {} as Record<string, {
      total: number;
      completed: number;
      failed: number;
      avgDuration: number;
      totalDuration: number;
    }>);

    // Get prediction trend distribution
    const predictionTrends = await prisma.prediction.groupBy({
      by: ['trend'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get stock sector distribution
    const stockSectors = await prisma.stock.groupBy({
      by: ['sector'],
      _count: true,
    });

    // Get agent type distribution
    const agentTypes = await prisma.agentLog.groupBy({
      by: ['agentName'],
      where: {
        startedAt: { gte: startDate },
      },
      _count: true,
    });

    // Get confidence distribution
    const confidenceRanges = await Promise.all([
      prisma.prediction.count({
        where: {
          createdAt: { gte: startDate },
          confidence: { gte: 0, lt: 0.25 },
        },
      }),
      prisma.prediction.count({
        where: {
          createdAt: { gte: startDate },
          confidence: { gte: 0.25, lt: 0.5 },
        },
      }),
      prisma.prediction.count({
        where: {
          createdAt: { gte: startDate },
          confidence: { gte: 0.5, lt: 0.75 },
        },
      }),
      prisma.prediction.count({
        where: {
          createdAt: { gte: startDate },
          confidence: { gte: 0.75, lte: 1 },
        },
      }),
    ]);

    // Get backtest performance summary
    const backtestStats = await prisma.backtestResult.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _avg: {
        totalReturn: true,
        sharpeRatio: true,
        winRate: true,
        maxDrawdown: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        timeRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days,
        },
        userGrowth: {
          dailyRegistrations: userRegistrations.map(u => ({
            date: u.createdAt,
            count: u._count,
          })),
        },
        predictionAnalytics: {
          dailyPredictions: dailyPredictions.map(p => ({
            date: p.createdAt,
            count: p._count,
            avgConfidence: p._avg.confidence,
          })),
          trendDistribution: predictionTrends.reduce((acc, t) => {
            acc[t.trend || 'unknown'] = t._count;
            return acc;
          }, {} as Record<string, number>),
          confidenceDistribution: {
            low: confidenceRanges[0],
            medium: confidenceRanges[1],
            high: confidenceRanges[2],
            veryHigh: confidenceRanges[3],
          },
        },
        agentAnalytics: {
          dailyStats: agentStats,
          typeDistribution: agentTypes.reduce((acc, a) => {
            acc[a.agentName] = a._count;
            return acc;
          }, {} as Record<string, number>),
        },
        stockAnalytics: {
          sectorDistribution: stockSectors.reduce((acc, s) => {
            acc[s.sector || 'Unknown'] = s._count;
            return acc;
          }, {} as Record<string, number>),
        },
        backtestAnalytics: {
          total: backtestStats._count,
          avgReturn: backtestStats._avg.totalReturn?.toFixed(2),
          avgSharpeRatio: backtestStats._avg.sharpeRatio?.toFixed(2),
          avgWinRate: backtestStats._avg.winRate?.toFixed(2),
          avgMaxDrawdown: backtestStats._avg.maxDrawdown?.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST - Create analytics snapshot
export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get('authorization'));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const adminDisabled = await requireModuleEnabled('admin_panel');
    if (adminDisabled) return adminDisabled;
    const analyticsDisabled = await requireModuleEnabled('analytics_module');
    if (analyticsDisabled) return analyticsDisabled;

    const [
      totalUsers,
      activeUsers,
      totalPredictions,
      avgConfidence,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          agentLogs: { some: {} },
        },
      }),
      prisma.prediction.count(),
      prisma.prediction.aggregate({ _avg: { confidence: true } }),
    ]);

    const snapshot = await prisma.systemAnalytics.create({
      data: {
        totalUsers,
        activeUsers,
        totalPredictions,
        avgConfidence: avgConfidence._avg.confidence || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Error creating analytics snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create analytics snapshot' },
      { status: 500 }
    );
  }
}
