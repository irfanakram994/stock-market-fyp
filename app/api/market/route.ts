import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { runAgentSync } from '@/lib/agentRunner';
import { requireModuleEnabled } from '@/lib/moduleGuard';
import { requireUser } from '@/lib/userAuth';

interface MarketCandle {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    ema20: number | null;
    ema50: number | null;
    ema200: number | null;
    volatility: number | null;
}

interface MarketResponseData {
    symbol: string;
    prices: Array<{ date: string; price: number }>;
    candles: MarketCandle[];
    info?: Record<string, unknown>;
    analysis: Record<string, unknown>;
}

interface MarketCacheEntry {
    expiresAt: number;
    data: MarketResponseData;
}

const MARKET_CACHE_TTL_MS = 5 * 60 * 1000;
const marketCache = new Map<string, MarketCacheEntry>();

function asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
}

function valueFrom(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
}

function latestValue(candles: MarketCandle[], key: keyof MarketCandle): number | null {
    for (let index = candles.length - 1; index >= 0; index -= 1) {
        const value = candles[index][key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
}

function percentChange(current: number | null, previous: number | null) {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

function classifyRsi(value: number | null) {
    if (value === null) return 'N/A';
    if (value < 30) return 'Oversold';
    if (value > 70) return 'Overbought';
    return 'Neutral';
}

function classifyMacd(macd: number | null, signal: number | null) {
    if (macd === null || signal === null) return 'N/A';
    return macd >= signal ? 'Bullish' : 'Bearish';
}

function emaStatus(price: number | null, ema: number | null) {
    if (price === null || ema === null) return 'N/A';
    return price >= ema ? 'Price Above' : 'Price Below';
}

function trendFromScore(score: number) {
    if (score >= 65) return 'Bullish';
    if (score <= 35) return 'Bearish';
    return 'Neutral';
}

function riskFromScore(score: number | null) {
    if (score === null) return 'N/A';
    if (score >= 67) return 'High';
    if (score >= 34) return 'Medium';
    return 'Low';
}

function findSupportResistance(candles: MarketCandle[], currentPrice: number | null) {
    const recent = candles.slice(-60);
    const supports: number[] = [];
    const resistances: number[] = [];

    for (let index = 1; index < recent.length - 1; index += 1) {
        const prev = recent[index - 1];
        const current = recent[index];
        const next = recent[index + 1];
        if (current.low !== null && prev.low !== null && next.low !== null && current.low <= prev.low && current.low <= next.low) {
            supports.push(current.low);
        }
        if (current.high !== null && prev.high !== null && next.high !== null && current.high >= prev.high && current.high >= next.high) {
            resistances.push(current.high);
        }
    }

    const lows = recent.map((point) => point.low ?? point.close).filter((value) => value > 0);
    const highs = recent.map((point) => point.high ?? point.close).filter((value) => value > 0);
    const unique = (values: number[]) => Array.from(new Set(values.map((value) => Number(value.toFixed(2)))));

    const supportCandidates = unique([
        ...supports,
        ...lows.sort((a, b) => a - b).slice(0, 5),
    ]).filter((value) => currentPrice === null || value <= currentPrice);

    const resistanceCandidates = unique([
        ...resistances,
        ...highs.sort((a, b) => b - a).slice(0, 5),
    ]).filter((value) => currentPrice === null || value >= currentPrice);

    return {
        support1: supportCandidates.sort((a, b) => b - a)[0] ?? null,
        support2: supportCandidates.sort((a, b) => b - a)[1] ?? null,
        resistance1: resistanceCandidates.sort((a, b) => a - b)[0] ?? null,
        resistance2: resistanceCandidates.sort((a, b) => a - b)[1] ?? null,
    };
}

function buildAnalysis(candles: MarketCandle[], info: Record<string, unknown> = {}) {
    const latest = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const closePrice = latest?.close ?? null;
    const infoPrice = asNumber(info.currentPrice) ?? asNumber(info.regularMarketPrice);
    const currentPrice = closePrice ?? infoPrice;
    const previousClose = previous?.close ?? asNumber(info.previousClose);
    const dayChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;
    const dayChangePercent = percentChange(currentPrice, previousClose);
    const highs = candles.map((point) => point.high ?? point.close).filter((value) => value > 0);
    const lows = candles.map((point) => point.low ?? point.close).filter((value) => value > 0);
    const latestVolume = latest?.volume ?? null;
    const recentVolumes = candles.slice(-20).map((point) => point.volume).filter((value): value is number => value !== null && value > 0);
    const averageVolume20 = recentVolumes.length ? recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length : null;
    const rsi = latestValue(candles, 'rsi');
    const macd = latestValue(candles, 'macd');
    const macdSignal = latestValue(candles, 'macdSignal');
    const ema20 = latestValue(candles, 'ema20');
    const ema50 = latestValue(candles, 'ema50');
    const ema200 = latestValue(candles, 'ema200');
    const latestVolatility = latestValue(candles, 'volatility');
    const return20 = candles.length > 20 ? percentChange(currentPrice, candles[candles.length - 21].close) : null;
    const return60 = candles.length > 60 ? percentChange(currentPrice, candles[candles.length - 61].close) : null;
    const return120 = candles.length > 120 ? percentChange(currentPrice, candles[candles.length - 121].close) : null;

    const shortScore = [currentPrice !== null && ema20 !== null && currentPrice >= ema20, macd !== null && macdSignal !== null && macd >= macdSignal, return20 !== null && return20 >= 0]
        .filter((value) => value !== null)
        .reduce((score, positive) => score + (positive ? 34 : 0), 0);
    const midScore = [currentPrice !== null && ema50 !== null && currentPrice >= ema50, return60 !== null && return60 >= 0, rsi !== null && rsi >= 40 && rsi <= 60]
        .filter((value) => value !== null)
        .reduce((score, positive) => score + (positive ? 34 : 0), 0);
    const longScore = [currentPrice !== null && ema200 !== null && currentPrice >= ema200, return120 !== null && return120 >= 0]
        .filter((value) => value !== null)
        .reduce((score, positive) => score + (positive ? 50 : 0), 0);

    const beta = asNumber(info.beta);
    const debtToEquity = asNumber(info.debtToEquity);
    const profitMargin = asNumber(info.profitMargins);
    const cashFlow = asNumber(info.freeCashflow) ?? asNumber(info.operatingCashflow);
    const marketCap = asNumber(info.marketCap);
    const volatilityRiskScore = latestVolatility === null ? null : latestVolatility >= 0.4 ? 85 : latestVolatility >= 0.22 ? 55 : 20;
    const marketRiskScore = beta === null ? null : beta >= 1.4 ? 80 : beta >= 0.9 ? 50 : 20;
    const financialSignals = [
        debtToEquity === null ? null : debtToEquity > 150,
        profitMargin === null ? null : profitMargin < 0.05,
        cashFlow === null ? null : cashFlow < 0,
    ].filter((value): value is boolean => value !== null);
    const financialRiskScore = financialSignals.length
        ? Math.round((financialSignals.filter(Boolean).length / financialSignals.length) * 100)
        : null;
    const marketCapRisk = marketCap === null ? null : marketCap < 2_000_000_000 ? 75 : marketCap < 10_000_000_000 ? 45 : 20;
    const overallInputs = [volatilityRiskScore, marketRiskScore, financialRiskScore, marketCapRisk].filter((value): value is number => value !== null);
    const overallRiskScore = overallInputs.length ? Math.round(overallInputs.reduce((sum, value) => sum + value, 0) / overallInputs.length) : null;

    return {
        metrics: {
            currentPrice,
            previousClose,
            dayChange,
            dayChangePercent,
            fiftyTwoWeekHigh: asNumber(info.fiftyTwoWeekHigh) ?? (highs.length ? Math.max(...highs) : null),
            fiftyTwoWeekLow: asNumber(info.fiftyTwoWeekLow) ?? (lows.length ? Math.min(...lows) : null),
            marketCap,
            currency: info.currency || 'USD',
        },
        technical: {
            rsi: { value: rsi, label: classifyRsi(rsi) },
            macd: { value: macd, signal: macdSignal, histogram: latestValue(candles, 'macdHistogram'), label: classifyMacd(macd, macdSignal) },
            ema20: { value: ema20, label: emaStatus(currentPrice, ema20) },
            ema50: { value: ema50, label: emaStatus(currentPrice, ema50) },
            ema200: { value: ema200, label: emaStatus(currentPrice, ema200) },
        },
        trends: {
            shortTerm: { label: trendFromScore(shortScore), score: Math.min(shortScore, 100), returnPercent: return20 },
            midTerm: { label: trendFromScore(midScore), score: Math.min(midScore, 100), returnPercent: return60 },
            longTerm: { label: trendFromScore(longScore), score: Math.min(longScore, 100), returnPercent: return120 },
        },
        supportResistance: findSupportResistance(candles, currentPrice),
        volume: {
            latestVolume,
            averageVolume20,
            ratioToAverage: latestVolume !== null && averageVolume20 ? latestVolume / averageVolume20 : null,
            label: latestVolume !== null && averageVolume20
                ? latestVolume >= averageVolume20 * 1.2 ? 'Above Average'
                    : latestVolume <= averageVolume20 * 0.8 ? 'Below Average'
                        : 'Normal'
                : 'N/A',
        },
        fundamentals: {
            peRatio: asNumber(info.trailingPE) ?? asNumber(info.forwardPE),
            eps: asNumber(info.trailingEps) ?? asNumber(info.forwardEps),
            revenueGrowth: asNumber(info.revenueGrowth),
            profitMargin,
            debtToEquity,
            cashFlow,
            beta,
            analystSentiment: info.recommendationKey || null,
            analystRating: asNumber(info.recommendationMean),
        },
        risk: {
            financial: riskFromScore(financialRiskScore),
            market: riskFromScore(marketRiskScore),
            volatility: riskFromScore(volatilityRiskScore),
            overall: riskFromScore(overallRiskScore),
            score: overallRiskScore,
        },
    };
}

/**
 * GET /api/market?symbol=AAPL - Fetch live market data from yfinance via Python agent
 * No database - uses Yahoo Finance directly
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const disabled = await requireModuleEnabled('multi_agent_system');
        if (disabled) return disabled;

        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol')?.trim().toUpperCase();

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: 'Symbol is required' },
                { status: 400 }
            );
        }

        const cached = marketCache.get(symbol);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({
                success: true,
                data: cached.data,
                cached: true,
            });
        }

        const result = await runAgentSync('market', symbol, 30);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to fetch market data' },
                { status: 500 }
            );
        }

        const data = result.data as { data?: Array<Record<string, unknown>>; symbol?: string; info?: Record<string, unknown> };
        const records = data?.data || [];
        const info = data?.info || {};

        const candles = records
            .map((record) => {
                const close = asNumber(valueFrom(record, ['Close', 'close']));
                const date = String(valueFrom(record, ['Date', 'date', 'Datetime']) ?? '');
                if (!date || close === null || close <= 0) return null;
                return {
                    date: date.split(' ')[0],
                    open: asNumber(valueFrom(record, ['Open', 'open'])),
                    high: asNumber(valueFrom(record, ['High', 'high'])),
                    low: asNumber(valueFrom(record, ['Low', 'low'])),
                    close,
                    volume: asNumber(valueFrom(record, ['Volume', 'volume'])),
                    rsi: asNumber(valueFrom(record, ['RSI', 'rsi'])),
                    macd: asNumber(valueFrom(record, ['MACD', 'macd'])),
                    macdSignal: asNumber(valueFrom(record, ['MACD_Signal', 'macdSignal'])),
                    macdHistogram: asNumber(valueFrom(record, ['MACD_Histogram', 'macdHistogram'])),
                    ema20: asNumber(valueFrom(record, ['EMA_20', 'ema20', 'SMA_20'])),
                    ema50: asNumber(valueFrom(record, ['EMA_50', 'ema50', 'SMA_50'])),
                    ema200: asNumber(valueFrom(record, ['EMA_200', 'ema200', 'SMA_200'])),
                    volatility: asNumber(valueFrom(record, ['Volatility', 'volatility'])),
                } satisfies MarketCandle;
            })
            .filter((candle): candle is MarketCandle => candle !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const prices = candles.map((candle) => ({
            date: candle.date,
            price: candle.close,
        }));

        const responseData: MarketResponseData = {
            symbol: data?.symbol || symbol,
            prices,
            candles,
            info,
            analysis: buildAnalysis(candles, info),
        };

        marketCache.set(symbol, {
            data: responseData,
            expiresAt: Date.now() + MARKET_CACHE_TTL_MS,
        });

        return NextResponse.json({
            success: true,
            data: responseData,
            cached: false,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching market data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch market data', details: message },
            { status: 500 }
        );
    }
}
