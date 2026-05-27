import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { runAgentSync } from '@/lib/agentRunner';

/**
 * GET /api/news-live?symbol=AAPL - Fetch live news from News API via Python agent
 * No database - uses News API directly
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');

        if (!symbol) {
            return NextResponse.json(
                { success: false, error: 'Symbol is required' },
                { status: 400 }
            );
        }

        const result = await runAgentSync('news', symbol.toUpperCase(), 30);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to fetch news' },
                { status: 500 }
            );
        }

        const data = result.data as { articles?: Array<{ title: string; description?: string; source: string; url: string; publishedAt: string }> };
        const articles = data?.articles || [];

        return NextResponse.json({
            success: true,
            data: articles.map((a) => ({
                id: `news-${a.url}`,
                title: a.title,
                description: a.description,
                source: a.source,
                url: a.url,
                publishedAt: a.publishedAt,
            })),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching news:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch news', details: message },
            { status: 500 }
        );
    }
}
