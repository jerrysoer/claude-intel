"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import SectionWrapper from "@/components/shared/SectionWrapper";
import type { IntelPayload, ModelTokens } from "@/data/types";
import { getModelTier, getAnthropicPricing } from "@/data/pricing";
import { calculateWhatIf } from "@/lib/cost-calculator";

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

// ── Animated counter hook ──

function useCountUp(target: number, duration = 1200, active = false): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value;
}

// ── Rebalance model tokens: shift % of Opus -> Sonnet ──

function rebalanceModels(
  byModel: ModelTokens[],
  opusToSonnetPct: number
): ModelTokens[] {
  if (opusToSonnetPct === 0) return byModel;

  const fraction = opusToSonnetPct / 100;
  return byModel.map((m) => {
    const tier = getModelTier(m.model);

    if (tier === "flagship") {
      // Reduce flagship tokens by the fraction
      return {
        ...m,
        inputTokens: Math.round(m.inputTokens * (1 - fraction)),
        outputTokens: Math.round(m.outputTokens * (1 - fraction)),
        cacheReadTokens: Math.round(m.cacheReadTokens * (1 - fraction)),
        cacheWriteTokens: Math.round(m.cacheWriteTokens * (1 - fraction)),
        totalTokens: Math.round(m.totalTokens * (1 - fraction)),
      };
    }

    if (tier === "mid") {
      // Find total flagship tokens being moved
      const opusModels = byModel.filter(
        (om) => getModelTier(om.model) === "flagship"
      );
      const addedInput = opusModels.reduce(
        (s, om) => s + Math.round(om.inputTokens * fraction),
        0
      );
      const addedOutput = opusModels.reduce(
        (s, om) => s + Math.round(om.outputTokens * fraction),
        0
      );
      const addedCacheRead = opusModels.reduce(
        (s, om) => s + Math.round(om.cacheReadTokens * fraction),
        0
      );
      const addedCacheWrite = opusModels.reduce(
        (s, om) => s + Math.round(om.cacheWriteTokens * fraction),
        0
      );
      const addedTotal = opusModels.reduce(
        (s, om) => s + Math.round(om.totalTokens * fraction),
        0
      );

      return {
        ...m,
        inputTokens: m.inputTokens + addedInput,
        outputTokens: m.outputTokens + addedOutput,
        cacheReadTokens: m.cacheReadTokens + addedCacheRead,
        cacheWriteTokens: m.cacheWriteTokens + addedCacheWrite,
        totalTokens: m.totalTokens + addedTotal,
      };
    }

    return m;
  });
}

// ── Provider card colors ──

const PROVIDER_CSS_VARS: Record<string, string> = {
  anthropic: "--anthropic-orange",
  openai: "--openai-green",
  google: "--google-blue",
  bytedance: "--bytedance-teal",
};

function useProviderColors() {
  const [colors, setColors] = useState<Record<string, string>>({
    anthropic: "#da7756",
    openai: "#10a37f",
    google: "#4285f4",
    bytedance: "#25f4ee",
  });

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const next: Record<string, string> = {};
    for (const [provider, varName] of Object.entries(PROVIDER_CSS_VARS)) {
      const val = style.getPropertyValue(varName).trim();
      if (val) next[provider] = val;
    }
    if (Object.keys(next).length > 0) {
      setColors((prev) => ({ ...prev, ...next }));
    }
  }, []);

  return colors;
}

// ── Chart tooltip ──

function CostTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { displayName: string; totalCost: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <p className="font-sans text-sm font-medium text-text-primary">
        {d.displayName}
      </p>
      <p className="font-mono text-sm text-text-secondary">
        {formatCost(d.totalCost)}
      </p>
    </div>
  );
}

// ── Main component ──

interface CostLabSectionProps {
  data: IntelPayload;
}

export default function CostLabSection({ data }: CostLabSectionProps) {
  const [sliderValue, setSliderValue] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const providerColors = useProviderColors();

  // Intersection observer for animation trigger
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rebalanced model data
  const rebalancedModels = rebalanceModels(data.byModel, sliderValue);

  // Anthropic actual cost (with rebalancing applied)
  const anthropicCost = rebalancedModels.reduce((sum, m) => {
    const pricing = getAnthropicPricing(m.model);
    return (
      sum +
      (m.inputTokens / 1_000_000) * pricing.inputPer1M +
      (m.outputTokens / 1_000_000) * pricing.outputPer1M +
      (m.cacheReadTokens / 1_000_000) * pricing.cacheReadPer1M +
      (m.cacheWriteTokens / 1_000_000) * pricing.cacheWritePer1M
    );
  }, 0);

  // Competitor what-if costs
  const whatIfComparisons = calculateWhatIf(rebalancedModels);

  // Chart data: Anthropic + competitors
  const chartData = [
    {
      provider: "anthropic",
      displayName: "Anthropic",
      totalCost: anthropicCost,
      color: providerColors.anthropic,
    },
    ...whatIfComparisons.map((c) => ({
      provider: c.provider,
      displayName: c.displayName,
      totalCost: c.totalCost,
      color: providerColors[c.provider] || c.color,
    })),
  ].sort((a, b) => b.totalCost - a.totalCost);

  // Animated actual cost
  const animatedCost = useCountUp(
    data.totals.estimatedCost,
    1200,
    isVisible
  );

  // Savings from original to rebalanced Anthropic cost
  const rebalanceSavings = data.totals.estimatedCost - anthropicCost;

  return (
    <SectionWrapper id="cost-lab" layout="full-bleed" tinted>
      <div ref={sectionRef}>
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Cost Lab
          </h2>
          <p className="mt-3 font-sans text-lg text-text-secondary">
            Your actual spend, re-priced across providers
          </p>
        </div>

        {/* Current cost banner */}
        <div className="mx-auto mb-10 max-w-xl rounded-2xl border border-border bg-bg-card p-6 text-center shadow-sm">
          <p className="font-sans text-sm font-medium uppercase tracking-widest text-text-tertiary">
            Your actual Anthropic cost
          </p>
          <p className="stat-large mt-2 text-anthropic-orange">
            {formatCost(isVisible ? animatedCost : 0)}
          </p>
          <p className="mt-1 font-sans text-xs text-text-tertiary">
            {formatTokens(data.totals.totalTokens)} tokens &middot;{" "}
            {data.totals.sessionCount} sessions
          </p>
        </div>

        {/* Model rebalancing slider */}
        <div className="mx-auto mb-10 max-w-2xl rounded-xl border border-border bg-bg-card p-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="rebalance-slider"
              className="font-sans text-sm font-medium text-text-primary"
            >
              Model rebalancing
            </label>
            <span className="font-mono text-sm font-semibold text-text-primary">
              {sliderValue}% Opus → Sonnet
            </span>
          </div>
          <input
            id="rebalance-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="mt-3 w-full cursor-pointer accent-anthropic-orange"
          />
          <div className="mt-2 flex justify-between font-sans text-xs text-text-tertiary">
            <span>Current mix</span>
            <span>All Sonnet</span>
          </div>
          {sliderValue > 0 && (
            <p className="mt-3 text-center font-mono text-sm font-semibold text-output-teal">
              {rebalanceSavings > 0 ? "Save " : ""}
              {formatCost(Math.abs(rebalanceSavings))}
              {rebalanceSavings > 0 ? " on Anthropic alone" : " more"}
            </p>
          )}
        </div>

        {/* Provider comparison cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {chartData
            .sort((a, b) => a.totalCost - b.totalCost)
            .map((item) => {
              const isAnthropic = item.provider === "anthropic";
              const diff = anthropicCost - item.totalCost;
              return (
                <div
                  key={item.provider}
                  className={`rounded-xl border p-4 transition-all ${
                    isAnthropic
                      ? "border-anthropic-orange/30 bg-bg-card"
                      : "border-border bg-bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-sans text-xs font-medium text-text-secondary">
                      {item.displayName}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold text-text-primary sm:text-2xl">
                    {formatCost(item.totalCost)}
                  </p>
                  {!isAnthropic && (
                    <p
                      className={`mt-1 font-mono text-xs ${
                        diff > 0 ? "text-output-teal" : "text-cost-rose"
                      }`}
                    >
                      {diff > 0 ? `${formatCost(diff)} less` : `${formatCost(Math.abs(diff))} more`}
                    </p>
                  )}
                  {isAnthropic && (
                    <p className="mt-1 font-sans text-xs text-text-tertiary">
                      your provider
                    </p>
                  )}
                </div>
              );
            })}
        </div>

        {/* Horizontal bar chart */}
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-bg-card p-4 sm:p-6">
          <h3 className="mb-4 font-sans text-sm font-semibold text-text-primary">
            Total cost comparison
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData.sort((a, b) => b.totalCost - a.totalCost)}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
            >
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatCost(v)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CostTooltip />}
                cursor={{ fill: "var(--border)", opacity: 0.3 }}
              />
              <Bar dataKey="totalCost" radius={[0, 6, 6, 0]} barSize={28}>
                {chartData
                  .sort((a, b) => b.totalCost - a.totalCost)
                  .map((entry) => (
                    <Cell key={entry.provider} fill={entry.color} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Caveat */}
        <p className="mt-6 text-center font-sans text-xs text-text-tertiary">
          * Comparison assumes equivalent token counts re-priced at each
          provider&rsquo;s published rates. Cache pricing varies; providers
          without prompt caching are priced at full input rates.
        </p>
      </div>
    </SectionWrapper>
  );
}
