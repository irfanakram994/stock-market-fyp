import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/userAuth';

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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');

        const where = status ? { userId: user.id, status } : { userId: user.id };

        const agentLogs = await prisma.agentLog.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            take: limit,
        });

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
