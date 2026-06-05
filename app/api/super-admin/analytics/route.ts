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

    const days = Number(request.nextUrl.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [analyticsSnapshots, trendDistribution, confidenceStats, backtestSummary] = await Promise.all([
      prisma.systemAnalytics.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),
      prisma.prediction.groupBy({
        by: ['trend'],
        where: { createdAt: { gte: startDate } },
        _count: { trend: true },
        _avg: { confidence: true },
      }),
      prisma.prediction.aggregate({
        where: { createdAt: { gte: startDate } },
        _avg: { confidence: true },
        _max: { confidence: true },
        _min: { confidence: true },
      }),
      prisma.backtestResult.aggregate({
        _count: { id: true },
        _avg: { totalReturn: true, sharpeRatio: true, winRate: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        analyticsSnapshots,
        trendDistribution,
        confidenceStats,
        backtestSummary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
