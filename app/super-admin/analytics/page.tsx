'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';
import { AdminPageHeader, LoadingState, Panel } from '@/components/Admin/AdminUI';
import { BarChart3 } from 'lucide-react';

interface AnalyticsPayload {
  analyticsSnapshots: Array<{ id: string; date: string; totalUsers: number; totalPredictions: number; avgConfidence: number | null }>;
  trendDistribution: Array<{ trend: string | null; _count: { trend: number }; _avg: { confidence: number | null } }>;
  confidenceStats: { _avg: { confidence: number | null }; _max: { confidence: number | null }; _min: { confidence: number | null } };
  backtestSummary: { _count: { id: number }; _avg: { totalReturn: number | null; sharpeRatio: number | null; winRate: number | null } };
}

export default function SuperAdminAnalyticsPage() {
  const [days, setDays] = useState('30');
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);

  const load = async (nextDays = days) => {
    const res = await superAdminFetch(`/api/super-admin/analytics?days=${nextDays}`);
    const data = await res.json();
    if (data.success) setPayload(data.data);
  };

  useEffect(() => {
    load('30');
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <AdminPageHeader
          icon={BarChart3}
          tone="super"
          title="System Analytics"
          description="Full-access analytics for Super Admin."
        />
        <select
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            load(e.target.value);
          }}
          className="h-10 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none transition-colors focus:border-fuchsia-300/60"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {!payload ? (
        <LoadingState label="Loading analytics..." tone="super" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Panel className="p-4">
              <p className="text-gray-400 text-sm">Avg Confidence</p>
              <p className="text-2xl text-white font-semibold">{((payload.confidenceStats._avg.confidence || 0) * 100).toFixed(1)}%</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-gray-400 text-sm">Max Confidence</p>
              <p className="text-2xl text-white font-semibold">{((payload.confidenceStats._max.confidence || 0) * 100).toFixed(1)}%</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-gray-400 text-sm">Backtests</p>
              <p className="text-2xl text-white font-semibold">{payload.backtestSummary._count.id}</p>
            </Panel>
            <Panel className="p-4">
              <p className="text-gray-400 text-sm">Avg Return</p>
              <p className="text-2xl text-white font-semibold">{(payload.backtestSummary._avg.totalReturn || 0).toFixed(2)}%</p>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel className="p-5">
              <h2 className="text-white font-semibold mb-3">Trend Distribution</h2>
              <div className="space-y-2">
                {payload.trendDistribution.map((row) => (
                  <div key={row.trend || 'unknown'} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-fuchsia-300/20 transition-colors">
                    <span className="text-gray-200 uppercase">{row.trend || 'unknown'}</span>
                    <span className="text-fuchsia-300 font-semibold">{row._count.trend}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-white font-semibold mb-3">Analytics Snapshots</h2>
              <div className="space-y-2 max-h-80 overflow-auto">
                {payload.analyticsSnapshots.map((row) => (
                  <div key={row.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-fuchsia-300/20 transition-colors">
                    <p className="text-sm text-white">{new Date(row.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">Users: {row.totalUsers} • Predictions: {row.totalPredictions} • Avg Conf: {((row.avgConfidence || 0) * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
