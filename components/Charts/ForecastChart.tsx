"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const defaultData = [
  // Historical data
  {
    date: "2026-01-15",
    actual: 171.3,
    predicted: null,
    lower: null,
    upper: null,
  },
  {
    date: "2026-01-22",
    actual: 169.8,
    predicted: null,
    lower: null,
    upper: null,
  },
  {
    date: "2026-01-29",
    actual: 174.2,
    predicted: null,
    lower: null,
    upper: null,
  },
  {
    date: "2026-02-05",
    actual: 178.5,
    predicted: null,
    lower: null,
    upper: null,
  },
  // Forecast data
  {
    date: "2026-02-12",
    actual: null,
    predicted: 180.2,
    lower: 176.5,
    upper: 183.9,
  },
  {
    date: "2026-02-19",
    actual: null,
    predicted: 182.1,
    lower: 177.8,
    upper: 186.4,
  },
  {
    date: "2026-02-26",
    actual: null,
    predicted: 183.8,
    lower: 178.5,
    upper: 189.1,
  },
  {
    date: "2026-03-05",
    actual: null,
    predicted: 185.2,
    lower: 179.2,
    upper: 191.2,
  },
];

interface ForecastChartProps {
  data?: {
    date: string;
    actual: number | null;
    predicted: number | null;
    lower: number | null;
    upper: number | null;
  }[];
}

const formatUsd = (value: number, decimals = 2) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

const getNiceStep = (range: number) => {
  const roughStep = range / 6;
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const normalized = roughStep / power;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
};

const renderLegend = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 10,
      color: "#cbd5e1",
      fontSize: 13,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          background: "#0ea5e9",
          borderRadius: 4,
          display: "inline-block",
        }}
      />
      Predicted
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          background: "#94a3b8",
          borderRadius: 4,
          display: "inline-block",
        }}
      />
      Actual
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          background: "rgba(14, 165, 233, 0.25)",
          borderRadius: 4,
          display: "inline-block",
          border: "1px solid #0ea5e9",
        }}
      />
      Confidence range
    </div>
  </div>
);

export default function ForecastChart({
  data = defaultData,
}: ForecastChartProps) {
  const isValidPrice = (value: number | null): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1000000;

  const rawValues = data.flatMap((point) =>
    [point.actual, point.predicted, point.lower, point.upper].filter(isValidPrice) as number[],
  );
  const sortedValues = rawValues.slice().sort((a, b) => a - b);
  const median = sortedValues.length ? sortedValues[Math.floor(sortedValues.length / 2)] : 0;
  const values = rawValues.filter((value) => !median || (value >= median * 0.35 && value <= median * 2.85));
  const predictedValues = data.map((point) => point.predicted).filter(isValidPrice) as number[];
  const anchor = predictedValues[predictedValues.length - 1] || median || values[0] || 100;
  const minValue = values.length ? Math.min(...values) : anchor * 0.75;
  const maxValue = values.length ? Math.max(...values) : anchor * 1.25;
  const padding = Math.max((maxValue - minValue) * 0.28, anchor * 0.18, 2);
  const roughMin = Math.max(0, minValue - padding);
  const roughMax = maxValue + padding;
  const niceStep = getNiceStep(Math.max(roughMax - roughMin, 4));
  const yMin = Math.max(0, Math.floor(roughMin / niceStep) * niceStep);
  let yMax = Math.ceil(roughMax / niceStep) * niceStep;
  if (yMax <= yMin) yMax = yMin + niceStep * 6;
  const tickCount = Math.min(8, Math.max(4, Math.floor((yMax - yMin) / niceStep) + 1));
  const ticks = Array.from({ length: tickCount }, (_, index) => yMin + index * niceStep).filter((value) => value <= yMax);

  const chartData = data.map((point) => {
    const actual = isValidPrice(point.actual) ? point.actual : null;
    const predicted =
      isValidPrice(point.predicted) && (!median || (point.predicted >= median * 0.2 && point.predicted <= median * 5))
        ? point.predicted
        : null;
    const lower =
      isValidPrice(point.lower) && (!median || (point.lower >= median * 0.2 && point.lower <= median * 5))
        ? point.lower
        : null;
    const upper =
      isValidPrice(point.upper) && (!median || (point.upper >= median * 0.2 && point.upper <= median * 5))
        ? point.upper
        : null;

    return {
      ...point,
      actual,
      predicted,
      lower,
      upper,
      confidence: lower != null && upper != null ? [lower, upper] : null,
    };
  });
  const lastPrediction = [...chartData].reverse().find((point) => point.predicted != null)?.predicted;

  return (
    <div className="w-full">
      {lastPrediction != null && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-3 py-2">
          <span className="text-sm text-slate-400">Latest predicted price</span>
          <span className="text-sm font-semibold text-cyan-200">{formatUsd(Number(lastPrediction))}</span>
        </div>
      )}
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart
        data={chartData}
        margin={{ top: 18, right: 22, left: 22, bottom: 72 }}
      >
        <defs>
          <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          minTickGap={20}
          label={{
            value: "Date",
            position: "insideBottom",
            dy: 18,
            fill: "#cbd5e1",
            fontSize: 12,
          }}
        />
        <YAxis
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickFormatter={(value) => formatUsd(Number(value), 0)}
          domain={[yMin, yMax]}
          ticks={ticks}
          width={86}
          label={{
            value: "Price (USD)",
            angle: -90,
            position: "insideLeft",
            dx: -12,
            dy: 0,
            fill: "#cbd5e1",
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: any, name: string) => {
            if (typeof value === "number") {
              return [
                formatUsd(value),
                name,
              ];
            }
            return [value, name];
          }}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f8fafc",
          }}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          height={70}
          content={renderLegend}
        />

        {/* Confidence interval */}
        <Area
          type="monotone"
          dataKey="confidence"
          stroke="none"
          fill="url(#colorConfidence)"
          fillOpacity={0.18}
          legendType="none"
          tooltipType="none"
          connectNulls
        />

        <Line
          type="monotone"
          dataKey="upper"
          stroke="#60a5fa"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          name="Upper Bound"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="lower"
          stroke="#60a5fa"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          name="Lower Bound"
          dot={false}
          connectNulls
        />

        {/* Actual price */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#94a3b8"
          strokeWidth={3}
          name="Actual"
          dot={{ fill: "#94a3b8", r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
        />

        {/* Predicted price */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#0ea5e9"
          strokeWidth={4}
          strokeDasharray="5 5"
          name="Predicted"
          dot={{ fill: "#0ea5e9", r: 5 }}
          activeDot={{ r: 7 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  );
}
