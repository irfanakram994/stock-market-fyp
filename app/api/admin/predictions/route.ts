import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractBearerToken, verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET - List predictions with filters
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const stockSymbol = searchParams.get('symbol');
    const trend = searchParams.get('trend');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (stockSymbol) {
      where.stock = { symbol: { contains: stockSymbol, mode: 'insensitive' } };
    }

    if (trend) {
      where.trend = trend;
    }

    if (startDate || endDate) {
      where.predictionDate = {};
      if (startDate) {
        (where.predictionDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.predictionDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stock: {
            select: {
              symbol: true,
              name: true,
              sector: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.prediction.aggregate({
      where,
      _avg: {
        confidence: true,
        predictedPrice: true,
      },
      _count: true,
    });

    // Trend distribution
    const trendDistribution = await prisma.prediction.groupBy({
      by: ['trend'],
      where,
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: predictions,
      stats: {
        avgConfidence: stats._avg.confidence 
          ? (stats._avg.confidence * 100).toFixed(1) 
          : 0,
        avgPredictedPrice: stats._avg.predictedPrice?.toFixed(2) || 0,
        trendDistribution: trendDistribution.reduce((acc, item) => {
          acc[item.trend || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
