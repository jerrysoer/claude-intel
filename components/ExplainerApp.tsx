"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import type { IntelPayload } from "@/data/types";
import ThemeToggle from "@/components/shared/ThemeToggle";
import SectionNav, { type NavSection } from "@/components/shared/SectionNav";
import HeroSection from "@/components/sections/HeroSection";
import TimelineSection from "@/components/sections/TimelineSection";
import ModelMixSection from "@/components/sections/ModelMixSection";
import CostLabSection from "@/components/sections/CostLabSection";
import ProjectIntelSection from "@/components/sections/ProjectIntelSection";
import CacheSection from "@/components/sections/CacheSection";
import InsightsSection from "@/components/sections/InsightsSection";
import HooksSection from "@/components/sections/HooksSection";
import DeepDiveSection from "@/components/sections/DeepDiveSection";

const NAV_SECTIONS: NavSection[] = [
  { id: "hero", label: "Overview", shortLabel: "Overview" },
  { id: "timeline", label: "Timeline", shortLabel: "Timeline" },
  { id: "models", label: "Model Mix", shortLabel: "Models" },
  { id: "cost-lab", label: "Cost Lab", shortLabel: "Costs" },
  { id: "projects", label: "Projects", shortLabel: "Projects" },
  { id: "cache", label: "Cache", shortLabel: "Cache" },
  { id: "insights", label: "Insights", shortLabel: "Insights" },
  { id: "hooks", label: "Hooks", shortLabel: "Hooks" },
  { id: "deep-dive", label: "Deep Dive", shortLabel: "Detail" },
];

export default function ExplainerApp() {
  const [data, setData] = useState<IntelPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/data");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
        setLoading(false);
        return;
      }
    } catch {
      // API not available, try inline data
    }

    // Fall back to inline data for static export
    const inline = (window as unknown as Record<string, unknown>)
      .__INTEL_DATA__ as IntelPayload | undefined;
    if (inline) {
      setData(inline);
      setLoading(false);
      return;
    }

    setError("Could not load data. Make sure the API is running or data is embedded.");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Refresh failed — keep existing data
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent" />
          <p className="font-sans text-sm text-text-tertiary">
            Loading intelligence report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 font-sans text-base text-text-secondary">
            {error ?? "Failed to load data."}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="rounded-lg border border-border bg-bg-card px-6 py-2.5 font-sans text-sm font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state: data loaded but no sessions found
  if (data.totals.turnCount === 0) {
    return (
      <>
        <ThemeToggle />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg-card">
              <span className="text-2xl">📊</span>
            </div>
            <h1 className="mb-3 font-serif text-2xl text-text-primary">
              No session data found yet
            </h1>
            <p className="mb-6 font-sans text-sm leading-relaxed text-text-secondary">
              claude-intel reads usage logs from <code className="rounded bg-bg-card px-1.5 py-0.5 text-xs font-mono border border-border">~/.claude/projects/</code>. Run a conversation in Claude Code, then come back here to see your spending dashboard.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
                className="rounded-lg border border-border bg-bg-card px-6 py-2.5 font-sans text-sm font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
              >
                Refresh
              </button>
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-bg-card px-6 py-2.5 font-sans text-sm font-medium text-text-secondary transition-all hover:border-text-tertiary/40 hover:text-text-primary"
              >
                Claude Code docs
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ThemeToggle />
      <SectionNav sections={NAV_SECTIONS} />

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="fixed top-4 right-18 z-50 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 disabled:opacity-50"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
        aria-label="Refresh data"
        title="Re-scan usage data"
      >
        <RefreshCw
          size={16}
          className={refreshing ? "animate-spin" : ""}
        />
      </button>

      <main>
        <HeroSection data={data} />

        <div className="border-t border-border" />
        <TimelineSection data={data} />

        <div className="border-t border-border" />
        <ModelMixSection data={data} />

        <div className="border-t border-border" />
        <CostLabSection data={data} />

        <div className="border-t border-border" />
        <ProjectIntelSection data={data} />

        <div className="border-t border-border" />
        <CacheSection data={data} />

        <div className="border-t border-border" />
        <InsightsSection data={data} />

        <div className="border-t border-border" />
        <HooksSection data={data} />

        <div className="border-t border-border" />
        <DeepDiveSection data={data} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="font-serif text-lg text-text-primary mb-2">
            claude-intel
          </p>
          <p className="font-sans text-sm text-text-tertiary leading-relaxed max-w-md mx-auto">
            Open-source spending intelligence for Claude Code.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="https://github.com/jerrysoer/claude-intel"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs text-text-secondary hover:text-text-primary hover:underline underline-offset-2 transition-colors"
            >
              GitHub
            </a>
            <span className="text-text-tertiary">&middot;</span>
            <span className="font-sans text-xs text-text-tertiary">
              MIT License
            </span>
          </div>
          <p className="mt-8 font-mono text-xs text-text-tertiary">
            {data.dateRange.start} → {data.dateRange.end} &middot;{" "}
            {data.totals.turnCount.toLocaleString()} turns analyzed
          </p>
        </div>
      </footer>
    </>
  );
}
