import type { HistoricalMarketCandle } from "@/lib/agentRunner";

export const BACKTEST_STRATEGY_TYPE = "moving_average_crossover";

export interface BacktestStrategyConfig {
  strategyType: typeof BACKTEST_STRATEGY_TYPE;
  shortWindow: number;
  longWindow: number;
}

export interface BacktestPricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  shortMa: number | null;
  longMa: number | null;
}

export interface BacktestSignal {
  date: string;
  type: "BUY" | "SELL";
  price: number;
  shares: number;
  pnl: number | null;
  forcedExit?: boolean;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  holdingDays: number;
}

export interface BacktestCurvePoint {
  date: string;
  value: number;
}

export interface BacktestRunResult {
  strategyName: string;
  strategyConfig: BacktestStrategyConfig;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  buyHoldReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  lossRate: number;
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
  riskReward: number | null;
  equityCurve: BacktestCurvePoint[];
  benchmarkCurve: BacktestCurvePoint[];
  priceSeries: BacktestPricePoint[];
  signals: BacktestSignal[];
  trades: BacktestTrade[];
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function movingAverage(candles: HistoricalMarketCandle[], index: number, window: number) {
  if (index + 1 < window) return null;
  const slice = candles.slice(index - window + 1, index + 1);
  const sum = slice.reduce((total, candle) => total + candle.close, 0);
  return sum / window;
}

function daysBetween(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;
  return Math.max(0, Math.round((endTime - startTime) / (24 * 60 * 60 * 1000)));
}

function calculateMaxDrawdown(curve: BacktestCurvePoint[]) {
  let peak = curve[0]?.value || 0;
  let maxDrawdown = 0;

  for (const point of curve) {
    peak = Math.max(peak, point.value);
    if (peak > 0) {
      maxDrawdown = Math.min(maxDrawdown, ((point.value - peak) / peak) * 100);
    }
  }

  return Math.abs(round(maxDrawdown));
}

function calculateSharpeRatio(curve: BacktestCurvePoint[]) {
  const returns: number[] = [];
  for (let index = 1; index < curve.length; index += 1) {
    const previous = curve[index - 1].value;
    const current = curve[index].value;
    if (previous > 0) returns.push((current - previous) / previous);
  }

  if (returns.length < 2) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length;
  return variance > 0 ? round((mean / Math.sqrt(variance)) * Math.sqrt(252)) : 0;
}

export function runMovingAverageBacktest(
  candles: HistoricalMarketCandle[],
  initialCapital: number,
  config: BacktestStrategyConfig,
): BacktestRunResult {
  if (candles.length < config.longWindow + 2) {
    throw new Error(`At least ${config.longWindow + 2} historical candles are required for a ${config.longWindow}-day long moving average.`);
  }

  const priceSeries: BacktestPricePoint[] = candles.map((candle, index) => ({
    ...candle,
    shortMa: movingAverage(candles, index, config.shortWindow),
    longMa: movingAverage(candles, index, config.longWindow),
  })).map((point) => ({
    ...point,
    shortMa: point.shortMa === null ? null : round(point.shortMa),
    longMa: point.longMa === null ? null : round(point.longMa),
  }));

  let cash = initialCapital;
  let shares = 0;
  let openPosition: { entryDate: string; entryPrice: number; shares: number } | null = null;
  const trades: BacktestTrade[] = [];
  const signals: BacktestSignal[] = [];
  const equityCurve: BacktestCurvePoint[] = [];
  const firstClose = candles[0].close;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const pricePoint = priceSeries[index];
    const previous = priceSeries[index - 1];

    let buySignal = false;
    let sellSignal = false;
    if (
      previous
      && previous.shortMa !== null
      && previous.longMa !== null
      && pricePoint.shortMa !== null
      && pricePoint.longMa !== null
    ) {
      buySignal = shares === 0
        && previous.shortMa <= previous.longMa
        && pricePoint.shortMa > pricePoint.longMa;
      sellSignal = shares > 0
        && previous.shortMa >= previous.longMa
        && pricePoint.shortMa < pricePoint.longMa;
    }

    if (buySignal) {
      const purchasableShares = Math.floor(cash / candle.close);
      if (purchasableShares > 0) {
        shares = purchasableShares;
        cash -= shares * candle.close;
        openPosition = {
          entryDate: candle.date,
          entryPrice: candle.close,
          shares,
        };
        signals.push({
          date: candle.date,
          type: "BUY",
          price: round(candle.close),
          shares,
          pnl: null,
        });
      }
    } else if (sellSignal && openPosition) {
      const pnl = (candle.close - openPosition.entryPrice) * openPosition.shares;
      cash += openPosition.shares * candle.close;
      const trade: BacktestTrade = {
        entryDate: openPosition.entryDate,
        exitDate: candle.date,
        entryPrice: round(openPosition.entryPrice),
        exitPrice: round(candle.close),
        shares: openPosition.shares,
        pnl: round(pnl),
        pnlPercent: round(((candle.close - openPosition.entryPrice) / openPosition.entryPrice) * 100),
        holdingDays: daysBetween(openPosition.entryDate, candle.date),
      };
      trades.push(trade);
      signals.push({
        date: candle.date,
        type: "SELL",
        price: round(candle.close),
        shares: openPosition.shares,
        pnl: trade.pnl,
      });
      shares = 0;
      openPosition = null;
    }

    equityCurve.push({
      date: candle.date,
      value: round(cash + shares * candle.close),
    });
  }

  if (shares > 0 && openPosition) {
    const last = candles[candles.length - 1];
    const pnl = (last.close - openPosition.entryPrice) * openPosition.shares;
    cash += openPosition.shares * last.close;
    const trade: BacktestTrade = {
      entryDate: openPosition.entryDate,
      exitDate: last.date,
      entryPrice: round(openPosition.entryPrice),
      exitPrice: round(last.close),
      shares: openPosition.shares,
      pnl: round(pnl),
      pnlPercent: round(((last.close - openPosition.entryPrice) / openPosition.entryPrice) * 100),
      holdingDays: daysBetween(openPosition.entryDate, last.date),
    };
    trades.push(trade);
    signals.push({
      date: last.date,
      type: "SELL",
      price: round(last.close),
      shares: openPosition.shares,
      pnl: trade.pnl,
      forcedExit: true,
    });
    shares = 0;
    openPosition = null;
    equityCurve[equityCurve.length - 1] = {
      date: last.date,
      value: round(cash),
    };
  }

  const finalCapital = round(cash);
  const totalReturn = round(((finalCapital - initialCapital) / initialCapital) * 100);
  const lastClose = candles[candles.length - 1].close;
  const buyHoldReturn = round(((lastClose - firstClose) / firstClose) * 100);
  const benchmarkCurve = candles.map((candle) => ({
    date: candle.date,
    value: round(initialCapital * (candle.close / firstClose)),
  }));

  const profitableTrades = trades.filter((trade) => trade.pnl > 0);
  const losingTrades = trades.filter((trade) => trade.pnl < 0);
  const bestTrade = trades.length ? [...trades].sort((a, b) => b.pnl - a.pnl)[0] : null;
  const worstTrade = trades.length ? [...trades].sort((a, b) => a.pnl - b.pnl)[0] : null;
  const avgWin = profitableTrades.length
    ? profitableTrades.reduce((sum, trade) => sum + trade.pnl, 0) / profitableTrades.length
    : 0;
  const avgLoss = losingTrades.length
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length)
    : 0;

  return {
    strategyName: "Moving Average Crossover",
    strategyConfig: config,
    initialCapital: round(initialCapital),
    finalCapital,
    totalReturn,
    buyHoldReturn,
    sharpeRatio: calculateSharpeRatio(equityCurve),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    winRate: trades.length ? round((profitableTrades.length / trades.length) * 100) : 0,
    lossRate: trades.length ? round((losingTrades.length / trades.length) * 100) : 0,
    totalTrades: trades.length,
    profitableTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    bestTrade,
    worstTrade,
    riskReward: avgLoss > 0 ? round(avgWin / avgLoss) : null,
    equityCurve,
    benchmarkCurve,
    priceSeries,
    signals,
    trades,
  };
}
