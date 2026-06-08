import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireModuleEnabled } from '@/lib/moduleGuard';

interface StockPurchaseRow {
    id: string;
    stockName: string;
    purchaseAmount: number;
    purchaseDate: string;
    createdAt: string;
    userId: string;
    userEmail: string;
}

async function resolveCurrentUser(request: NextRequest) {
    const authorization = request.headers.get('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    const { data, error } = await supabaseServer.auth.getUser(token);
    if (error || !data.user) {
        return null;
    }

    return data.user;
}

// GET /api/stocks/purchases - List saved stock purchases
export async function GET(request: NextRequest) {
    try {
        const user = await resolveCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('user_panel');
        if (disabled) return disabled;

        const rows = await prisma.$queryRaw<StockPurchaseRow[]>`
            SELECT
                id::text AS "id",
                stock_name AS "stockName",
                purchase_amount::float8 AS "purchaseAmount",
                purchase_date::text AS "purchaseDate",
                created_at::text AS "createdAt",
                user_id AS "userId",
                user_email AS "userEmail"
            FROM stock_purchases
            WHERE user_id = ${user.id}
            ORDER BY created_at DESC
        `;

        return NextResponse.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching stock purchases:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch stock purchases',
                ...(process.env.NODE_ENV !== 'production'
                    ? { details: error instanceof Error ? error.message : String(error) }
                    : {}),
            },
            { status: 500 }
        );
    }
}

// POST /api/stocks/purchases - Save stock purchase records in Supabase Postgres
export async function POST(request: NextRequest) {
    try {
        const user = await resolveCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('user_panel');
        if (disabled) return disabled;

        const body = await request.json();
        const stockName = String(body?.stockName ?? '').trim();
        const purchaseAmount = Number(body?.purchaseAmount);
        const purchaseDate = String(body?.purchaseDate ?? '').trim();

        if (!stockName) {
            return NextResponse.json(
                { success: false, error: 'Stock name is required' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Purchase amount must be greater than 0' },
                { status: 400 }
            );
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
            return NextResponse.json(
                { success: false, error: 'Purchase date must be in YYYY-MM-DD format' },
                { status: 400 }
            );
        }

        const rows = await prisma.$queryRaw<StockPurchaseRow[]>`
            INSERT INTO stock_purchases (user_id, user_email, stock_name, purchase_amount, purchase_date)
            VALUES (${user.id}, ${user.email || ''}, ${stockName}, ${purchaseAmount}, ${purchaseDate}::date)
            RETURNING
                id::text AS "id",
                stock_name AS "stockName",
                purchase_amount::float8 AS "purchaseAmount",
                purchase_date::text AS "purchaseDate",
                created_at::text AS "createdAt",
                user_id AS "userId",
                user_email AS "userEmail"
        `;

        return NextResponse.json({
            success: true,
            data: rows[0],
            message: 'Stock purchase saved successfully',
        });
    } catch (error) {
        console.error('Error saving stock purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to save stock purchase',
                ...(process.env.NODE_ENV !== 'production'
                    ? { details: error instanceof Error ? error.message : String(error) }
                    : {}),
            },
            { status: 500 }
        );
    }
}

// DELETE /api/stocks/purchases?id=123 - Delete a saved stock purchase
export async function DELETE(request: NextRequest) {
    try {
        const user = await resolveCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('user_panel');
        if (disabled) return disabled;

        const id = request.nextUrl.searchParams.get('id');
        if (!id || !/^\d+$/.test(id)) {
            return NextResponse.json(
                { success: false, error: 'A valid id is required' },
                { status: 400 }
            );
        }

        const rows = await prisma.$queryRaw<Array<{ id: string }>>`
            DELETE FROM stock_purchases
            WHERE id = ${id}::bigint AND user_id = ${user.id}
            RETURNING id::text AS "id"
        `;

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Stock purchase not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: rows[0],
            message: 'Stock purchase deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting stock purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete stock purchase',
                ...(process.env.NODE_ENV !== 'production'
                    ? { details: error instanceof Error ? error.message : String(error) }
                    : {}),
            },
            { status: 500 }
        );
    }
}
