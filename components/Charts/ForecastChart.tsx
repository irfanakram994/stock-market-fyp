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
  LabelList,
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

const renderLegend = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 14,
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
  const lastPredictedIndex = data.length - 1;

  const chartData = data.map((point) => ({
    ...point,
    confidence:
      point.lower != null && point.upper != null
        ? [point.lower, point.upper]
        : null,
  }));

  const renderPredictedLabel = ({ x, y, value, index }: any) => {
    if (value == null || index !== lastPredictedIndex) {
      return null;
    }

    const formattedValue = Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

    return (
      <text x={x} y={y - 10} fill="#0ea5e9" fontSize={12} textAnchor="middle">
        ${formattedValue}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 40, bottom: 75 }}
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
            dy: 16,
            fill: "#cbd5e1",
            fontSize: 12,
          }}
        />
        <YAxis
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
          domain={["dataMin - 5", "dataMax + 5"]}
          label={{
            value: "Price (USD)",
            angle: -90,
            position: "insideLeft",
            dx: -20,
            dy: 0,
            fill: "#cbd5e1",
            fontSize: 12,
          }}
        />
        <Tooltip
          formatter={(value: any, name: string) => {
            if (typeof value === "number") {
              return [
                `$${value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}`,
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
        >
          <LabelList dataKey="predicted" content={renderPredictedLabel} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
