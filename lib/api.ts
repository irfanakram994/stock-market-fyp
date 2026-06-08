// Shared API client for TradeFlux dashboard
import { supabase } from '@/lib/supabaseClient';

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

async function fetchApi<T>(
    url: string,
    options?: RequestInit,
    config: { includeAuth?: boolean } = {}
): Promise<ApiResponse<T>> {
    try {
        const headers = new Headers(options?.headers || {});
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        if (config.includeAuth) {
            const { data } = await supabase.auth.getSession();
            const accessToken = data.session?.access_token;
            if (accessToken) {
                headers.set('Authorization', `Bearer ${accessToken}`);
            }
        }

        const res = await fetch(url, {
            headers,
            ...options,
        });
        return await res.json();
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

// --- Stocks ---

export interface Stock {
    id: string;
    symbol: string;
    name: string;
    sector?: string;
    industry?: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
}

export function fetchStocks() {
    return fetchApi<Stock[]>('/api/stocks', undefined, { includeAuth: true });
}

export interface StockPurchase {
    id: string;
    stockName: string;
    purchaseAmount: number;
    purchaseDate: string;
    createdAt: string;
}

export function createStockPurchase(stockName: string, purchaseAmount: number, purchaseDate: string) {
    return fetchApi<StockPurchase>('/api/stocks/purchases', {
        method: 'POST',
        body: JSON.stringify({ stockName, purchaseAmount, purchaseDate }),
    }, { includeAuth: true });
}

export function fetchStockPurchases() {
    return fetchApi<StockPurchase[]>('/api/stocks/purchases', undefined, { includeAuth: true });
}

export function deleteStockPurchase(id: string) {
    return fetchApi<{ id: string }>(`/api/stocks/purchases?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
    }, { includeAuth: true });
}

export interface DashboardSummary {
    predictions: Prediction[];
    stocks: Stock[];
    agentLogs: AgentLog[];
}

export function fetchDashboardSummary() {
    return fetchApi<DashboardSummary>('/api/dashboard/summary', undefined, { includeAuth: true });
}

export interface UserNotification {
    id: string;
    userId: string;
    userEmail?: string | null;
    sourceType: string;
    sourceName?: string | null;
    sourceKey?: string | null;
    type: string;
    title: string;
    message: string;
    category: string;
    priority: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    readAt?: string | null;
    createdAt: string;
}

export function fetchUserNotifications(limit = 10) {
    const params = new URLSearchParams({ limit: String(limit) });
    return fetchApi<UserNotification[]>(`/api/notifications?${params}`, undefined, { includeAuth: true });
}

export function markUserNotificationsRead(notificationIds?: string[], markAllRead = false) {
    return fetchApi<{ updatedCount: number }>(
        '/api/notifications',
        {
            method: 'PATCH',
            body: JSON.stringify({ notificationIds, markAllRead }),
        },
        { includeAuth: true }
    );
}

// --- Predictions ---

export interface Prediction {
    id: string;
    stockId: string;
    predictionDate: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    trend?: string;
    modelVersion: string;
    llmSummary?: string;
    createdAt: string;
    stock?: { symbol: string; name: string };
}

export interface RecentPrediction extends Prediction {
    symbol: string;
    name: string;
    sector?: string | null;
    forecast?: ForecastPoint[];
    historical?: HistoricalForecastPoint[];
    components?: ForecastComponents;
    modelMetrics?: ForecastModelMetrics;
}

export function fetchPredictions(symbol?: string, limit?: number) {
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    if (limit) params.set('limit', String(limit));
    return fetchApi<Prediction[]>(`/api/predictions?${params}`, undefined, { includeAuth: true });
}

export function fetchRecentPredictions(limit?: number) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    return fetchApi<RecentPrediction[]>(`/api/predictions/recent?${params}`, undefined, { includeAuth: true });
}

export interface RunPredictionData {
    symbol: string;
    currentPrice?: number;
    predictions?: ForecastPoint[];
    forecast?: ForecastPoint[];
    historical?: HistoricalForecastPoint[];
    components?: ForecastComponents;
    modelMetrics?: ForecastModelMetrics;
    trend?: string;
    insight?: string;
    sentimentScore?: number;
    avgPredictedPrice?: number | null;
}

export interface ForecastPoint {
        ds?: string;
        yhat?: number;
        yhat_lower?: number;
        yhat_upper?: number;
        date: string;
        predictedPrice: number;
        lowerBound: number;
        upperBound: number;
        confidence: number;
        trend?: number | null;
        weekly?: number | null;
        yearly?: number | null;
        additive_terms?: number | null;
        multiplicative_terms?: number | null;
        sentiment?: number | null;
}

export interface HistoricalForecastPoint {
    ds: string;
    y: number | null;
}

export interface ForecastComponents {
    trend?: Array<{ ds: string; trend: number | null }>;
    weekly?: Array<{ ds?: string; day?: string; weekly: number | null }>;
    yearly?: Array<{ ds: string; yearly: number | null }>;
}

export interface ForecastModelMetrics {
    modelType?: 'prophet' | 'fallback';
    confidenceInterval?: number;
    forecastDays?: number;
    avgConfidence?: number;
    seasonalityMode?: string;
    changepointPriorScale?: number;
    hasSentimentRegressor?: boolean;
    mae?: number;
    rmse?: number;
}

export function runPrediction(symbol: string, forecastDays = 30) {
    return fetchApi<RunPredictionData>(
        '/api/predictions',
        { method: 'POST', body: JSON.stringify({ symbol, forecastDays }) },
        { includeAuth: true }
    );
}

// --- News ---

export interface NewsItem {
    id: string;
    stockId: string;
    title: string;
    description?: string;
    source: string;
    url: string;
    publishedAt: string;
    stock?: { symbol: string; name: string };
    sentiment?: {
        score: number;
        label: string;
        compound: number;
    };
}

export function fetchNews(symbol?: string, limit?: number) {
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    if (limit) params.set('limit', String(limit));
    return fetchApi<NewsItem[]>(`/api/news?${params}`, undefined, { includeAuth: true });
}

/** Fetch live news from News API via Python agent (no DB) */
export function fetchNewsLive(symbol: string) {
    return fetchApi<NewsItem[]>(`/api/news-live?symbol=${encodeURIComponent(symbol)}`);
}

/** Fetch live market data from yfinance via Python agent (no DB) */
export function fetchMarketData(symbol: string) {
    return fetchApi<{ symbol: string; prices: Array<{ date: string; price: number }>; info?: Record<string, unknown> }>(
        `/api/market?symbol=${encodeURIComponent(symbol)}`
    );
}

// --- Agent Logs ---

export interface AgentLog {
    id: string;
    agentName: string;
    status: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    duration?: number;
    startedAt: string;
    completedAt?: string;
}

export interface AgentLogRunGroup {
    runId: string;
    mode: string;
    symbol: string;
    startedAt: string;
    logs: AgentLog[];
}

export function fetchAgentLogs(status?: string, limit?: number) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit));
    return fetchApi<AgentLog[]>(`/api/agents?${params}`, undefined, { includeAuth: true });
}

export function fetchAgentLogGroups(limit?: number) {
    const params = new URLSearchParams({ groupByRun: 'true' });
    if (limit) params.set('limit', String(limit));
    return fetchApi<AgentLogRunGroup[]>(`/api/agents?${params}`, undefined, { includeAuth: true });
}

export function runAgent(agent: string, symbol: string, forecastDays = 30) {
    return fetchApi<RunPredictionData | Record<string, unknown>>(
        '/api/agents/run',
        { method: 'POST', body: JSON.stringify({ agent, symbol, forecastDays }) },
        { includeAuth: true }
    );
}

export function getAgentStatus(jobId: string) {
    return fetchApi<AgentLog>(`/api/agents/run?jobId=${jobId}`, undefined, { includeAuth: true });
}

// --- Backtesting ---

export interface BacktestResult {
    id: string;
    stockId: string;
    strategyName: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    totalTrades: number;
    profitableTrades: number;
    losingTrades: number;
    equityCurve: { date: string; value: number }[];
    trades: { date: string; type: string; price: number; shares: number; pnl: number }[];
    createdAt: string;
    stock?: { symbol: string; name: string };
}

export function fetchBacktests(symbol?: string) {
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    return fetchApi<BacktestResult[]>(`/api/backtesting?${params}`, undefined, { includeAuth: true });
}

export function runBacktest(symbol: string, startDate: string, endDate: string, initialCapital: number) {
    return fetchApi<BacktestResult>('/api/backtesting', {
        method: 'POST',
        body: JSON.stringify({ symbol, startDate, endDate, initialCapital }),
    }, { includeAuth: true });
}
