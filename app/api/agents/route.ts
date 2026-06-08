import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';
import { requireModuleEnabled } from '@/lib/moduleGuard';

// GET /api/agents - List agent logs
export async function GET(request: NextRequest) {
    try {
        const user = await requireUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const disabled = await requireModuleEnabled('multi_agent_system');
        if (disabled) return disabled;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const groupByRun = searchParams.get('groupByRun') === 'true';

        const where = status ? { userId: user.id, status } : { userId: user.id };

        const agentLogs = await prisma.agentLog.findMany({
            where,
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
            take: limit,
        });

        if (groupByRun) {
            const groups = Object.values(agentLogs.reduce<Record<string, {
                runId: string;
                mode: string;
                symbol: string;
                startedAt: Date;
                logs: typeof agentLogs;
            }>>((acc, log) => {
                const input = (log.input || {}) as Record<string, unknown>;
                const runId = typeof input.runId === 'string' ? input.runId : log.id;
                const stageOrder = typeof input.stageOrder === 'number' ? input.stageOrder : 999;
                const mode = typeof input.mode === 'string' ? input.mode : 'single';
                const symbol = typeof input.symbol === 'string' ? input.symbol : '';

                if (!acc[runId]) {
                    acc[runId] = {
                        runId,
                        mode,
                        symbol,
                        startedAt: log.startedAt,
                        logs: [],
                    };
                }

                acc[runId].logs.push({
                    ...log,
                    input: { ...input, runId, stageOrder, mode, symbol },
                });

                if (log.startedAt < acc[runId].startedAt) {
                    acc[runId].startedAt = log.startedAt;
                }

                return acc;
            }, {}))
                .map((group) => ({
                    ...group,
                    logs: group.logs.sort((a, b) => {
                        const aInput = (a.input || {}) as Record<string, unknown>;
                        const bInput = (b.input || {}) as Record<string, unknown>;
                        const aOrder = typeof aInput.stageOrder === 'number' ? aInput.stageOrder : 999;
                        const bOrder = typeof bInput.stageOrder === 'number' ? bInput.stageOrder : 999;
                        return aOrder - bOrder;
                    }),
                }))
                .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

            return NextResponse.json({
                success: true,
                data: groups,
            });
        }

        return NextResponse.json({
            success: true,
            data: agentLogs,
        });
    } catch (error) {
        console.error('Error fetching agent logs:', error);
        // Return empty when DB unreachable (e.g. Supabase down)
        const msg = `${error instanceof Error ? error.message : ''} ${JSON.stringify(error)}`;
        if (/Can't reach database|ECONNREFUSED|database server/i.test(msg)) {
            return NextResponse.json({ success: true, data: [] });
        }
        return NextResponse.json(
            { success: false, error: 'Failed to fetch agent logs' },
            { status: 500 }
        );
    }
}
