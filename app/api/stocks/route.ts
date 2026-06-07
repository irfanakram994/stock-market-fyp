import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

export const dynamic = 'force-dynamic';

interface PurchaseStockRow {
    stockName: string;
}

// GET /api/stocks - List stocks the current user has interacted with
export async function GET(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('user_panel');
        if (disabled) return disabled;

        const predictedStocks = await prisma.prediction.findMany({
            where: { userId: user.id },
            distinct: ['stockId'],
            include: {
                stock: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const stockMap = new Map(
            predictedStocks.map(({ stock }) => [
                stock.symbol,
                {
                    id: stock.id,
                    symbol: stock.symbol,
                    name: stock.name,
                    sector: stock.sector,
                    industry: stock.industry,
                    description: stock.description,
                    isActive: stock.isActive,
                    createdAt: stock.createdAt,
                    updatedAt: stock.updatedAt,
                },
            ])
        );

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
            // The purchases table is created lazily by /api/stocks/purchases.
        }

        const stocks = Array.from(stockMap.values()).sort((a, b) =>
            a.symbol.localeCompare(b.symbol)
        );

        return NextResponse.json({
            success: true,
            data: stocks,
        });
    } catch (error) {
        console.error('Error fetching stocks:', error);
        // Return empty when DB unreachable (e.g. Supabase down)
        const msg = `${error instanceof Error ? error.message : ''} ${JSON.stringify(error)}`;
        if (/Can't reach database|ECONNREFUSED|database server/i.test(msg)) {
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stocks' },
            { status: 500 }
        );
    }
}

// POST /api/stocks - Add new stock
export async function POST(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('user_panel');
        if (disabled) return disabled;

        const body = await request.json();
        const { symbol, name, sector, industry, description } = body;

        if (!symbol || !name) {
            return NextResponse.json(
                { success: false, error: 'Symbol and name are required' },
                { status: 400 }
            );
        }

        const symbolUpper = symbol.toUpperCase();
        const stock = await prisma.stock.upsert({
            where: { symbol: symbolUpper },
            update: {
                name,
                sector,
                industry,
                description,
                isActive: true,
            },
            create: {
                symbol: symbolUpper,
                name,
                sector,
                industry,
                description,
            },
        });

        return NextResponse.json({
            success: true,
            data: stock,
        });
    } catch (error) {
        console.error('Error creating stock:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create stock' },
            { status: 500 }
        );
    }
}
