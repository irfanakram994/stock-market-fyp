import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';
import { runAgentSync } from '@/lib/agentRunner';
import { requireModuleEnabled } from '@/lib/moduleGuard';

export const dynamic = 'force-dynamic';

// GET /api/backtesting - List backtest results
export async function GET(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('forecasting_module');
        if (disabled) return disabled;

        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const limit = parseInt(searchParams.get('limit') || '20');

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
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Error fetching backtest results:', error);
        // Return empty when DB unreachable
        const msg = `${error instanceof Error ? error.message : ''} ${JSON.stringify(error)}`;
        if (/Can't reach database|ECONNREFUSED|database server/i.test(msg)) {
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json(
            { success: false, error: 'Failed to fetch backtest results' },
            { status: 500 }
        );
    }
}

// POST /api/backtesting - Run a new backtest
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('forecasting_module');
        if (disabled) return disabled;

        const body = await request.json();
        const { symbol, startDate, endDate, initialCapital = 100000 } = body;

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: 'Symbol is required' },
                { status: 400 }
            );
        }

        const start = new Date(startDate || '2025-01-01');
        const end = new Date(endDate || new Date().toISOString().slice(0, 10));
        const capital = Number(initialCapital);

        if (!Number.isFinite(capital) || capital <= 0) {
            return NextResponse.json(
                { success: false, error: 'Initial capital must be greater than 0' },
                { status: 400 }
            );
        }

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
            return NextResponse.json(
                { success: false, error: 'Choose a valid start date before the end date' },
                { status: 400 }
            );
        }

        const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const lookbackDays = Math.min(Math.max(requestedDays + 45, 90), 3650);
        const marketResult = await runAgentSync('market', symbol.toUpperCase(), lookbackDays);
        if (!marketResult.success) {
            return NextResponse.json(
                { success: false, error: marketResult.error || 'Failed to fetch historical market data' },
                { status: 500 }
            );
        }

        const marketData = marketResult.data as { data?: Array<Record<string, unknown>> };
        const prices = (marketData?.data || [])
            .map((row) => ({
                date: new Date(String(row.Date ?? row.date ?? row.Datetime ?? '')),
                price: Number(row.Close ?? row.close ?? row.AdjClose ?? row.price),
            }))
            .filter((point) => Number.isFinite(point.price) && point.price > 0 && !Number.isNaN(point.date.getTime()))
            .filter((point) => point.date >= start && point.date <= end)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (prices.length < 25) {
            return NextResponse.json(
                { success: false, error: `Not enough historical price data for ${symbol.toUpperCase()} in the selected date range. Try a wider date range.` },
                { status: 400 }
            );
        }

        const average = (items: typeof prices, index: number, window: number) => {
            const slice = items.slice(Math.max(0, index - window + 1), index + 1);
            return slice.reduce((sum, item) => sum + item.price, 0) / slice.length;
        };

        let cash = capital;
        let shares = 0;
        let entryPrice = 0;
        const trades: Array<{ date: string; type: string; price: number; shares: number; pnl: number }> = [];
        const equityCurve: Array<{ date: string; value: number }> = [];
        const dailyReturns: number[] = [];
        let peak = capital;
        let maxDrawdown = 0;

        prices.forEach((point, index) => {
            const shortMa = average(prices, index, 5);
            const longMa = average(prices, index, 20);
            const prevShortMa = index > 0 ? average(prices, index - 1, 5) : shortMa;
            const prevLongMa = index > 0 ? average(prices, index - 1, 20) : longMa;
            const buySignal = index >= 20 && shares === 0 && prevShortMa <= prevLongMa && shortMa > longMa;
            const sellSignal = shares > 0 && prevShortMa >= prevLongMa && shortMa < longMa;

            if (buySignal) {
                shares = Math.floor(cash / point.price);
                if (shares > 0) {
                    cash -= shares * point.price;
                    entryPrice = point.price;
                    trades.push({
                        date: point.date.toISOString().slice(0, 10),
                        type: 'BUY',
                        price: Number(point.price.toFixed(2)),
                        shares,
                        pnl: 0,
                    });
                }
            } else if (sellSignal) {
                const pnl = (point.price - entryPrice) * shares;
                cash += shares * point.price;
                trades.push({
                    date: point.date.toISOString().slice(0, 10),
                    type: 'SELL',
                    price: Number(point.price.toFixed(2)),
                    shares,
                    pnl: Number(pnl.toFixed(2)),
                });
                shares = 0;
                entryPrice = 0;
            }

            const value = cash + shares * point.price;
            const previousValue = equityCurve[equityCurve.length - 1]?.value;
            if (previousValue) dailyReturns.push((value - previousValue) / previousValue);
            peak = Math.max(peak, value);
            maxDrawdown = Math.min(maxDrawdown, ((value - peak) / peak) * 100);
            equityCurve.push({
                date: point.date.toISOString().slice(0, 10),
                value: Number(value.toFixed(2)),
            });
        });

        if (shares > 0) {
            const last = prices[prices.length - 1];
            const pnl = (last.price - entryPrice) * shares;
            cash += shares * last.price;
            trades.push({
                date: last.date.toISOString().slice(0, 10),
                type: 'SELL',
                price: Number(last.price.toFixed(2)),
                shares,
                pnl: Number(pnl.toFixed(2)),
            });
            shares = 0;
        }

        const finalCapital = Number((cash + shares * prices[prices.length - 1].price).toFixed(2));
        const totalReturn = Number((((finalCapital - capital) / capital) * 100).toFixed(2));
        const completedSells = trades.filter((trade) => trade.type === 'SELL');
        const profitableTrades = completedSells.filter((trade) => trade.pnl > 0).length;
        const losingTrades = completedSells.filter((trade) => trade.pnl < 0).length;
        const winRate = completedSells.length > 0 ? Number(((profitableTrades / completedSells.length) * 100).toFixed(2)) : 0;
        const meanReturn = dailyReturns.reduce((sum, value) => sum + value, 0) / Math.max(dailyReturns.length, 1);
        const variance = dailyReturns.reduce((sum, value) => sum + Math.pow(value - meanReturn, 2), 0) / Math.max(dailyReturns.length, 1);
        const sharpeRatio = variance > 0 ? Number(((meanReturn / Math.sqrt(variance)) * Math.sqrt(252)).toFixed(2)) : 0;

        // Find or create stock
        let stock = await prisma.stock.findUnique({
            where: { symbol: symbol.toUpperCase() },
        });

        if (!stock) {
            stock = await prisma.stock.create({
                data: {
                    symbol: symbol.toUpperCase(),
                    name: symbol.toUpperCase(),
                },
            });
        }

        const result = await prisma.backtestResult.create({
            data: {
                stockId: stock.id,
                userId: user.id,
                strategyName: 'Moving-Average-Crossover',
                startDate: start,
                endDate: end,
                initialCapital: capital,
                finalCapital,
                totalReturn,
                sharpeRatio,
                maxDrawdown: Number(Math.abs(maxDrawdown).toFixed(2)),
                winRate,
                totalTrades: trades.length,
                profitableTrades,
                losingTrades,
                equityCurve,
                trades,
            },
            include: {
                stock: {
                    select: { symbol: true, name: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Backtest completed',
            data: result,
        });
    } catch (error) {
        console.error('Error creating backtest:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create backtest' },
            { status: 500 }
        );
    }
}
