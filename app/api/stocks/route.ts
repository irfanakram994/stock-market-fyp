import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stocks - List all stocks
export async function GET(request: NextRequest) {
    try {
        const stocks = await prisma.stock.findMany({
            where: { isActive: true },
            orderBy: { symbol: 'asc' },
        });

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
        const body = await request.json();
        const { symbol, name, sector, industry, description } = body;

        if (!symbol || !name) {
            return NextResponse.json(
                { success: false, error: 'Symbol and name are required' },
                { status: 400 }
            );
        }

        const stock = await prisma.stock.create({
            data: {
                symbol: symbol.toUpperCase(),
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
