import { NextRequest, NextResponse } from "next/server";
import { runPredictionAgent } from "@/lib/agentRunner";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/userAuth";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { requireModuleEnabled } from "@/lib/moduleGuard";

export const dynamic = "force-dynamic";

type SentimentArticle = {
  title?: string;
  description?: string;
  content?: string;
  source?: string;
  author?: string;
  url?: string;
  imageUrl?: string;
  publishedAt?: string;
  sentiment?: {
    score?: number;
    compound?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
    label?: string;
  };
};

function toFiniteNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toDate(value: unknown) {
  if (typeof value !== "string" || !value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function saveSentimentArticles(stockId: string, articles?: SentimentArticle[]) {
  if (!articles?.length) return 0;

  let saved = 0;
  for (const article of articles) {
    const title = article.title?.trim();
    const url = article.url?.trim();
    if (!title || !url) continue;

    const existing = await prisma.news.findFirst({
      where: { stockId, url },
      select: { id: true },
    });

    const news = existing
      ? await prisma.news.update({
          where: { id: existing.id },
          data: {
            title,
            description: article.description || null,
            content: article.content || null,
            source: article.source || "Unknown",
            author: article.author || null,
            imageUrl: article.imageUrl || null,
            publishedAt: toDate(article.publishedAt),
          },
          select: { id: true },
        })
      : await prisma.news.create({
          data: {
            stockId,
            title,
            description: article.description || null,
            content: article.content || null,
            source: article.source || "Unknown",
            author: article.author || null,
            url,
            imageUrl: article.imageUrl || null,
            publishedAt: toDate(article.publishedAt),
          },
          select: { id: true },
        });

    const sentiment = article.sentiment;
    if (sentiment) {
      const score = toFiniteNumber(sentiment.score);
      await prisma.sentiment.upsert({
        where: { newsId: news.id },
        update: {
          score,
          compound: toFiniteNumber(sentiment.compound, score),
          positive: toFiniteNumber(sentiment.positive),
          negative: toFiniteNumber(sentiment.negative),
          neutral: toFiniteNumber(sentiment.neutral, 1),
          label:
            sentiment.label ||
            (score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral"),
        },
        create: {
          newsId: news.id,
          score,
          compound: toFiniteNumber(sentiment.compound, score),
          positive: toFiniteNumber(sentiment.positive),
          negative: toFiniteNumber(sentiment.negative),
          neutral: toFiniteNumber(sentiment.neutral, 1),
          label:
            sentiment.label ||
            (score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral"),
        },
      });
    }

    saved += 1;
  }

  return saved;
}

/**
 * GET /api/predictions - Fetch all predictions from database
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const disabled = await requireModuleEnabled("forecasting_module");
    if (disabled) return disabled;

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const limit = parseInt(searchParams.get("limit") || "30");

    // Build where clause
    const where: any = { userId: user.id };
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
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch predictions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/predictions - Run prediction via Python agents and store in database
 * Uses Prophet, OpenAI/Groq LLM, News APIs - Stores results in Supabase via Prisma
 */
export async function POST(request: NextRequest) {
  let logId: string | null = null;
  const startedAt = Date.now();
  const runId = randomUUID();

  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const disabled = await requireModuleEnabled("forecasting_module");
    if (disabled) return disabled;

    const body = await request.json();
    const { symbol, forecastDays = 30 } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol is required" },
        { status: 400 },
      );
    }

    const symbolUpper = symbol.toString().toUpperCase();

    const runningLog = await prisma.agentLog.create({
      data: {
        userId: user.id,
        agentName: "PredictionOrchestrator",
        status: "running",
        input: { symbol: symbolUpper, forecastDays, runId, stageOrder: 0, mode: "full_prediction" },
      },
    });
    logId = runningLog.id;

    // 1. Run Python agent to get predictions
    const result = await runPredictionAgent(symbolUpper, forecastDays);

    if (!result.success) {
      await prisma.agentLog.update({
        where: { id: runningLog.id },
        data: {
          status: "failed",
          error: result.error || "Prediction failed",
          duration: Date.now() - startedAt,
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Prediction failed",
        },
        { status: 500 },
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
    if (
      result.predictions &&
      Array.isArray(result.predictions) &&
      result.predictions.length > 0
    ) {
      // Calculate averages
      const avgPredictedPrice =
        result.predictions.reduce((sum, p) => sum + p.predictedPrice, 0) /
        result.predictions.length;
      const avgLowerBound =
        result.predictions.reduce((sum, p) => sum + p.lowerBound, 0) /
        result.predictions.length;
      const avgUpperBound =
        result.predictions.reduce((sum, p) => sum + p.upperBound, 0) /
        result.predictions.length;
      const avgConfidence =
        result.predictions.reduce((sum, p) => sum + p.confidence, 0) /
        result.predictions.length;

      // Store only ONE average prediction in database
      await prisma.prediction.create({
        data: {
          stockId: stock.id,
          userId: user.id,
          predictionDate: new Date(result.predictions[0].date), // First prediction date
          predictedPrice: avgPredictedPrice,
          lowerBound: avgLowerBound,
          upperBound: avgUpperBound,
          confidence: avgConfidence,
          trend: result.trend,
          modelVersion: "prophet-v1",
          llmSummary: result.insight,
        },
      });
    }

    const savedSentimentArticles = await saveSentimentArticles(
      stock.id,
      result.sentimentArticles,
    );

    // 4. Log the agent execution
    await prisma.agentLog.update({
      where: { id: runningLog.id },
      data: {
          agentName: "PredictionOrchestrator",
          status: "completed",
          input: { symbol: symbolUpper, forecastDays, runId, stageOrder: 0, mode: "full_prediction" },
          output: {
            symbol: result.symbol,
            currentPrice: result.currentPrice,
            trend: result.trend,
            sentimentScore: result.sentimentScore,
            savedSentimentArticles,
            forecastDays: result.predictions?.length || 0,
            avgPredictedPrice: result.predictions
              ? result.predictions.reduce(
                  (sum, p) => sum + p.predictedPrice,
                  0,
                ) / result.predictions.length
              : null,
          },
          duration: Date.now() - startedAt,
          completedAt: new Date(),
      },
    });

    const completedAt = new Date();
    const stageNames = [
      "MarketDataAgent",
      "NewsFetcherAgent",
      "SentimentAgent",
      "PreprocessingAgent",
      "ForecastAgent",
      "InsightAgent",
      "PredictionAgent",
    ];
    await prisma.agentLog.createMany({
      data: stageNames.map((agentName, index) => {
        const output: Record<string, string | number | null | undefined> = {
          symbol: result.symbol,
          trend: result.trend,
          stage: agentName,
        };
        if (agentName === "MarketDataAgent") output.currentPrice = result.currentPrice;
        if (agentName === "SentimentAgent") output.sentimentScore = result.sentimentScore;
        if (agentName === "ForecastAgent") output.forecastDays = result.predictions?.length || 0;

        return {
          userId: user.id,
          agentName,
          status: "completed",
          input: { symbol: symbolUpper, forecastDays, runId, stageOrder: index + 1, mode: "full_prediction" },
          output: output as Prisma.InputJsonObject,
          duration: Math.max(1, Math.round((Date.now() - startedAt) / stageNames.length)),
          startedAt: new Date(startedAt + index),
          completedAt,
        };
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Prediction completed and average saved to database",
      data: {
        symbol: result.symbol,
        currentPrice: result.currentPrice,
        predictions: result.predictions, // Still return all predictions for chart
        trend: result.trend,
        insight: result.insight,
        sentimentScore: result.sentimentScore,
        savedSentimentArticles,
        avgPredictedPrice: result.predictions
          ? result.predictions.reduce((sum, p) => sum + p.predictedPrice, 0) /
            result.predictions.length
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error running prediction:", error);
    if (logId) {
      try {
        await prisma.agentLog.update({
          where: { id: logId },
          data: {
            status: "failed",
            error: message,
            duration: Date.now() - startedAt,
            completedAt: new Date(),
          },
        });
      } catch (logError) {
        console.error("Error updating failed prediction log:", logError);
      }
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run prediction",
        details: message,
      },
      { status: 500 },
    );
  }
}
