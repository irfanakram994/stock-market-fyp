import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { runAgentSync } from '@/lib/agentRunner';

interface MarketCacheEntry {
    expiresAt: number;
    data: {
        symbol: string;
        prices: Array<{ date: string; price: number }>;
        info?: Record<string, unknown>;
    };
}

const MARKET_CACHE_TTL_MS = 5 * 60 * 1000;
const marketCache = new Map<string, MarketCacheEntry>();

/**
 * GET /api/market?symbol=AAPL - Fetch live market data from yfinance via Python agent
 * No database - uses Yahoo Finance directly
 */
export async function GET(request: NextRequest) {
    try {
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

        const prices = records
            .filter((r) => r.Close != null || r.close != null)
            .map((r) => ({
                date: String(r.Date ?? r.date ?? r.Datetime ?? ''),
                price: Number(r.Close ?? r.close ?? 0),
            }))
            .filter((p) => p.date && p.price > 0);

        const responseData = {
            symbol: data?.symbol || symbol,
            prices,
            info: data?.info,
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
