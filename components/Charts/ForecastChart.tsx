"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Loader } from "lucide-react";
import type {
  ForecastComponents,
  ForecastModelMetrics,
  ForecastPoint,
  HistoricalForecastPoint,
} from "@/lib/api";

type LegacyForecastPoint = {
  date: string;
  actual: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
};

interface ForecastChartProps {
  data?: LegacyForecastPoint[];
  forecast?: ForecastPoint[];
  historical?: HistoricalForecastPoint[];
  components?: ForecastComponents;
  modelMetrics?: ForecastModelMetrics;
  symbol?: string;
  forecastDays?: number;
  loading?: boolean;
  onHorizonChange?: (days: number) => void;
}

const HORIZONS = [7, 10, 30, 90];

const formatUsd = (value: number, decimals = 2) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const getDate = (point: ForecastPoint) => point.ds || point.date;
const getYhat = (point: ForecastPoint) => point.yhat ?? point.predictedPrice;
const getLower = (point: ForecastPoint) => point.yhat_lower ?? point.lowerBound;
const getUpper = (point: ForecastPoint) => point.yhat_upper ?? point.upperBound;

const CONFIDENCE_BANDS = {
  veryHigh: { key: "confidenceVeryHigh", label: "Very High", color: "#15803d" },
  high: { key: "confidenceHigh", label: "High", color: "#22c55e" },
  medium: { key: "confidenceMedium", label: "Medium", color: "#2563eb" },
  low: { key: "confidenceLow", label: "Low", color: "#ef4444" },
  veryLow: { key: "confidenceVeryLow", label: "Very Low", color: "#991b1b" },
} as const;

function getConfidenceBand(
  yhat?: number,
  lower?: number,
  upper?: number,
  explicitConfidence?: number,
  horizonProgress = 0,
) {
  if (
    typeof yhat === "number" &&
    typeof lower === "number" &&
    typeof upper === "number" &&
    Number.isFinite(yhat) &&
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    yhat !== 0
  ) {
    const intervalPct = Math.abs(upper - lower) / Math.abs(yhat);
    const adjustedIntervalPct = intervalPct + Math.max(0, Math.min(1, horizonProgress)) * 0.08;
    if (adjustedIntervalPct <= 0.04) return CONFIDENCE_BANDS.veryHigh;
    if (adjustedIntervalPct <= 0.08) return CONFIDENCE_BANDS.high;
    if (adjustedIntervalPct <= 0.15) return CONFIDENCE_BANDS.medium;
    if (adjustedIntervalPct <= 0.25) return CONFIDENCE_BANDS.low;
    return CONFIDENCE_BANDS.veryLow;
  }

  const normalizedConfidence =
    typeof explicitConfidence === "number"
      ? explicitConfidence > 1
        ? explicitConfidence / 100
        : explicitConfidence
      : undefined;

  if (typeof normalizedConfidence === "number" && Number.isFinite(normalizedConfidence)) {
    if (normalizedConfidence >= 0.95) return CONFIDENCE_BANDS.veryHigh;
    if (normalizedConfidence >= 0.85) return CONFIDENCE_BANDS.high;
    if (normalizedConfidence >= 0.7) return CONFIDENCE_BANDS.medium;
    if (normalizedConfidence >= 0.5) return CONFIDENCE_BANDS.low;
    return CONFIDENCE_BANDS.veryLow;
  }

  return CONFIDENCE_BANDS.medium;
}

function toLegacyPayload(data: LegacyForecastPoint[] = []) {
  const historical = data
    .filter((point) => point.actual != null)
    .map((point) => ({ ds: point.date, y: point.actual }));

  const forecast = data
    .filter((point) => point.predicted != null)
    .map((point) => ({
      date: point.date,
      ds: point.date,
      predictedPrice: point.predicted || 0,
      lowerBound: point.lower || point.predicted || 0,
      upperBound: point.upper || point.predicted || 0,
      confidence: 0.95,
      yhat: point.predicted || 0,
      yhat_lower: point.lower || point.predicted || 0,
      yhat_upper: point.upper || point.predicted || 0,
    }));

  return { historical, forecast };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const date = new Date(label);
  const dayLabel = row.forecastDay
    ? `Day ${row.forecastDay}: ${Number.isNaN(date.getTime()) ? label : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : Number.isNaN(date.getTime())
      ? label
      : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-sm shadow-xl">
      <div className="mb-2 font-semibold text-slate-100">{dayLabel}</div>
      {typeof row.actual === "number" && (
        <div className="text-slate-300">Historical close: {formatUsd(row.actual)}</div>
      )}
      {typeof row.yhat === "number" && (
        <>
          <div className="text-cyan-300">Predicted base price: {formatUsd(row.yhat)}</div>
          {typeof row.yhatLower === "number" && typeof row.yhatUpper === "number" && (
            <div className="text-slate-300">
              Range: {formatUsd(row.yhatLower)} to {formatUsd(row.yhatUpper)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ForecastChart({
  data,
  forecast,
  historical,
  components,
  modelMetrics,
  symbol,
  forecastDays = modelMetrics?.forecastDays || forecast?.length || 30,
  loading = false,
  onHorizonChange,
}: ForecastChartProps) {
  const [showHistorical, setShowHistorical] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [decompositionOpen, setDecompositionOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const legacyPayload = useMemo(() => toLegacyPayload(data), [data]);
  const historicalRows = historical?.length ? historical : legacyPayload.historical;
  const allForecastRows = forecast?.length ? forecast : legacyPayload.forecast;
  const visibleForecastDays = Math.max(1, forecastDays || allForecastRows.length || 30);
  const forecastRows = allForecastRows.slice(0, visibleForecastDays);
  const metrics = modelMetrics || {
    modelType: forecastRows.length ? "fallback" : undefined,
    confidenceInterval: 95,
    forecastDays,
    avgConfidence: forecastRows.length
      ? forecastRows.reduce((sum, point) => sum + (point.confidence || 0), 0) / forecastRows.length
      : undefined,
  };

  const chartData = useMemo(() => {
    const rows: Array<Record<string, string | number | [number, number] | null>> = [];
    const historyWindow = Math.max(1, visibleForecastDays < 30 ? 30 : visibleForecastDays);
    const cleanHistory = historicalRows
      .filter((point) => point.ds && typeof point.y === "number")
      .slice(-historyWindow);

    cleanHistory.forEach((point) => {
      rows.push({
        date: point.ds,
        actual: point.y,
        yhat: null,
        yhatLower: null,
        yhatUpper: null,
        confidenceRange: null,
        confidenceVeryHigh: null,
        confidenceHigh: null,
        confidenceMedium: null,
        confidenceLow: null,
        confidenceVeryLow: null,
        forecastDay: null,
      });
    });

    const lastHistorical = cleanHistory[cleanHistory.length - 1];
    if (lastHistorical) {
      const existing = rows[rows.length - 1];
      if (existing) existing.yhat = lastHistorical.y;
    }

    forecastRows.forEach((point, index) => {
      const yhat = getYhat(point);
      const lower = getLower(point);
      const upper = getUpper(point);
      const confidenceRange: [number, number] | null =
        typeof lower === "number" && typeof upper === "number" ? [lower, upper] : null;
      const confidenceBand = getConfidenceBand(
        yhat,
        lower,
        upper,
        point.confidence,
        forecastRows.length > 1 ? index / (forecastRows.length - 1) : 0,
      );
      rows.push({
        date: getDate(point) || point.date,
        actual: null,
        yhat,
        yhatLower: lower,
        yhatUpper: upper,
        confidenceRange,
        confidenceVeryHigh:
          confidenceBand.key === CONFIDENCE_BANDS.veryHigh.key ? confidenceRange : null,
        confidenceHigh: confidenceBand.key === CONFIDENCE_BANDS.high.key ? confidenceRange : null,
        confidenceMedium:
          confidenceBand.key === CONFIDENCE_BANDS.medium.key ? confidenceRange : null,
        confidenceLow: confidenceBand.key === CONFIDENCE_BANDS.low.key ? confidenceRange : null,
        confidenceVeryLow:
          confidenceBand.key === CONFIDENCE_BANDS.veryLow.key ? confidenceRange : null,
        forecastDay: index + 1,
      });
    });

    return rows;
  }, [forecastRows, historicalRows, visibleForecastDays]);

  const yDomain = useMemo<[number, number]>(() => {
    const priceValues = chartData.flatMap((row) =>
      [row.actual, row.yhat, row.yhatLower, row.yhatUpper].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      ),
    );
    const min = priceValues.length ? Math.min(...priceValues) : 0;
    const max = priceValues.length ? Math.max(...priceValues) : 100;
    const buffer = Math.max((max - min) * 0.1, max * 0.025, 1);

    return [Math.max(0, min - buffer), max + buffer];
  }, [chartData]);

  const finalForecast = forecastRows[forecastRows.length - 1];
  const firstForecast = forecastRows[0];
  const firstForecastDate = firstForecast ? getDate(firstForecast) || firstForecast.date : undefined;
  const firstForecastPrice = firstForecast ? getYhat(firstForecast) : undefined;
  const targetPrice = finalForecast ? getYhat(finalForecast) : undefined;
  const maxUpper = Math.max(...forecastRows.map(getUpper).filter((value) => typeof value === "number") as number[]);
  const minLower = Math.min(...forecastRows.map(getLower).filter((value) => typeof value === "number") as number[]);
  const volatility =
    Number.isFinite(maxUpper) && Number.isFinite(minLower) && targetPrice
      ? ((maxUpper - minLower) / targetPrice) * 100
      : null;

  const trendData = components?.trend?.filter((point) => typeof point.trend === "number") || [];
  const weeklyData = components?.weekly?.filter((point) => typeof point.weekly === "number") || [];
  const yearlyData = components?.yearly?.filter((point) => typeof point.yearly === "number") || [];
  const hasComponents = trendData.length > 0 || weeklyData.length > 0 || yearlyData.length > 0;
  const forecastStartIndex = Math.max(
    0,
    chartData.findIndex((row) => row.forecastDay === 1),
  );
  const pointWidth = visibleForecastDays >= 90 ? 34 : visibleForecastDays >= 30 ? 42 : 62;
  const chartInnerWidth = Math.max(960, chartData.length * pointWidth);
  const hasHistoricalData = chartData.some((row) => typeof row.actual === "number");
  const yTicks = useMemo(() => {
    const [low, high] = yDomain;
    return Array.from({ length: 6 }, (_, index) => high - ((high - low) / 5) * index);
  }, [yDomain]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || forecastStartIndex <= 0) return;

    const forecastStartOffset = Math.max(0, forecastStartIndex * pointWidth - 120);
    container.scrollLeft = Math.min(forecastStartOffset, container.scrollWidth - container.clientWidth);
  }, [chartInnerWidth, forecastStartIndex, pointWidth, symbol, visibleForecastDays]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Prophet Forecast {symbol ? `- ${symbol}` : ""}
          </h3>
          <p className="text-sm text-slate-400">
            {metrics.modelType === "prophet"
              ? "Full Prophet forecast with uncertainty interval and component decomposition."
              : "Fallback-compatible forecast. Prophet component details appear when available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HORIZONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onHorizonChange?.(days)}
              disabled={!onHorizonChange || loading}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                forecastDays === days
                  ? "bg-primary text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-200 hover:border-primary/60"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-100/80">Today Prediction</p>
          <p className="mt-1 text-xl font-bold text-amber-200">
            {typeof firstForecastPrice === "number" ? formatUsd(firstForecastPrice) : "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Target Price</p>
          <p className="mt-1 text-xl font-bold text-cyan-300">
            {typeof targetPrice === "number" ? formatUsd(targetPrice) : "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Max Expected Volatility</p>
          <p className="mt-1 text-xl font-bold text-amber-300">
            {volatility != null ? `${volatility.toFixed(1)}%` : "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Model Confidence</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">
            {metrics.confidenceInterval || 95}% Interval
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Model Type</p>
          <p className="mt-1 text-xl font-bold capitalize text-slate-100">
            {metrics.modelType || "Limited"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showHistorical}
            onChange={(event) => setShowHistorical(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          Historical dots
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(event) => setShowConfidence(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
          />
          Confidence shading
        </label>
        <span className="text-xs text-slate-500">
          Showing {Math.min(visibleForecastDays < 30 ? 30 : visibleForecastDays, historicalRows.length)} historical days and{" "}
          {forecastRows.length} forecast days
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.values(CONFIDENCE_BANDS).map((band) => (
          <span
            key={band.key}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2 py-1 text-slate-300"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.color }} />
            {band.label}
          </span>
        ))}
      </div>

      <div className="relative min-h-[470px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-950/50">
            <Loader className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}
        {typeof firstForecastPrice === "number" && (
          <div className="pointer-events-none absolute right-4 top-3 z-[2] rounded-lg border border-amber-300/40 bg-slate-950/90 px-3 py-2 shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              Today Prediction
            </p>
            <p className="text-base font-bold text-white">{formatUsd(firstForecastPrice)}</p>
            {firstForecastDate && (
              <p className="text-xs text-slate-400">
                {new Date(firstForecastDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
        {!hasHistoricalData && (
          <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Historical closes are not available in this saved payload. Run a fresh prediction to load the left-side historical dots.
          </div>
        )}
        <div className="relative rounded-lg border border-slate-800 bg-slate-950/20">
          <div className="pointer-events-none absolute left-0 top-0 z-20 h-[460px] w-[88px] border-r border-slate-700/80 bg-slate-950/95">
            <div className="relative h-full">
              <span className="absolute left-3 top-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Price
              </span>
              {yTicks.map((tick) => {
                const [low, high] = yDomain;
                const ratio = high === low ? 0.5 : (high - tick) / (high - low);
                const top = 28 + ratio * (460 - 28 - 76);

                return (
                  <span
                    key={tick}
                    className="absolute right-3 -translate-y-1/2 text-xs font-medium text-slate-300"
                    style={{ top }}
                  >
                    {formatUsd(tick, 0)}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-[78px] left-[88px] right-0 z-10 border-t border-slate-600/80" />
          <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden pb-2">
          <div style={{ minWidth: "100%", width: `max(100%, ${chartInnerWidth}px)`, height: 460 }}>
            <ResponsiveContainer width="100%" height={460}>
              <ComposedChart data={chartData} margin={{ top: 28, right: 36, left: 8, bottom: 76 }}>
            <defs>
              {Object.values(CONFIDENCE_BANDS).map((band) => (
                <linearGradient key={band.key} id={`${band.key}Gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={band.color} stopOpacity={band.key === "confidenceVeryHigh" ? 0.48 : 0.38} />
                  <stop offset="95%" stopColor={band.color} stopOpacity={band.key === "confidenceVeryLow" ? 0.2 : 0.13} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              stroke="#64748b"
              interval={0}
              angle={-42}
              textAnchor="end"
              height={72}
              tickFormatter={(value) => {
                const date = new Date(value);
                return Number.isNaN(date.getTime())
                  ? String(value)
                  : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              }}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tick={false}
              tickFormatter={(value) => formatUsd(Number(value), 0)}
              width={82}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#38bdf8", strokeWidth: 1 }} />
            {firstForecastDate && (
              <ReferenceLine
                x={firstForecastDate}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: "Forecast starts",
                  position: "insideTop",
                  fill: "#fbbf24",
                  fontSize: 12,
                }}
              />
            )}
            {showConfidence &&
              Object.values(CONFIDENCE_BANDS).map((band) => (
                <Area
                  key={band.key}
                  type="monotone"
                  dataKey={band.key}
                  stroke={band.color}
                  strokeOpacity={0.72}
                  strokeWidth={1.5}
                  fill={`url(#${band.key}Gradient)`}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            {showHistorical && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Historical close path"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="4 5"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showHistorical && (
              <Scatter
                dataKey="actual"
                name="Historical close"
                fill="#e5e7eb"
                stroke="#020617"
                strokeWidth={1}
                line={false}
                shape="circle"
              />
            )}
            <Line
              type="monotone"
              dataKey="yhat"
              name="Forecast yhat"
              stroke="#22d3ee"
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, fill: "#22d3ee" }}
              connectNulls
            />
            {firstForecastDate && typeof firstForecastPrice === "number" && (
              <ReferenceDot
                x={firstForecastDate}
                y={firstForecastPrice}
                r={7}
                fill="#f59e0b"
                stroke="#fff7ed"
                strokeWidth={2}
                label={{
                  value: "Today",
                  position: "top",
                  fill: "#fbbf24",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          </div>
        </div>
        {chartInnerWidth > 960 && (
          <p className="mt-2 text-xs text-slate-500">
            Scroll horizontally to inspect each daily point with full spacing.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50">
        <button
          type="button"
          onClick={() => setDecompositionOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <p className="font-semibold text-white">Model Decomposition</p>
            <p className="text-sm text-slate-400">
              Trend and seasonality components from the forecast model.
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${decompositionOpen ? "rotate-180" : ""}`} />
        </button>
        {decompositionOpen && (
          <div className="grid gap-4 border-t border-slate-700 p-4 lg:grid-cols-3">
            {hasComponents ? (
              <>
                <MiniChart title="Overall Trend" data={trendData} dataKey="trend" xKey="ds" color="#22d3ee" />
                <MiniChart title="Weekly Seasonality" data={weeklyData} dataKey="weekly" xKey="day" color="#a78bfa" />
                <MiniChart title="Yearly / Period Seasonality" data={yearlyData} dataKey="yearly" xKey="ds" color="#34d399" />
              </>
            ) : (
              <p className="text-sm text-slate-400 lg:col-span-3">
                Component decomposition is unavailable for this run. This can happen when the fallback forecast is used.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniChart({
  title,
  data,
  dataKey,
  xKey,
  color,
}: {
  title: string;
  data: any[];
  dataKey: string;
  xKey: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-200">{title}</p>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={130}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey={xKey} tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#475569" minTickGap={14} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} stroke="#475569" width={46} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#f8fafc",
              }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[130px] items-center justify-center text-center text-sm text-slate-500">
          Not available
        </div>
      )}
    </div>
  );
}
