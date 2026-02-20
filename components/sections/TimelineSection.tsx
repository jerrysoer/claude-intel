"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { CalendarDays } from "lucide-react";
import SectionWrapper from "@/components/shared/SectionWrapper";
import type { IntelPayload, DailySummary } from "@/data/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function useChartColors() {
  const [colors, setColors] = useState({
    inputBlue: "#60A5FA",
    outputTeal: "#2DD4BF",
    cachePurple: "#A78BFA",
    costRose: "#FB7185",
    border: "#292524",
    textTertiary: "#78716C",
  });

  useEffect(() => {
    const root = document.documentElement;
    const get = (v: string) =>
      getComputedStyle(root).getPropertyValue(v).trim();
    setColors({
      inputBlue: get("--input-blue") || colors.inputBlue,
      outputTeal: get("--output-teal") || colors.outputTeal,
      cachePurple: get("--cache-purple") || colors.cachePurple,
      costRose: get("--cost-rose") || colors.costRose,
      border: get("--border") || colors.border,
      textTertiary: get("--text-tertiary") || colors.textTertiary,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return colors;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 font-mono text-xs text-text-tertiary">
        {label ? formatDate(label) : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}</span>
          <span className="ml-auto font-mono font-semibold text-text-primary">
            {entry.name === "Cost"
              ? `$${entry.value.toFixed(2)}`
              : formatTokens(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TimelineSection({ data }: { data: IntelPayload }) {
  const colors = useChartColors();
  const { daily } = data;

  // Find peak day by total tokens
  const peakDay = daily.reduce<DailySummary | null>(
    (best, d) => (!best || d.totalTokens > best.totalTokens ? d : best),
    null
  );

  const chartData = daily.map((d) => ({
    date: d.date,
    label: formatDate(d.date),
    Input: d.inputTokens,
    Output: d.outputTokens,
    Cache: d.cacheReadTokens,
    Cost: d.estimatedCost,
  }));

  return (
    <SectionWrapper id="timeline" layout="full-bleed" tinted>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={18} className="text-text-tertiary" />
          <h2 className="font-serif text-2xl font-bold text-text-primary sm:text-3xl">
            Daily Activity
          </h2>
        </div>
        <p className="font-sans text-sm text-text-secondary">
          Token usage by type with cost overlay.
          {peakDay && (
            <> Peak day: <span className="font-mono font-semibold text-text-primary">{formatDate(peakDay.date)}</span> — {formatTokens(peakDay.totalTokens)} tokens, ${peakDay.estimatedCost.toFixed(2)}.</>
          )}
        </p>
      </div>

      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={colors.border}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="tokens"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatTokens(v)}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />

            {/* Peak day reference line */}
            {peakDay && (
              <ReferenceLine
                yAxisId="tokens"
                x={formatDate(peakDay.date)}
                stroke={colors.costRose}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            )}

            {/* Stacked bars */}
            <Bar
              yAxisId="tokens"
              dataKey="Input"
              stackId="tokens"
              fill={colors.inputBlue}
              radius={[0, 0, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              yAxisId="tokens"
              dataKey="Output"
              stackId="tokens"
              fill={colors.outputTeal}
              radius={[0, 0, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              yAxisId="tokens"
              dataKey="Cache"
              stackId="tokens"
              fill={colors.cachePurple}
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />

            {/* Cost line overlay */}
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="Cost"
              stroke={colors.costRose}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: colors.costRose, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionWrapper>
  );
}
