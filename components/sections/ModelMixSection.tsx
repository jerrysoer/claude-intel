"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Layers } from "lucide-react";
import SectionWrapper from "@/components/shared/SectionWrapper";
import type { IntelPayload, ModelTokens } from "@/data/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const MODEL_COLOR_MAP: Record<string, string> = {
  opus: "--opus-coral",
  sonnet: "--sonnet-blue",
  haiku: "--haiku-green",
};

function getModelColorVar(model: string): string {
  const lower = model.toLowerCase();
  for (const [key, cssVar] of Object.entries(MODEL_COLOR_MAP)) {
    if (lower.includes(key)) return cssVar;
  }
  return "--text-tertiary";
}

function useModelColors(models: ModelTokens[]) {
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = document.documentElement;
    const map: Record<string, string> = {};
    for (const m of models) {
      const cssVar = getModelColorVar(m.model);
      map[m.model] =
        getComputedStyle(root).getPropertyValue(cssVar).trim() || "#78716C";
    }
    setColorMap(map);
  }, [models]);

  return colorMap;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { fill: string; pct: number; cost: number };
  }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-text-primary">
        {entry.name}
      </p>
      <p className="font-mono text-xs text-text-secondary">
        {formatTokens(entry.value)} tokens ({entry.payload.pct.toFixed(1)}%)
      </p>
      <p className="font-mono text-xs text-text-secondary">
        ${entry.payload.cost.toFixed(2)}
      </p>
    </div>
  );
}

export default function ModelMixSection({ data }: { data: IntelPayload }) {
  const { byModel, totals } = data;
  const colorMap = useModelColors(byModel);

  // Sort models by tokens descending
  const sorted = [...byModel].sort((a, b) => b.totalTokens - a.totalTokens);

  const pieData = sorted.map((m) => ({
    name: m.displayName,
    value: m.totalTokens,
    cost: m.estimatedCost,
    pct: (m.totalTokens / totals.totalTokens) * 100,
    fill: colorMap[m.model] || "#78716C",
  }));

  // Find Opus for the callout
  const opus = sorted.find((m) => m.model.toLowerCase().includes("opus"));
  const opusBudgetPct = opus
    ? ((opus.estimatedCost / totals.estimatedCost) * 100).toFixed(0)
    : null;

  return (
    <SectionWrapper id="models" layout="split-left">
      {/* Left: Donut chart */}
      <div className="flex flex-col items-center justify-center">
        <div className="h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center label */}
        <div className="-mt-[190px] sm:-mt-[210px] mb-[120px] sm:mb-[140px] text-center pointer-events-none">
          <p className="font-mono text-2xl font-bold text-text-primary sm:text-3xl">
            {sorted.length}
          </p>
          <p className="text-xs text-text-tertiary">models</p>
        </div>
      </div>

      {/* Right: Table + callout */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-text-tertiary" />
          <h2 className="font-serif text-2xl font-bold text-text-primary sm:text-3xl">
            Model Mix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-tertiary">
                <th className="pb-2 pr-4 font-sans text-xs font-medium">
                  Model
                </th>
                <th className="pb-2 pr-4 font-sans text-xs font-medium text-right">
                  Tokens
                </th>
                <th className="pb-2 pr-4 font-sans text-xs font-medium text-right">
                  %
                </th>
                <th className="pb-2 font-sans text-xs font-medium text-right">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const pct = (m.totalTokens / totals.totalTokens) * 100;
                return (
                  <tr
                    key={m.model}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            background: colorMap[m.model] || "#78716C",
                          }}
                        />
                        <span className="font-sans text-text-primary">
                          {m.displayName}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-text-secondary">
                      {formatTokens(m.totalTokens)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-text-secondary">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-primary font-semibold">
                      ${m.estimatedCost.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Efficiency callout */}
        {opus && opusBudgetPct && (
          <div className="mt-6 rounded-lg border border-opus-coral/30 bg-opus-coral/5 px-4 py-3">
            <p className="font-sans text-sm text-text-secondary">
              <span className="font-semibold text-opus-coral">
                {opus.displayName}
              </span>{" "}
              = <span className="font-mono font-semibold text-text-primary">{opusBudgetPct}%</span> of
              total spend
              {Number(opusBudgetPct) > 50 && (
                <span className="text-text-tertiary">
                  {" "}— consider routing more tasks to Sonnet
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}
