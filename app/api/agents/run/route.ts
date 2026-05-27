import { NextRequest, NextResponse } from 'next/server';
import { runAgentSync, runPredictionAgent } from '@/lib/agentRunner';
import { supabaseServer } from '@/lib/supabaseClient';

async function requireUser(request: NextRequest) {
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

/** POST /api/agents/run - Execute Python agents (Prophet, Groq, News) - NO DB */
export async function POST(request: NextRequest) {
    try {
        const isAuthorized = await requireUser(request);
        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { agent, symbol, forecastDays = 30 } = body;

        if (!agent || !symbol) {
            return NextResponse.json(
                { success: false, error: 'Agent and symbol are required' },
                { status: 400 }
            );
        }

        const result = agent === 'prediction'
            ? await runPredictionAgent(symbol.toString().toUpperCase(), forecastDays)
            : await runAgentSync(agent, symbol.toString().toUpperCase(), forecastDays);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Agent failed' },
                { status: 500 }
            );
        }

        const data = agent === 'prediction'
            ? {
                symbol: (result as any).symbol,
                currentPrice: (result as any).currentPrice,
                predictions: (result as any).predictions,
                trend: (result as any).trend,
                insight: (result as any).insight,
                sentimentScore: (result as any).sentimentScore,
            }
            : (result as any).data;

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error running agent:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to run agent' },
            { status: 500 }
        );
    }
}
