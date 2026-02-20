"use client";

import {
  Timer,
  Zap,
  Clock,
  Calendar,
  TrendingUp,
  GitBranch,
  Database,
  type LucideIcon,
} from "lucide-react";
import type { IntelPayload, Insight } from "@/data/types";
import SectionWrapper from "@/components/shared/SectionWrapper";

const ICON_MAP: Record<string, LucideIcon> = {
  Timer,
  Zap,
  Clock,
  Calendar,
  TrendingUp,
  GitBranch,
  Database,
};

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = ICON_MAP[insight.icon] ?? Zap;

  return (
    <div className="group rounded-xl border border-border bg-bg-card p-6 transition-all duration-200 hover:border-text-tertiary/40">
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: "color-mix(in srgb, var(--anthropic-orange) 15%, transparent)" }}
        >
          <Icon
            size={20}
            style={{ color: "var(--anthropic-orange)" }}
          />
        </div>
        {insight.metric && (
          <span className="rounded-full border border-border bg-bg-secondary px-3 py-1 font-mono text-xs font-semibold text-text-primary">
            {insight.metric}
          </span>
        )}
      </div>

      <h3 className="mb-2 font-serif text-lg font-semibold text-text-primary">
        {insight.title}
      </h3>
      <p className="font-sans text-sm leading-relaxed text-text-secondary">
        {insight.description}
      </p>
    </div>
  );
}

export default function InsightsSection({ data }: { data: IntelPayload }) {
  const { insights } = data;

  if (!insights || insights.length === 0) return null;

  return (
    <SectionWrapper id="insights" layout="centered" stagger>
      <div className="mb-12 text-center">
        <p className="mb-2 font-sans text-sm uppercase tracking-widest text-text-tertiary">
          Behavioral Patterns
        </p>
        <h2 className="font-serif text-3xl font-bold text-text-primary sm:text-4xl">
          Insights
        </h2>
        <p className="mt-3 font-sans text-base text-text-secondary">
          Notable patterns detected in your Claude Code usage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {insights.map((insight, i) => (
          <InsightCard key={`${insight.type}-${i}`} insight={insight} />
        ))}
      </div>
    </SectionWrapper>
  );
}
