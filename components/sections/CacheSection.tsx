"use client";

import { useEffect, useRef, useState } from "react";
import SectionWrapper from "@/components/shared/SectionWrapper";
import type { IntelPayload } from "@/data/types";

// ── Formatters ──

function formatCost(n: number): string {
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 10) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ── Animated counter ──

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

// ── Gauge component ──

function CacheGauge({
  hitRate,
  animated,
}: {
  hitRate: number;
  animated: boolean;
}) {
  const animatedRate = useCountUp(hitRate * 100, 1400, animated);
  const displayRate = animated ? animatedRate : 0;

  // SVG arc gauge: 180 degrees, from left to right
  const radius = 80;
  const strokeWidth = 12;
  const cx = 100;
  const cy = 95;

  // Arc goes from 180deg to 0deg (left to right semicircle)
  const startAngle = Math.PI;
  const endAngle = startAngle - (displayRate / 100) * Math.PI;

  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy - radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy - radius * Math.sin(endAngle);

  const largeArcFlag = displayRate > 50 ? 1 : 0;

  const trackPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy}`;
  const fillPath =
    displayRate > 0
      ? `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
      : "";

  // Color based on hit rate
  const gaugeColor =
    hitRate >= 0.7
      ? "var(--output-teal)"
      : hitRate >= 0.4
        ? "var(--cache-purple)"
        : "var(--cost-rose)";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1.2s ease-out",
            }}
          />
        )}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="font-mono"
          style={{
            fill: "var(--text-primary)",
            fontSize: "28px",
            fontWeight: 700,
          }}
        >
          {Math.round(displayRate)}%
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          style={{
            fill: "var(--text-tertiary)",
            fontSize: "10px",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          cache hit rate
        </text>
      </svg>
    </div>
  );
}

// ── Main component ──

interface CacheSectionProps {
  data: IntelPayload;
}

export default function CacheSection({ data }: CacheSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const cache = data.cacheEfficiency;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animatedSavings = useCountUp(cache.savedAmount, 1400, isVisible);

  // Savings percentage
  const savingsPct =
    cache.uncachedCost > 0
      ? ((cache.savedAmount / cache.uncachedCost) * 100).toFixed(0)
      : "0";

  return (
    <SectionWrapper id="cache" layout="split-right">
      {/* Left: text + stats */}
      <div ref={ref} className="flex flex-col justify-center">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Cache Efficiency
        </h2>
        <p className="mt-3 font-sans text-lg text-text-secondary">
          Prompt caching saved you real money by reusing prior context
        </p>

        {/* Large savings stat */}
        <div className="mt-8">
          <p className="font-sans text-sm font-medium uppercase tracking-widest text-text-tertiary">
            Cache saved you
          </p>
          <p className="stat-large mt-1 text-cache-purple">
            {formatCost(isVisible ? animatedSavings : 0)}
          </p>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            {savingsPct}% less than uncached pricing
          </p>
        </div>

        {/* Cost comparison row */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-bg-card p-3">
            <p className="font-sans text-xs text-text-tertiary">
              Without cache
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-cost-rose">
              {formatCost(cache.uncachedCost)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg-card p-3">
            <p className="font-sans text-xs text-text-tertiary">Actual cost</p>
            <p className="mt-1 font-mono text-lg font-bold text-output-teal">
              {formatCost(cache.actualCost)}
            </p>
          </div>
        </div>

        {/* Token stats */}
        <div className="mt-4 flex gap-4 text-center">
          <div>
            <p className="font-mono text-sm font-semibold text-text-primary">
              {formatTokens(cache.totalCacheReads)}
            </p>
            <p className="font-sans text-xs text-text-tertiary">cache reads</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-text-primary">
              {formatTokens(cache.totalCacheWrites)}
            </p>
            <p className="font-sans text-xs text-text-tertiary">
              cache writes
            </p>
          </div>
        </div>
      </div>

      {/* Right: gauge */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-xs">
          <CacheGauge hitRate={cache.hitRate} animated={isVisible} />

          {/* Quality indicator */}
          <div className="mt-4 text-center">
            <span
              className={`inline-block rounded-full px-3 py-1 font-sans text-xs font-medium ${
                cache.hitRate >= 0.7
                  ? "bg-output-teal/10 text-output-teal"
                  : cache.hitRate >= 0.4
                    ? "bg-cache-purple/10 text-cache-purple"
                    : "bg-cost-rose/10 text-cost-rose"
              }`}
            >
              {cache.hitRate >= 0.7
                ? "Excellent"
                : cache.hitRate >= 0.4
                  ? "Good"
                  : "Room to improve"}
            </span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
