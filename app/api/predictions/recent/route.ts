import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/predictions/recent - Get recent predictions grouped by stock
 * Returns the latest prediction for each stock symbol
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get the most recent prediction for each stock
    const predictions = await prisma.prediction.findMany({
      where: {
        predictionDate: {
          gte: new Date(), // Only future predictions
        },
      },
      include: {
        stock: {
          select: {
            symbol: true,
            name: true,
            sector: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit * 3, // Get more to account for grouping
    });

    // Group by stock symbol and keep only the latest
    const latestByStock = new Map();
    for (const pred of predictions) {
      if (!latestByStock.has(pred.stock.symbol)) {
        latestByStock.set(pred.stock.symbol, pred);
      }
    }

    // Convert to array and limit
    const result = Array.from(latestByStock.values())
      .slice(0, limit)
      .map(pred => ({
        id: pred.id,
        symbol: pred.stock.symbol,
        name: pred.stock.name,
        sector: pred.stock.sector,
        predictionDate: pred.predictionDate,
        predictedPrice: pred.predictedPrice,
        lowerBound: pred.lowerBound,
        upperBound: pred.upperBound,
        confidence: pred.confidence,
        trend: pred.trend,
        llmSummary: pred.llmSummary,
        createdAt: pred.createdAt,
      }));

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching recent predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent predictions' },
      { status: 500 }
    );
  }
}
