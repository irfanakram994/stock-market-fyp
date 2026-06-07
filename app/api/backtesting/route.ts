import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';

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

        const body = await request.json();
        const { symbol, startDate, endDate, initialCapital = 100000 } = body;

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: 'Symbol is required' },
                { status: 400 }
            );
        }

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

        // Create a placeholder backtest result
        // In production this would trigger the Python backtesting agent
        const result = await prisma.backtestResult.create({
            data: {
                stockId: stock.id,
                userId: user.id,
                strategyName: 'AI-Prediction-Strategy',
                startDate: new Date(startDate || '2025-01-01'),
                endDate: new Date(endDate || '2025-12-31'),
                initialCapital,
                finalCapital: initialCapital,
                totalReturn: 0,
                totalTrades: 0,
                profitableTrades: 0,
                losingTrades: 0,
                equityCurve: [],
                trades: [],
            },
            include: {
                stock: {
                    select: { symbol: true, name: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Backtest created',
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
