"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

type MarketTrendPoint = {
  label: string;
  close: number;
};

export function MiniSparkline({ data, trend, gradientId }: { data: MarketTrendPoint[], trend: "up" | "down" | "flat", gradientId: string }) {
  if (!data || data.length < 2) return null;
  const color = trend === "down" ? "#ef4444" : "#10b981";
  const strokeColor = trend === "down" ? "#f87171" : "#34d399";
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MainTrendChart({ data }: { data: MarketTrendPoint[] }) {
  if (!data || data.length < 2) return null;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="niftyTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2b5cff" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#2b5cff" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(219,234,254,0.18)" />
        <XAxis dataKey="label" stroke="#c4d7fb" fontSize={12} />
        <YAxis stroke="#c4d7fb" fontSize={12} tickFormatter={(value) => `${Number(value).toFixed(0)}`} />
        <Tooltip
          formatter={(value) => [
            `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
            "NIFTY 50",
          ]}
          contentStyle={{ backgroundColor: "#1f3f95", borderColor: "#6f8fcd", borderRadius: "10px" }}
          labelStyle={{ color: "#dce8ff" }}
          itemStyle={{ color: "#f2f7ff" }}
        />
        <Area type="monotone" dataKey="close" stroke="#2b5cff" fill="url(#niftyTrendGradient)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
