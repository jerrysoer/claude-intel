import { readdir, stat } from "fs/promises";
import { join, sep } from "path";
import { homedir } from "os";
import { parseJSONLFile } from "./parser";
import { calculateActualCost, calculateWhatIf } from "./cost-calculator";
import { detectInsights } from "./insights";
import { getModelDisplayName, getAnthropicPricing } from "../data/pricing";
import type {
  IntelPayload,
  ParsedEntry,
  DailySummary,
  ModelTokens,
  ProjectSummary,
  CacheEfficiency,
  SessionDetail,
} from "../data/types";

const CLAUDE_DIR = join(homedir(), ".claude", "projects");

/**
 * Decode directory name back to human-readable project path.
 * Directory names encode absolute paths with "/" → "-".
 * e.g., "-Users-jsmacair-Claude-projects-scrolly-gps-explainer" → "scrolly/gps-explainer"
 *
 * The trick: reconstruct the original path by replacing the known
 * home directory prefix, then use the actual filesystem to resolve
 * ambiguous segments (e.g., "la-commute-calculator" vs "la/commute/calculator").
 */
function decodeProjectName(dirName: string): string {
  // The dir name is the absolute path with "/" replaced by "-"
  // Reconstruct: strip leading dash, replace the home prefix
  const encoded = dirName.replace(/^-/, "");
  const homeParts = homedir().split(sep).filter(Boolean);

  // Build the home prefix as it appears encoded: "Users-jsmacair"
  const homeEncoded = homeParts.join("-");

  let remainder = encoded;
  if (remainder.startsWith(homeEncoded)) {
    remainder = remainder.slice(homeEncoded.length);
    if (remainder.startsWith("-")) remainder = remainder.slice(1);
  }

  // Strip known intermediate directories (order matters — longest first)
  const prefixes = [
    "Claude-projects-",
    "Claude-claude-learning-",
    "claude-learning-",
  ];
  for (const prefix of prefixes) {
    if (remainder.startsWith(prefix)) {
      remainder = remainder.slice(prefix.length);
      break;
    }
  }

  // Clean up remaining prefixes
  remainder = remainder
    .replace(/^Claude-/, "")
    .replace(/^explainer-/, "");

  // For very short remainders that are just parent dirs, keep more context
  // e.g., "Claude-projects" → "~/Claude/projects", "Claude" → "~/Claude"
  if (!remainder || remainder === "Claude" || remainder === "projects" || remainder === "Claude-projects") {
    // Use last 2 segments of the encoded path for clarity
    const allParts = encoded.split("-");
    remainder = "~/" + allParts.slice(-2).join("/");
  }

  // What remains is the project name with dashes preserved.
  // This gives us "la-commute-calculator" instead of "la/commute/calculator".
  return remainder;
}

/**
 * Find all JSONL files in the Claude projects directory.
 */
async function findJSONLFiles(baseDir: string): Promise<{ path: string; project: string }[]> {
  const results: { path: string; project: string }[] = [];

  try {
    const projectDirs = await readdir(baseDir);

    for (const projectDir of projectDirs) {
      const projectPath = join(baseDir, projectDir);
      const projectStat = await stat(projectPath).catch(() => null);
      if (!projectStat?.isDirectory()) continue;

      const projectName = decodeProjectName(projectDir);

      // Read top-level JSONL files
      const files = await readdir(projectPath).catch(() => []);
      for (const file of files) {
        if (file.endsWith(".jsonl")) {
          results.push({ path: join(projectPath, file), project: projectName });
        }
      }

      // Check for subagents directory
      for (const subDir of files) {
        const subPath = join(projectPath, subDir);
        const subStat = await stat(subPath).catch(() => null);
        if (!subStat?.isDirectory()) continue;

        const subFiles = await readdir(subPath).catch(() => []);
        for (const file of subFiles) {
          if (file.endsWith(".jsonl")) {
            results.push({ path: join(subPath, file), project: projectName });
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }

  return results;
}

/**
 * Main aggregation function. Walks ~/.claude/projects/ and produces IntelPayload.
 */
export async function aggregate(
  fromDate?: string,
  toDate?: string
): Promise<IntelPayload> {
  const jsonlFiles = await findJSONLFiles(CLAUDE_DIR);
  const allEntries: ParsedEntry[] = [];

  // Parse all files
  for (const { path, project } of jsonlFiles) {
    const entries = await parseJSONLFile(path, fromDate, toDate);
    // Tag with project name from directory
    for (const entry of entries) {
      // Use directory-derived project name instead of cwd
      (entry as ParsedEntry & { project?: string }).project = project;
      allEntries.push(entry);
    }
  }

  // Sort by timestamp
  allEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // ── Compute date range ──
  const dates = allEntries.map((e) => e.date);
  const startDate = dates.length > 0 ? dates[0] : fromDate ?? "";
  const endDate = dates.length > 0 ? dates[dates.length - 1] : toDate ?? "";

  // ── Daily aggregation ──
  const dailyMap = new Map<string, DailySummary>();
  const sessionDates = new Map<string, Set<string>>();

  for (const entry of allEntries) {
    const existing = dailyMap.get(entry.date) ?? {
      date: entry.date,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      sessionCount: 0,
      turnCount: 0,
    };

    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.cacheReadTokens += entry.cacheReadTokens;
    existing.cacheWriteTokens += entry.cacheWriteTokens;
    existing.totalTokens +=
      entry.inputTokens + entry.outputTokens + entry.cacheReadTokens + entry.cacheWriteTokens;
    existing.estimatedCost += calculateActualCost(entry, entry.model);
    existing.turnCount += 1;

    // Track unique sessions per day
    if (!sessionDates.has(entry.date)) {
      sessionDates.set(entry.date, new Set());
    }
    sessionDates.get(entry.date)!.add(entry.sessionId);

    dailyMap.set(entry.date, existing);
  }

  // Set session counts
  for (const [date, sessions] of sessionDates) {
    const daily = dailyMap.get(date)!;
    daily.sessionCount = sessions.size;
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // ── Model aggregation ──
  const modelMap = new Map<string, ModelTokens>();

  for (const entry of allEntries) {
    const existing = modelMap.get(entry.model) ?? {
      model: entry.model,
      displayName: getModelDisplayName(entry.model),
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      turnCount: 0,
    };

    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.cacheReadTokens += entry.cacheReadTokens;
    existing.cacheWriteTokens += entry.cacheWriteTokens;
    existing.totalTokens +=
      entry.inputTokens + entry.outputTokens + entry.cacheReadTokens + entry.cacheWriteTokens;
    existing.estimatedCost += calculateActualCost(entry, entry.model);
    existing.turnCount += 1;

    modelMap.set(entry.model, existing);
  }

  const byModel = Array.from(modelMap.values()).sort(
    (a, b) => b.estimatedCost - a.estimatedCost
  );

  // ── Project aggregation ──
  const projectMap = new Map<string, ProjectSummary & { modelCounts: Map<string, number> }>();
  const projectSessions = new Map<string, Set<string>>();

  for (const entry of allEntries) {
    const project = (entry as ParsedEntry & { project?: string }).project ?? "unknown";
    const existing = projectMap.get(project) ?? {
      project,
      displayName: project,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      sessionCount: 0,
      turnCount: 0,
      dominantModel: "",
      modelCounts: new Map<string, number>(),
    };

    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.cacheReadTokens += entry.cacheReadTokens;
    existing.cacheWriteTokens += entry.cacheWriteTokens;
    existing.totalTokens +=
      entry.inputTokens + entry.outputTokens + entry.cacheReadTokens + entry.cacheWriteTokens;
    existing.estimatedCost += calculateActualCost(entry, entry.model);
    existing.turnCount += 1;

    existing.modelCounts.set(
      entry.model,
      (existing.modelCounts.get(entry.model) ?? 0) + 1
    );

    if (!projectSessions.has(project)) {
      projectSessions.set(project, new Set());
    }
    projectSessions.get(project)!.add(entry.sessionId);

    projectMap.set(project, existing);
  }

  const byProject: ProjectSummary[] = Array.from(projectMap.values())
    .map(({ modelCounts, ...rest }) => {
      // Find dominant model
      let maxCount = 0;
      let dominantModel = "";
      for (const [model, count] of modelCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantModel = model;
        }
      }
      return {
        ...rest,
        sessionCount: projectSessions.get(rest.project)?.size ?? 0,
        dominantModel: getModelDisplayName(dominantModel),
      };
    })
    .sort((a, b) => b.totalTokens - a.totalTokens);

  // ── Cache efficiency ──
  const totalCacheReads = allEntries.reduce((s, e) => s + e.cacheReadTokens, 0);
  const totalCacheWrites = allEntries.reduce((s, e) => s + e.cacheWriteTokens, 0);
  const totalInputTokens = allEntries.reduce((s, e) => s + e.inputTokens, 0);

  // Calculate what it would cost if all cache reads were full input price
  let uncachedCost = 0;
  let actualCost = 0;
  for (const entry of allEntries) {
    const pricing = getAnthropicPricing(entry.model);
    const actual = calculateActualCost(entry, entry.model);
    // Uncached: cache reads charged at full input rate, cache writes at full input rate
    const uncached =
      ((entry.inputTokens + entry.cacheReadTokens + entry.cacheWriteTokens) / 1_000_000) *
        pricing.inputPer1M +
      (entry.outputTokens / 1_000_000) * pricing.outputPer1M;

    uncachedCost += uncached;
    actualCost += actual;
  }

  const totalCacheEligible = totalCacheReads + totalCacheWrites + totalInputTokens;
  const cacheEfficiency: CacheEfficiency = {
    hitRate: totalCacheEligible > 0 ? totalCacheReads / totalCacheEligible : 0,
    savedAmount: uncachedCost - actualCost,
    uncachedCost,
    actualCost,
    totalCacheReads,
    totalCacheWrites,
  };

  // ── Session details ──
  const sessionMap = new Map<string, SessionDetail>();
  for (const entry of allEntries) {
    const key = `${entry.sessionId}-${entry.model}`;
    const project = (entry as ParsedEntry & { project?: string }).project ?? "unknown";
    const existing = sessionMap.get(key) ?? {
      sessionId: entry.sessionId,
      date: entry.date,
      project,
      model: getModelDisplayName(entry.model),
      turnCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      isSubagent: entry.isSubagent,
    };

    existing.turnCount += 1;
    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    existing.cacheReadTokens += entry.cacheReadTokens;
    existing.cacheWriteTokens += entry.cacheWriteTokens;
    existing.totalTokens +=
      entry.inputTokens + entry.outputTokens + entry.cacheReadTokens + entry.cacheWriteTokens;
    existing.estimatedCost += calculateActualCost(entry, entry.model);

    sessionMap.set(key, existing);
  }

  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => b.estimatedCost - a.estimatedCost
  );

  // ── Totals ──
  const allSessions = new Set(allEntries.map((e) => e.sessionId));
  const totals = {
    inputTokens: allEntries.reduce((s, e) => s + e.inputTokens, 0),
    outputTokens: allEntries.reduce((s, e) => s + e.outputTokens, 0),
    cacheReadTokens: totalCacheReads,
    cacheWriteTokens: totalCacheWrites,
    totalTokens: allEntries.reduce(
      (s, e) =>
        s + e.inputTokens + e.outputTokens + e.cacheReadTokens + e.cacheWriteTokens,
      0
    ),
    estimatedCost: actualCost,
    sessionCount: allSessions.size,
    turnCount: allEntries.length,
  };

  // ── What If ──
  const whatIf = calculateWhatIf(byModel);

  // ── Insights ──
  const insights = detectInsights(allEntries, daily, byModel, totals);

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { start: startDate, end: endDate },
    totals,
    daily,
    byModel,
    byProject,
    cacheEfficiency,
    insights,
    whatIf,
    sessions,
  };
}
