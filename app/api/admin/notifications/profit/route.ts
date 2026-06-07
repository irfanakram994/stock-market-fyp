import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runAgentSync } from '@/lib/agentRunner';
import { createUserNotification } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

async function getCurrentPrice(symbol: string) {
  const result = await runAgentSync('market', symbol.toUpperCase(), 30);
  if (!result.success || !result.data) {
    return null;
  }

  const data = result.data as { info?: Record<string, unknown>; data?: Array<Record<string, unknown>> };
  const infoPrice = Number(data.info?.currentPrice ?? 0);
  if (Number.isFinite(infoPrice) && infoPrice > 0) {
    return infoPrice;
  }

  const latestClose = data.data
    ?.map((row) => Number(row.Close ?? row.close ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(-1)[0];

  return latestClose ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const purchases = await prisma.$queryRaw<Array<{
      id: string;
      userId: string | null;
      userEmail: string | null;
      stockName: string;
      purchaseAmount: number;
      purchaseDate: string;
    }>>`
      SELECT
        id::text AS "id",
        user_id AS "userId",
        user_email AS "userEmail",
        stock_name AS "stockName",
        purchase_amount::float8 AS "purchaseAmount",
        purchase_date::text AS "purchaseDate"
      FROM stock_purchases
      WHERE user_id IS NOT NULL
      ORDER BY created_at DESC
    `;

    const grouped = new Map<string, Array<(typeof purchases)[number]>>();
    for (const purchase of purchases) {
      if (!purchase.userId) continue;
      const key = purchase.stockName.trim().toUpperCase();
      const existing = grouped.get(key) || [];
      existing.push(purchase);
      grouped.set(key, existing);
    }

    const today = new Date().toISOString().slice(0, 10);
    const results: Array<{ stock: string; sent: number }> = [];

    for (const [symbol, rows] of Array.from(grouped.entries())) {
      const currentPrice = await getCurrentPrice(symbol);
      if (!currentPrice) continue;

      let sent = 0;
      for (const purchase of rows) {
        const profit = currentPrice - purchase.purchaseAmount;
        const profitPercent = purchase.purchaseAmount > 0 ? (profit / purchase.purchaseAmount) * 100 : 0;
        const sourceKey = `profit:${purchase.id}:${today}`;

        await createUserNotification({
          userId: purchase.userId!,
          userEmail: purchase.userEmail,
          sourceType: 'admin',
          sourceName: 'TradeFlux Admin',
          sourceKey,
          type: profit >= 0 ? 'success' : 'warning',
          title: `${symbol} profit update`,
          message: `${symbol} is now ${profit >= 0 ? 'up' : 'down'} $${Math.abs(profit).toFixed(2)} (${Math.abs(profitPercent).toFixed(2)}%) compared with your saved price of $${purchase.purchaseAmount.toFixed(2)}.`,
          category: 'performance',
          priority: Math.abs(profitPercent) > 10 ? 'high' : 'normal',
          metadata: {
            stock: symbol,
            purchaseId: purchase.id,
            purchasePrice: purchase.purchaseAmount,
            currentPrice,
            profit,
            profitPercent,
            snapshotDate: today,
          },
        });

        sent += 1;
      }

      results.push({ stock: symbol, sent });
    }

    return NextResponse.json({
      success: true,
      message: 'Daily profit notifications generated',
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate notifications' },
      { status: 500 }
    );
  }
}
