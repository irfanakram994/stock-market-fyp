'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Loader, RefreshCw } from 'lucide-react';
import { fetchAgentLogs, AgentLog } from '@/lib/api';

export default function AgentLogsPage() {
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        const res = await fetchAgentLogs(undefined, 50);
        if (res.success && res.data) setLogs(res.data);
        setLoading(false);
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'running':
                return <Activity className="w-5 h-5 text-primary animate-pulse" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
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

    // Compute stats from real data
    const totalExecs = logs.length;
    const completedCount = logs.filter(l => l.status === 'completed').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    const runningCount = logs.filter(l => l.status === 'running').length;
    const successRate = totalExecs > 0 ? ((completedCount / (completedCount + failedCount)) * 100).toFixed(1) : '—';
    const avgDuration = logs.filter(l => l.duration).length > 0
        ? (logs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) / logs.filter(l => l.duration).length / 1000).toFixed(1)
        : '—';

    // Compute per-agent performance
    const agentPerf = logs.reduce<Record<string, { executions: number; completed: number; failed: number; totalDuration: number; durationCount: number }>>((acc, log) => {
        if (!acc[log.agentName]) {
            acc[log.agentName] = { executions: 0, completed: 0, failed: 0, totalDuration: 0, durationCount: 0 };
        }
        acc[log.agentName].executions++;
        if (log.status === 'completed') acc[log.agentName].completed++;
        if (log.status === 'failed') acc[log.agentName].failed++;
        if (log.duration) {
            acc[log.agentName].totalDuration += log.duration;
            acc[log.agentName].durationCount++;
        }
        return acc;
    }, {});

    const agentPerfList = Object.entries(agentPerf).map(([name, stats]) => ({
        name,
        executions: stats.executions,
        success: stats.executions > 0 ? ((stats.completed / (stats.completed + stats.failed)) * 100).toFixed(1) : '—',
        avgTime: stats.durationCount > 0 ? (stats.totalDuration / stats.durationCount / 1000).toFixed(1) : '—',
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Agent Logs</h1>
                    <p className="text-gray-400">Monitor AI agent execution and performance</p>
                </div>
                <button onClick={loadLogs} disabled={loading} className="btn-secondary flex items-center">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                    <div className="text-sm text-gray-400 mb-1">Total Executions</div>
                    <div className="text-2xl font-bold">{totalExecs.toLocaleString()}</div>
                </div>
                <div className="card">
                    <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                    <div className="text-2xl font-bold text-green-400">{successRate}%</div>
                </div>
                <div className="card">
                    <div className="text-sm text-gray-400 mb-1">Avg Duration</div>
                    <div className="text-2xl font-bold">{avgDuration}s</div>
                </div>
                <div className="card">
                    <div className="text-sm text-gray-400 mb-1">Active Now</div>
                    <div className="text-2xl font-bold text-primary">{runningCount}</div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Recent Executions</h2>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No agent logs found. Run an agent to see results.</p>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="p-4 bg-dark-200 rounded-lg hover:bg-dark-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 flex-1">
                                        {getStatusIcon(log.status)}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="font-bold">{log.agentName}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 space-y-1">
                                                <div>Started: {new Date(log.startedAt).toLocaleString()}</div>
                                                {log.duration && (
                                                    <div>Duration: {(log.duration / 1000).toFixed(2)}s</div>
                                                )}
                                                {log.error && (
                                                    <div className="text-red-400">Error: {log.error}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn-secondary text-sm px-3 py-1">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Agent Performance */}
            {agentPerfList.length > 0 && (
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">Agent Performance</h2>
                    <div className="space-y-4">
                        {agentPerfList.map((agent, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-dark-200 rounded-lg">
                                <div className="font-semibold">{agent.name}</div>
                                <div className="flex items-center space-x-6 text-sm">
                                    <div>
                                        <span className="text-gray-400">Executions: </span>
                                        <span className="font-semibold">{agent.executions}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Success: </span>
                                        <span className="font-semibold text-green-400">{agent.success}%</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Avg Time: </span>
                                        <span className="font-semibold">{agent.avgTime}s</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
