import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/userAuth";
import { requireModuleEnabled } from "@/lib/moduleGuard";
import { runHistoricalMarketData } from "@/lib/agentRunner";
import {
  BACKTEST_STRATEGY_TYPE,
  runMovingAverageBacktest,
  type BacktestStrategyConfig,
} from "@/lib/backtesting";

export const dynamic = "force-dynamic";

const DEFAULT_SHORT_WINDOW = 20;
const DEFAULT_LONG_WINDOW = 50;
const MAX_WINDOW = 250;

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeWindow(value: unknown, fallback: number) {
  const numeric = Number(value ?? fallback);
  return Number.isInteger(numeric) ? numeric : NaN;
}

// GET /api/backtesting - List current user's backtest results
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const disabled = await requireModuleEnabled("forecasting_module");
    if (disabled) return disabled;

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);

    const where = symbol ? { userId: user.id, stock: { symbol } } : { userId: user.id };
    const results = await prisma.backtestResult.findMany({
      where,
      include: {
        stock: {
          select: {
            symbol: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching backtest results:", error);
    const msg = `${error instanceof Error ? error.message : ""} ${JSON.stringify(error)}`;
    if (/Can't reach database|ECONNREFUSED|database server/i.test(msg)) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch backtest results" },
      { status: 500 },
    );
  }
}

// POST /api/backtesting - Run a new moving-average crossover backtest
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const disabled = await requireModuleEnabled("forecasting_module");
    if (disabled) return disabled;

    const body = await request.json();
    const symbol = String(body.symbol || "").trim().toUpperCase();
    const strategyType = String(body.strategyType || BACKTEST_STRATEGY_TYPE);
    const start = parseDateOnly(body.startDate);
    const end = parseDateOnly(body.endDate);
    const capital = Number(body.initialCapital);
    const shortWindow = normalizeWindow(body.shortWindow, DEFAULT_SHORT_WINDOW);
    const longWindow = normalizeWindow(body.longWindow, DEFAULT_LONG_WINDOW);

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 });
    }

    if (!/^[A-Z0-9.^-]{1,15}$/.test(symbol)) {
      return NextResponse.json({ success: false, error: "Enter a valid stock ticker symbol." }, { status: 400 });
    }

    if (!start || !end || start >= end) {
      return NextResponse.json(
        { success: false, error: "Start date must be before end date." },
        { status: 400 },
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (end > today) {
      return NextResponse.json(
        { success: false, error: "End date must be today or a past trading date." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(capital) || capital <= 0) {
      return NextResponse.json(
        { success: false, error: "Initial capital must be greater than 0." },
        { status: 400 },
      );
    }

    if (strategyType !== BACKTEST_STRATEGY_TYPE) {
      return NextResponse.json(
        { success: false, error: "Only Moving Average Crossover is supported right now." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(shortWindow) || shortWindow < 2 || shortWindow > MAX_WINDOW) {
      return NextResponse.json(
        { success: false, error: `Short MA window must be an integer between 2 and ${MAX_WINDOW}.` },
        { status: 400 },
      );
    }

    if (!Number.isFinite(longWindow) || longWindow < 3 || longWindow > MAX_WINDOW) {
      return NextResponse.json(
        { success: false, error: `Long MA window must be an integer between 3 and ${MAX_WINDOW}.` },
        { status: 400 },
      );
    }

    if (shortWindow >= longWindow) {
      return NextResponse.json(
        { success: false, error: "Short MA window must be less than the long MA window." },
        { status: 400 },
      );
    }

    const startDate = dateOnly(start);
    const endDate = dateOnly(end);
    const marketResult = await runHistoricalMarketData(symbol, startDate, endDate);
    if (!marketResult.success) {
      return NextResponse.json(
        { success: false, error: marketResult.error || "Failed to fetch historical market data." },
        { status: 502 },
      );
    }

    const candles = marketResult.candles || [];
    if (candles.length < longWindow + 2) {
      return NextResponse.json(
        {
          success: false,
          error: `Not enough historical data for ${symbol}. Need at least ${longWindow + 2} trading days for a ${longWindow}-day long MA; found ${candles.length}. Try a wider date range.`,
        },
        { status: 400 },
      );
    }

    const strategyConfig: BacktestStrategyConfig = {
      strategyType: BACKTEST_STRATEGY_TYPE,
      shortWindow,
      longWindow,
    };
    const backtest = runMovingAverageBacktest(candles, capital, strategyConfig);

    let stock = await prisma.stock.findUnique({ where: { symbol } });
    if (!stock) {
      const info = marketResult.info || {};
      const name = typeof info.name === "string" && info.name.trim()
        ? info.name.trim()
        : typeof info.shortName === "string" && info.shortName.trim()
          ? info.shortName.trim()
          : symbol;
      stock = await prisma.stock.create({
        data: {
          symbol,
          name,
          sector: typeof info.sector === "string" ? info.sector : null,
          industry: typeof info.industry === "string" ? info.industry : null,
        },
      });
    }

    const result = await prisma.backtestResult.create({
      data: {
        stockId: stock.id,
        userId: user.id,
        strategyName: backtest.strategyName,
        startDate: start,
        endDate: end,
        initialCapital: backtest.initialCapital,
        finalCapital: backtest.finalCapital,
        totalReturn: backtest.totalReturn,
        sharpeRatio: backtest.sharpeRatio,
        maxDrawdown: backtest.maxDrawdown,
        winRate: backtest.winRate,
        lossRate: backtest.lossRate,
        totalTrades: backtest.totalTrades,
        profitableTrades: backtest.profitableTrades,
        losingTrades: backtest.losingTrades,
        buyHoldReturn: backtest.buyHoldReturn,
        bestTrade: backtest.bestTrade ? jsonValue(backtest.bestTrade) : undefined,
        worstTrade: backtest.worstTrade ? jsonValue(backtest.worstTrade) : undefined,
        riskReward: backtest.riskReward,
        strategyConfig: jsonValue(backtest.strategyConfig),
        priceSeries: jsonValue(backtest.priceSeries),
        signals: jsonValue(backtest.signals),
        benchmarkCurve: jsonValue(backtest.benchmarkCurve),
        equityCurve: jsonValue(backtest.equityCurve),
        trades: jsonValue(backtest.trades),
      },
      include: {
        stock: {
          select: { symbol: true, name: true },
        },
      },
    });

    console.info("Backtest completed", {
      userId: user.id,
      symbol,
      startDate,
      endDate,
      shortWindow,
      longWindow,
      totalTrades: backtest.totalTrades,
      totalReturn: backtest.totalReturn,
    });

    return NextResponse.json({
      success: true,
      message: "Backtest completed",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating backtest:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create backtest", details: message },
      { status: 500 },
    );
  }
}
