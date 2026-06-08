import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

// GET /api/news - Fetch news with sentiment
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

        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const limit = parseInt(searchParams.get('limit') || '20');

        let where: Record<string, unknown> = symbol ? { stock: { symbol } } : {};

        if (!symbol) {
            const userStocks = await prisma.prediction.findMany({
                where: { userId: user.id },
                distinct: ['stockId'],
                include: {
                    stock: {
                        select: {
                            symbol: true,
                        },
                    },
                },
            });
            const symbols = userStocks.map((row) => row.stock.symbol);

            if (symbols.length === 0) {
                return NextResponse.json({ success: true, data: [] });
            }

            where = { stock: { symbol: { in: symbols } } };
        }

        const news = await prisma.news.findMany({
            where,
            include: {
                stock: {
                    select: {
                        symbol: true,
                        name: true,
                    },
                },
                sentiment: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: news,
        });
    } catch (error) {
        console.error('Error fetching news:', error);
        // Return empty when DB unreachable
        const msg = `${error instanceof Error ? error.message : ''} ${JSON.stringify(error)}`;
        if (/Can't reach database|ECONNREFUSED|database server/i.test(msg)) {
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json(
            { success: false, error: 'Failed to fetch news' },
            { status: 500 }
        );
    }
}
