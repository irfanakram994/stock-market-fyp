'use client';

import { useEffect, useState } from 'react';
import { superAdminFetch } from '@/lib/superAdminApi';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Analytics</h1>
          <p className="text-gray-400">Full-access analytics for Super Admin</p>
        </div>
        <select
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            load(e.target.value);
          }}
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {!payload ? (
        <div className="text-gray-400">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Avg Confidence</p>
              <p className="text-2xl text-white font-semibold">{((payload.confidenceStats._avg.confidence || 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Max Confidence</p>
              <p className="text-2xl text-white font-semibold">{((payload.confidenceStats._max.confidence || 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Backtests</p>
              <p className="text-2xl text-white font-semibold">{payload.backtestSummary._count.id}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Avg Return</p>
              <p className="text-2xl text-white font-semibold">{(payload.backtestSummary._avg.totalReturn || 0).toFixed(2)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Trend Distribution</h2>
              <div className="space-y-2">
                {payload.trendDistribution.map((row) => (
                  <div key={row.trend || 'unknown'} className="p-3 rounded bg-slate-900/60 border border-slate-700/50 flex items-center justify-between">
                    <span className="text-gray-200 uppercase">{row.trend || 'unknown'}</span>
                    <span className="text-fuchsia-300 font-semibold">{row._count.trend}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Analytics Snapshots</h2>
              <div className="space-y-2 max-h-80 overflow-auto">
                {payload.analyticsSnapshots.map((row) => (
                  <div key={row.id} className="p-3 rounded bg-slate-900/60 border border-slate-700/50">
                    <p className="text-sm text-white">{new Date(row.date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">Users: {row.totalUsers} • Predictions: {row.totalPredictions} • Avg Conf: {((row.avgConfidence || 0) * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
