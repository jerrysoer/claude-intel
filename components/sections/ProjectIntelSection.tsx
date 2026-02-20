"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChevronDown } from "lucide-react";
import SectionWrapper from "@/components/shared/SectionWrapper";
import type { IntelPayload, ProjectSummary } from "@/data/types";
import { getModelTier } from "@/data/pricing";

// ── Formatters ──

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCost(n: number): string {
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 10) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

// ── Model color lookup via CSS variables ──

const MODEL_CSS_VARS: Record<string, string> = {
  flagship: "--opus-coral",
  mid: "--sonnet-blue",
  small: "--haiku-green",
};

const MODEL_FALLBACK_COLORS: Record<string, string> = {
  flagship: "#da7756",
  mid: "#6366f1",
  small: "#22c55e",
};

function useModelColors() {
  const [colors, setColors] = useState<Record<string, string>>(
    MODEL_FALLBACK_COLORS
  );

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const next: Record<string, string> = {};
    for (const [tier, varName] of Object.entries(MODEL_CSS_VARS)) {
      const val = style.getPropertyValue(varName).trim();
      if (val) next[tier] = val;
    }
    if (Object.keys(next).length > 0) {
      setColors((prev) => ({ ...prev, ...next }));
    }
  }, []);

  return colors;
}

// ── Chart tooltip ──

function ProjectTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { displayName: string; totalTokens: number; estimatedCost: number };
  }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="font-sans text-sm font-medium text-text-primary">
        {d.displayName}
      </p>
      <p className="font-mono text-xs text-text-secondary">
        {formatTokens(d.totalTokens)} tokens &middot; {formatCost(d.estimatedCost)}
      </p>
    </div>
  );
}

// ── Expanded row: per-model breakdown ──

function ProjectBreakdown({
  project,
  sessions,
}: {
  project: ProjectSummary;
  sessions: IntelPayload["sessions"];
}) {
  // Aggregate sessions by model for this project
  const byModel = new Map<
    string,
    { model: string; totalTokens: number; cost: number }
  >();
  for (const s of sessions) {
    if (s.project !== project.project) continue;
    const existing = byModel.get(s.model);
    if (existing) {
      existing.totalTokens += s.totalTokens;
      existing.cost += s.estimatedCost;
    } else {
      byModel.set(s.model, {
        model: s.model,
        totalTokens: s.totalTokens,
        cost: s.estimatedCost,
      });
    }
  }

  const modelEntries = Array.from(byModel.values()).sort(
    (a, b) => b.totalTokens - a.totalTokens
  );

  if (modelEntries.length === 0) {
    return (
      <p className="px-4 py-2 font-sans text-xs text-text-tertiary">
        No session detail available
      </p>
    );
  }

  return (
    <div className="grid gap-1 px-4 pb-3 pt-1">
      {modelEntries.map((entry) => {
        const tier = getModelTier(entry.model);
        const tierLabel =
          tier === "flagship" ? "Opus" : tier === "mid" ? "Sonnet" : "Haiku";
        return (
          <div
            key={entry.model}
            className="flex items-center justify-between rounded-md bg-bg-secondary/50 px-3 py-1.5"
          >
            <span className="font-sans text-xs text-text-secondary">
              {tierLabel}
            </span>
            <span className="font-mono text-xs text-text-primary">
              {formatTokens(entry.totalTokens)} &middot;{" "}
              {formatCost(entry.cost)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──

interface ProjectIntelSectionProps {
  data: IntelPayload;
}

export default function ProjectIntelSection({
  data,
}: ProjectIntelSectionProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const modelColors = useModelColors();

  // Top 10 projects by total tokens
  const top10 = [...data.byProject]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 10);

  const chartData = top10.map((p) => ({
    ...p,
    fill: modelColors[getModelTier(p.dominantModel)] || modelColors.mid,
  }));

  const toggleExpand = (project: string) => {
    setExpandedProject((prev) => (prev === project ? null : project));
  };

  return (
    <SectionWrapper id="projects" layout="centered">
      <div>
        {/* Header */}
        <h2 className="font-serif text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Project Intel
        </h2>
        <p className="mt-3 font-sans text-lg text-text-secondary">
          Where your tokens went — top 10 projects by consumption
        </p>

        {/* Chart */}
        <div className="mt-8 rounded-xl border border-border bg-bg-card p-4 sm:p-6">
          <ResponsiveContainer width="100%" height={Math.max(300, top10.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatTokens(v)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={120}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={<ProjectTooltip />}
                cursor={{ fill: "var(--border)", opacity: 0.3 }}
              />
              <Bar dataKey="totalTokens" radius={[0, 6, 6, 0]} barSize={24}>
                {chartData.map((entry) => (
                  <Cell key={entry.project} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
            {(
              [
                ["flagship", "Opus"],
                ["mid", "Sonnet"],
                ["small", "Haiku"],
              ] as const
            ).map(([tier, label]) => (
              <div key={tier} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: modelColors[tier] }}
                />
                <span className="font-sans text-xs text-text-secondary">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable project rows */}
        <div className="mt-6 space-y-1">
          {top10.map((project, i) => {
            const isExpanded = expandedProject === project.project;
            const tier = getModelTier(project.dominantModel);
            const barColor = modelColors[tier] || modelColors.mid;
            const pctOfMax =
              top10[0].totalTokens > 0
                ? (project.totalTokens / top10[0].totalTokens) * 100
                : 0;

            return (
              <div
                key={project.project}
                className="overflow-hidden rounded-lg border border-border bg-bg-card transition-all"
              >
                <button
                  onClick={() => toggleExpand(project.project)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary/50"
                >
                  <span className="font-mono text-xs text-text-tertiary w-5 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-sm font-medium text-text-primary truncate">
                        {project.displayName}
                      </span>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="font-mono text-xs text-text-secondary">
                          {formatTokens(project.totalTokens)}
                        </span>
                        <span className="font-mono text-xs text-text-tertiary">
                          {formatCost(project.estimatedCost)}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`text-text-tertiary transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 h-1 w-full rounded-full bg-bg-secondary">
                      <div
                        className="h-1 rounded-full transition-all duration-500"
                        style={{
                          width: `${pctOfMax}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <ProjectBreakdown
                    project={project}
                    sessions={data.sessions}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
