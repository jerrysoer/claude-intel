"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Zap, DollarSign, Cpu } from "lucide-react";
import type { IntelPayload } from "@/data/types";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const endDate = new Date(end + "T00:00:00");
  const year = endDate.getFullYear();
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

export default function HeroSection({ data }: { data: IntelPayload }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { totals, dateRange, byModel } = data;
  const topModel = byModel.reduce((a, b) =>
    b.totalTokens > a.totalTokens ? b : a
  );
  const avgCost = totals.sessionCount > 0
    ? totals.estimatedCost / totals.sessionCount
    : 0;

  const pills = [
    {
      icon: <Zap size={14} />,
      label: "Sessions",
      value: totals.sessionCount.toLocaleString(),
    },
    {
      icon: <DollarSign size={14} />,
      label: "Avg / session",
      value: `$${avgCost.toFixed(2)}`,
    },
    {
      icon: <Cpu size={14} />,
      label: "Top model",
      value: topModel.displayName,
    },
  ];

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 40%, var(--anthropic-orange), transparent)",
        }}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 transition-all duration-1000 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        {/* Eyebrow */}
        <p className="mb-6 font-sans text-sm uppercase tracking-widest text-text-secondary">
          Claude Code Intelligence Report
        </p>

        {/* Date range */}
        <p className="mb-4 font-mono text-xs text-text-tertiary">
          {formatDateRange(dateRange.start, dateRange.end)}
        </p>

        {/* Giant cost stat */}
        <div className="stat-hero mb-2">
          ${totals.estimatedCost.toFixed(0)}
        </div>

        {/* Token count */}
        <p className="mb-2 font-mono text-lg text-text-secondary sm:text-xl">
          {formatTokens(totals.totalTokens)} tokens
        </p>
        <p className="mb-10 font-sans text-xs text-text-tertiary">
          Estimated at API rates — actual cost depends on your plan
        </p>

        {/* Summary pills */}
        <div className="mb-16 flex flex-wrap items-center justify-center gap-3">
          {pills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-4 py-2 font-mono text-xs text-text-secondary"
            >
              {pill.icon}
              <span className="text-text-tertiary">{pill.label}</span>
              <span className="font-semibold text-text-primary">
                {pill.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Scroll chevron */}
      <a
        href="#timeline"
        className={`absolute bottom-10 z-10 transition-all duration-1000 delay-500 ${
          visible ? "translate-y-0 opacity-60" : "translate-y-4 opacity-0"
        } hover:opacity-100`}
        aria-label="Scroll to timeline"
      >
        <ChevronDown
          size={28}
          className="text-text-tertiary"
          style={{ animation: "float 2.5s ease-in-out infinite" }}
        />
      </a>
    </section>
  );
}
