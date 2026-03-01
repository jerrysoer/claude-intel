import { existsSync } from "fs";
import { join } from "path";
import { HOOK_TEMPLATES } from "../data/hook-templates";
import type {
  ParsedEntry,
  Insight,
  DetectedProject,
  HookRecommendation,
  ProjectType,
} from "../data/types";

// ── Project type detection ──

/**
 * Detect project types by probing the filesystem for marker files.
 * Groups entries by project name, extracts unique cwds, and checks
 * each cwd for technology-specific files.
 */
export function detectProjectTypes(
  entries: (ParsedEntry & { project?: string })[]
): DetectedProject[] {
  // Collect unique cwds per project
  const projectCwds = new Map<string, Set<string>>();
  for (const entry of entries) {
    const project = entry.project ?? "unknown";
    if (!projectCwds.has(project)) {
      projectCwds.set(project, new Set());
    }
    if (entry.cwd) {
      projectCwds.get(project)!.add(entry.cwd);
    }
  }

  const results: DetectedProject[] = [];

  for (const [project, cwds] of projectCwds) {
    const firstCwd = cwds.values().next().value ?? "";
    const types = new Set<ProjectType>();

    for (const cwd of cwds) {
      // Next.js markers
      if (
        existsSync(join(cwd, "next.config.ts")) ||
        existsSync(join(cwd, "next.config.js")) ||
        existsSync(join(cwd, "next.config.mjs"))
      ) {
        types.add("nextjs");
      }

      // Supabase markers
      if (
        existsSync(join(cwd, "supabase")) ||
        existsSync(join(cwd, "lib", "supabase.ts")) ||
        existsSync(join(cwd, "src", "lib", "supabase.ts"))
      ) {
        types.add("supabase");
      }

      // Python markers
      if (
        existsSync(join(cwd, "requirements.txt")) ||
        existsSync(join(cwd, "pyproject.toml"))
      ) {
        types.add("python");
      }

      // Node.js (without Next.js)
      if (
        existsSync(join(cwd, "package.json")) &&
        !types.has("nextjs")
      ) {
        types.add("node");
      }
    }

    // Fallback
    if (types.size === 0) {
      types.add("generic");
    }

    results.push({
      project,
      cwd: firstCwd,
      types: Array.from(types),
    });
  }

  return results;
}

// ── Hook recommendation engine ──

/**
 * Generate personalized hook recommendations based on detected project types,
 * behavioral insights, and usage totals.
 */
export function detectHookRecommendations(
  entries: ParsedEntry[],
  insights: Insight[],
  totals: { estimatedCost: number; turnCount: number; sessionCount: number }
): { hooks: HookRecommendation[]; detectedProjects: DetectedProject[] } {
  const detectedProjects = detectProjectTypes(
    entries as (ParsedEntry & { project?: string })[]
  );

  const recommendations: HookRecommendation[] = [];
  const templateMap = new Map(HOOK_TEMPLATES.map((t) => [t.id, t]));

  // ── Universal: always recommended ──

  const secretHook = templateMap.get("secret-detection")!;
  recommendations.push({
    hook: secretHook,
    reasoning:
      "Every project benefits from secret detection. This hook catches API keys, tokens, and passwords before they reach your codebase.",
    relevance: 1.0,
  });

  const consoleHook = templateMap.get("console-cleanup")!;
  recommendations.push({
    hook: consoleHook,
    reasoning:
      "Forgotten console.log statements clutter production builds and can leak internal state. This hook flags them as they're written.",
    relevance: 0.95,
  });

  // ── Stack-specific: only when project types detected ──

  const nextjsProjects = detectedProjects.filter((p) =>
    p.types.includes("nextjs")
  );
  if (nextjsProjects.length > 0) {
    const envHook = templateMap.get("env-format")!;
    const names = nextjsProjects.map((p) => p.project).join(", ");
    recommendations.push({
      hook: envHook,
      reasoning: `You have ${nextjsProjects.length} Next.js project${nextjsProjects.length > 1 ? "s" : ""} (${names}). .env is committed to git by default — secrets should go in .env.local, which Next.js gitignores automatically.`,
      relevance: 0.9,
    });
  }

  const supabaseProjects = detectedProjects.filter((p) =>
    p.types.includes("supabase")
  );
  if (supabaseProjects.length > 0) {
    const rlsHook = templateMap.get("rls-reminder")!;
    const names = supabaseProjects.map((p) => p.project).join(", ");
    recommendations.push({
      hook: rlsHook,
      reasoning: `You use Supabase in ${supabaseProjects.length} project${supabaseProjects.length > 1 ? "s" : ""} (${names}). New tables have RLS disabled by default — this hook catches CREATE TABLE without ENABLE ROW LEVEL SECURITY.`,
      relevance: 0.85,
    });
  }

  // ── Data-driven: only when matching insights exist ──

  const highSpendInsight = insights.find((i) => i.type === "high-spend-day");
  if (highSpendInsight || totals.estimatedCost > 100) {
    const costHook = templateMap.get("cost-alert")!;
    const reason = highSpendInsight
      ? `${highSpendInsight.description} A session cost alert helps you catch expensive sessions before they spiral.`
      : `You've spent $${totals.estimatedCost.toFixed(0)} total. A cost alert per session helps keep individual sessions in check.`;
    recommendations.push({
      hook: costHook,
      reasoning: reason,
      relevance: 0.8,
    });
  }

  const marathonInsight = insights.find((i) => i.type === "marathon-session");
  if (marathonInsight) {
    const checkpointHook = templateMap.get("session-checkpoint")!;
    recommendations.push({
      hook: checkpointHook,
      reasoning: `${marathonInsight.description} A checkpoint nudge helps you pause, review progress, and decide if a fresh session would be more focused.`,
      relevance: 0.75,
    });
  }

  // Sort by relevance (highest first)
  recommendations.sort((a, b) => b.relevance - a.relevance);

  return { hooks: recommendations, detectedProjects };
}
