import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

interface PurchaseStockRow {
    stockName: string;
}

export async function GET(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const [predictions, agentLogs, predictedStocks] = await Promise.all([
            prisma.prediction.findMany({
                where: { userId: user.id },
                select: {
                    id: true,
                    stockId: true,
                    predictionDate: true,
                    predictedPrice: true,
                    lowerBound: true,
                    upperBound: true,
                    confidence: true,
                    trend: true,
                    modelVersion: true,
                    llmSummary: true,
                    createdAt: true,
                    stock: {
                        select: {
                            symbol: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.agentLog.findMany({
                where: { userId: user.id },
                select: {
                    id: true,
                    agentName: true,
                    status: true,
                    input: true,
                    output: true,
                    error: true,
                    duration: true,
                    startedAt: true,
                    completedAt: true,
                },
                orderBy: { startedAt: 'desc' },
                take: 50,
            }),
            prisma.prediction.findMany({
                where: { userId: user.id },
                distinct: ['stockId'],
                select: {
                    stock: {
                        select: {
                            id: true,
                            symbol: true,
                            name: true,
                            sector: true,
                            industry: true,
                            description: true,
                            isActive: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const stockMap = new Map(predictedStocks.map(({ stock }) => [stock.symbol, stock]));

        try {
            const purchases = await prisma.$queryRaw<PurchaseStockRow[]>`
                SELECT DISTINCT stock_name AS "stockName"
                FROM stock_purchases
                WHERE user_id = ${user.id}
            `;

            for (const purchase of purchases) {
                const symbol = String(purchase.stockName || '').trim().toUpperCase();
                if (symbol && !stockMap.has(symbol)) {
                    stockMap.set(symbol, {
                        id: `purchase-${symbol}`,
                        symbol,
                        name: symbol,
                        sector: null,
                        industry: null,
                        description: 'Saved stock purchase',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
        } catch {
            // The migration may not have been applied yet in older local databases.
        }

        return NextResponse.json({
            success: true,
            data: {
                predictions,
                agentLogs,
                stocks: Array.from(stockMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol)),
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard summary' }, { status: 500 });
    }
}
