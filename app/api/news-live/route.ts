import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

interface CachedNews {
    expiresAt: number;
    data: Array<{
        id: string;
        title: string;
        description?: string;
        source: string;
        url: string;
        publishedAt: string;
        imageUrl?: string;
    }>;
}

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;
const newsCache = new Map<string, CachedNews>();

/**
 * GET /api/news-live?symbol=AAPL - Fetch live news from News API via Python agent
 * No database - uses News API directly
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

        const cached = newsCache.get(symbol);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({ success: true, data: cached.data, cached: true });
        }

        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NEWS_API_KEY is not configured',
                    ...(process.env.NODE_ENV !== 'production' ? { details: 'Missing NEWS_API_KEY in environment.' } : {}),
                },
                { status: 500 }
            );
        }

        const now = new Date();
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const url = new URL('https://newsapi.org/v2/everything');
        url.searchParams.set('q', `${symbol} stock OR ${symbol} shares`);
        url.searchParams.set('from', from.toISOString().slice(0, 10));
        url.searchParams.set('to', now.toISOString().slice(0, 10));
        url.searchParams.set('language', 'en');
        url.searchParams.set('sortBy', 'publishedAt');
        url.searchParams.set('pageSize', process.env.NEWS_FETCH_LIMIT || '30');
        url.searchParams.set('apiKey', apiKey);

        const response = await fetch(url, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || payload?.status !== 'ok') {
            const message = payload?.message || `News API returned ${response.status}`;
            return NextResponse.json(
                {
                    success: false,
                    error: message,
                    ...(process.env.NODE_ENV !== 'production'
                        ? { details: { status: response.status, code: payload?.code } }
                        : {}),
                },
                { status: response.ok ? 500 : response.status }
            );
        }

        const articles = Array.isArray(payload?.articles) ? payload.articles : [];
        const data = articles.map((a: any) => ({
            id: `news-${a.url || `${symbol}-${a.title}`}`,
            title: a.title || 'Untitled article',
            description: a.description || '',
            source: a.source?.name || 'Unknown',
            url: a.url || '',
            imageUrl: a.urlToImage || '',
            publishedAt: a.publishedAt || now.toISOString(),
        })).filter((item: { url: string }) => item.url);

        newsCache.set(symbol, {
            data,
            expiresAt: Date.now() + NEWS_CACHE_TTL_MS,
        });

        return NextResponse.json({
            success: true,
            data,
            cached: false,
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
