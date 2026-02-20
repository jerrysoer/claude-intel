"use client";

import { useState, useEffect } from "react";
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
import DeepDiveSection from "@/components/sections/DeepDiveSection";

const NAV_SECTIONS: NavSection[] = [
  { id: "hero", label: "Overview", shortLabel: "Overview" },
  { id: "timeline", label: "Timeline", shortLabel: "Timeline" },
  { id: "models", label: "Model Mix", shortLabel: "Models" },
  { id: "cost-lab", label: "Cost Lab", shortLabel: "Costs" },
  { id: "projects", label: "Projects", shortLabel: "Projects" },
  { id: "cache", label: "Cache", shortLabel: "Cache" },
  { id: "insights", label: "Insights", shortLabel: "Insights" },
  { id: "deep-dive", label: "Deep Dive", shortLabel: "Detail" },
];

export default function ExplainerApp() {
  const [data, setData] = useState<IntelPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/data");
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setLoading(false);
          return;
        }
      } catch {
        // API not available, try inline data
      }

      // Fall back to inline data for static export
      const inline = (window as unknown as Record<string, unknown>).__INTEL_DATA__ as IntelPayload | undefined;
      if (inline) {
        setData(inline);
        setLoading(false);
        return;
      }

      setError("Could not load data. Make sure the API is running or data is embedded.");
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || "No data available"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <ThemeToggle />
      <SectionNav sections={NAV_SECTIONS} />
      
      <main>
        <section id="hero">
          <HeroSection data={data} />
        </section>
        
        <section id="timeline">
          <TimelineSection data={data} />
        </section>
        
        <section id="models">
          <ModelMixSection data={data} />
        </section>
        
        <section id="cost-lab">
          <CostLabSection data={data} />
        </section>
        
        <section id="projects">
          <ProjectIntelSection data={data} />
        </section>
        
        <section id="cache">
          <CacheSection data={data} />
        </section>
        
        <section id="insights">
          <InsightsSection data={data} />
        </section>
        
        <section id="deep-dive">
          <DeepDiveSection data={data} />
        </section>
      </main>
    </div>
  );
}
