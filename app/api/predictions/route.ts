import { NextRequest, NextResponse } from 'next/server';
import { runPredictionAgent } from '@/lib/agentRunner';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/predictions - Fetch all predictions from database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '30');

    // Build where clause
    const where: any = {};
    if (symbol) {
      where.stock = { symbol: symbol.toUpperCase() };
    }

    // Fetch predictions with stock info
    const predictions = await prisma.prediction.findMany({
      where,
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
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/predictions - Run prediction via Python agents and store in database
 * Uses Prophet, Groq, News APIs - Stores results in Supabase via Prisma
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, forecastDays = 30, userId } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const symbolUpper = symbol.toString().toUpperCase();

    // 1. Run Python agent to get predictions
    const result = await runPredictionAgent(symbolUpper, forecastDays);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Prediction failed',
        },
        { status: 500 }
      );
    }

    // 2. Find or create the stock record
    let stock = await prisma.stock.findUnique({
      where: { symbol: symbolUpper },
    });

    if (!stock) {
      stock = await prisma.stock.create({
        data: {
          symbol: symbolUpper,
          name: symbolUpper, // Will be updated later with real name
          sector: null,
          industry: null,
          description: `${symbolUpper} stock predictions`,
        },
      });
    }

    // 3. Calculate average of all predictions and store ONE record
    if (result.predictions && Array.isArray(result.predictions) && result.predictions.length > 0) {
      // Calculate averages
      const avgPredictedPrice = result.predictions.reduce((sum, p) => sum + p.predictedPrice, 0) / result.predictions.length;
      const avgLowerBound = result.predictions.reduce((sum, p) => sum + p.lowerBound, 0) / result.predictions.length;
      const avgUpperBound = result.predictions.reduce((sum, p) => sum + p.upperBound, 0) / result.predictions.length;
      const avgConfidence = result.predictions.reduce((sum, p) => sum + p.confidence, 0) / result.predictions.length;

      // Store only ONE average prediction in database
      await prisma.prediction.create({
        data: {
          stockId: stock.id,
          predictionDate: new Date(result.predictions[0].date), // First prediction date
          predictedPrice: avgPredictedPrice,
          lowerBound: avgLowerBound,
          upperBound: avgUpperBound,
          confidence: avgConfidence,
          trend: result.trend,
          modelVersion: 'prophet-v1',
          llmSummary: result.insight,
        },
      });
    }

    // 4. Log the agent execution
    if (userId) {
      await prisma.agentLog.create({
        data: {
          userId,
          agentName: 'PredictionAgent',
          status: 'completed',
          input: { symbol: symbolUpper, forecastDays },
          output: {
            symbol: result.symbol,
            currentPrice: result.currentPrice,
            trend: result.trend,
            sentimentScore: result.sentimentScore,
            forecastDays: result.predictions?.length || 0,
            avgPredictedPrice: result.predictions ? result.predictions.reduce((sum, p) => sum + p.predictedPrice, 0) / result.predictions.length : null,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Prediction completed and average saved to database',
      data: {
        symbol: result.symbol,
        currentPrice: result.currentPrice,
        predictions: result.predictions, // Still return all predictions for chart
        trend: result.trend,
        insight: result.insight,
        sentimentScore: result.sentimentScore,
        avgPredictedPrice: result.predictions ? result.predictions.reduce((sum, p) => sum + p.predictedPrice, 0) / result.predictions.length : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error running prediction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run prediction',
        details: message,
      },
      { status: 500 }
    );
  }
}
