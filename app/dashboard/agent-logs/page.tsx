'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Loader, RefreshCw } from 'lucide-react';
import { fetchAgentLogGroups, AgentLog, AgentLogRunGroup } from '@/lib/api';
import { useSnackbar } from '@/components/SnackbarProvider';

export default function AgentLogsPage() {
    const { showSnackbar } = useSnackbar();
    const [runGroups, setRunGroups] = useState<AgentLogRunGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        const res = await fetchAgentLogGroups(80);
        if (res.success && res.data) {
            setRunGroups(res.data);
        } else {
            const message = res.error || 'Failed to load your agent logs.';
            setLoadError(message);
            showSnackbar({ variant: 'error', message });
        }
        setLoading(false);
    }, [showSnackbar]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-400" />;
            case 'running':
                return <Activity className="h-5 w-5 animate-pulse text-primary" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/20 text-green-400';
            case 'failed':
                return 'bg-red-500/20 text-red-400';
            case 'running':
                return 'bg-primary/20 text-primary';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getLogMeta = (log: AgentLog) => {
        const input = (log.input || {}) as Record<string, unknown>;
        return {
            runId: typeof input.runId === 'string' ? input.runId : log.id,
            stageOrder: typeof input.stageOrder === 'number' ? input.stageOrder : 999,
            mode: typeof input.mode === 'string' ? input.mode : 'single',
            symbol: typeof input.symbol === 'string' ? input.symbol : '',
        };
    };

    const logs = runGroups.flatMap((group) => group.logs);
    const totalExecs = logs.length;
    const completedCount = logs.filter((log) => log.status === 'completed').length;
    const failedCount = logs.filter((log) => log.status === 'failed').length;
    const runningCount = logs.filter((log) => log.status === 'running').length;
    const finishedCount = completedCount + failedCount;
    const successRate = finishedCount > 0 ? ((completedCount / finishedCount) * 100).toFixed(1) : '-';
    const durationLogs = logs.filter((log) => log.duration);
    const avgDuration = durationLogs.length > 0
        ? (durationLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / durationLogs.length / 1000).toFixed(1)
        : '-';

    const agentPerf = logs.reduce<Record<string, { executions: number; completed: number; failed: number; totalDuration: number; durationCount: number }>>((acc, log) => {
        if (!acc[log.agentName]) {
            acc[log.agentName] = { executions: 0, completed: 0, failed: 0, totalDuration: 0, durationCount: 0 };
        }
        acc[log.agentName].executions += 1;
        if (log.status === 'completed') acc[log.agentName].completed += 1;
        if (log.status === 'failed') acc[log.agentName].failed += 1;
        if (log.duration) {
            acc[log.agentName].totalDuration += log.duration;
            acc[log.agentName].durationCount += 1;
        }
        return acc;
    }, {});

    const agentPerfList = Object.entries(agentPerf).map(([name, stats]) => ({
        name,
        executions: stats.executions,
        success: stats.completed + stats.failed > 0 ? ((stats.completed / (stats.completed + stats.failed)) * 100).toFixed(1) : '-',
        avgTime: stats.durationCount > 0 ? (stats.totalDuration / stats.durationCount / 1000).toFixed(1) : '-',
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="mb-2 text-3xl font-bold">Agent Logs</h1>
                    <p className="text-gray-400">Monitor AI agent execution and performance</p>
                </div>
                <button onClick={loadLogs} disabled={loading} className="btn-secondary flex items-center">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <div className="card">
                    <div className="mb-1 text-sm text-gray-400">Total Executions</div>
                    <div className="text-2xl font-bold">{totalExecs.toLocaleString()}</div>
                </div>
                <div className="card">
                    <div className="mb-1 text-sm text-gray-400">Success Rate</div>
                    <div className="text-2xl font-bold text-green-400">{successRate}%</div>
                </div>
                <div className="card">
                    <div className="mb-1 text-sm text-gray-400">Avg Duration</div>
                    <div className="text-2xl font-bold">{avgDuration}s</div>
                </div>
                <div className="card">
                    <div className="mb-1 text-sm text-gray-400">Active Now</div>
                    <div className="text-2xl font-bold text-primary">{runningCount}</div>
                </div>
            </div>

            <div className="card">
                <h2 className="mb-4 text-xl font-bold">Recent Executions</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="font-medium text-gray-300">No agent logs yet.</p>
                        <p className="mt-2 text-sm text-gray-500">Run a prediction or stock analysis preview to see your personal agent activity here.</p>
                        {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {runGroups.map((group) => (
                            <div key={group.runId} className="rounded-lg bg-dark-200 p-4">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold">
                                                {group.mode === 'full_prediction' ? 'Full Prediction Run' : group.mode === 'preview' ? 'Preview Run' : 'Agent Run'}
                                            </h3>
                                            {group.symbol && <span className="rounded bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">{group.symbol}</span>}
                                        </div>
                                        <p className="mt-1 text-sm text-gray-400">Started: {new Date(group.startedAt).toLocaleString()}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">Run {group.runId.slice(0, 8)}</span>
                                </div>
                                <div className="space-y-2">
                                    {group.logs
                                        .slice()
                                        .sort((a, b) => getLogMeta(a).stageOrder - getLogMeta(b).stageOrder)
                                        .map((log) => (
                                            <div key={log.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-3">
                                                <div className="flex items-start space-x-3">
                                                    {getStatusIcon(log.status)}
                                                    <div>
                                                        <div className="flex items-center space-x-3">
                                                            <span className="font-semibold">{log.agentName}</span>
                                                            <span className={`rounded px-2 py-1 text-xs font-semibold ${getStatusColor(log.status)}`}>{log.status}</span>
                                                        </div>
                                                        <div className="mt-1 text-sm text-gray-400">
                                                            {log.duration && <span>Duration: {(log.duration / 1000).toFixed(2)}s</span>}
                                                            {log.error && <div className="text-red-400">Error: {log.error}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    Step {getLogMeta(log).stageOrder === 999 ? 'single' : getLogMeta(log).stageOrder}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {agentPerfList.length > 0 && (
                <div className="card">
                    <h2 className="mb-4 text-xl font-bold">Agent Performance</h2>
                    <div className="space-y-4">
                        {agentPerfList.map((agent) => (
                            <div key={agent.name} className="flex items-center justify-between rounded-lg bg-dark-200 p-3">
                                <div className="font-semibold">{agent.name}</div>
                                <div className="flex items-center space-x-6 text-sm">
                                    <div><span className="text-gray-400">Executions: </span><span className="font-semibold">{agent.executions}</span></div>
                                    <div><span className="text-gray-400">Success: </span><span className="font-semibold text-green-400">{agent.success}%</span></div>
                                    <div><span className="text-gray-400">Avg Time: </span><span className="font-semibold">{agent.avgTime}s</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
