import type {
  ParsedEntry,
  DailySummary,
  ModelTokens,
  Insight,
} from "@/data/types";

/**
 * Detect behavioral patterns from usage data.
 */
export function detectInsights(
  entries: ParsedEntry[],
  daily: DailySummary[],
  byModel: ModelTokens[],
  totals: { estimatedCost: number; turnCount: number; sessionCount: number }
): Insight[] {
  const insights: Insight[] = [];

  // ── Marathon sessions (>100 turns in a single session) ──
  const sessionTurns = new Map<string, number>();
  for (const entry of entries) {
    sessionTurns.set(entry.sessionId, (sessionTurns.get(entry.sessionId) ?? 0) + 1);
  }
  const marathons = Array.from(sessionTurns.entries()).filter(([, turns]) => turns > 100);
  if (marathons.length > 0) {
    const longest = marathons.reduce((a, b) => (a[1] > b[1] ? a : b));
    insights.push({
      type: "marathon-session",
      title: "Marathon Runner",
      description: `You had ${marathons.length} session${marathons.length > 1 ? "s" : ""} with over 100 turns. Your longest had ${longest[1]} turns.`,
      metric: `${longest[1]} turns`,
      icon: "Timer",
    });
  }

  // ── Model mismatch (Opus used for >80% of turns) ──
  const opusModels = byModel.filter((m) => m.model.includes("opus"));
  const opusTurns = opusModels.reduce((s, m) => s + m.turnCount, 0);
  const opusPercent = totals.turnCount > 0 ? (opusTurns / totals.turnCount) * 100 : 0;
  if (opusPercent > 80) {
    const potentialSavings = opusModels.reduce((s, m) => s + m.estimatedCost, 0) * 0.8; // rough: Sonnet is ~80% cheaper
    insights.push({
      type: "model-mismatch",
      title: "Opus Loyalist",
      description: `${opusPercent.toFixed(0)}% of your turns use Opus. Routing simpler tasks to Sonnet could save ~$${potentialSavings.toFixed(0)}.`,
      metric: `${opusPercent.toFixed(0)}% Opus`,
      icon: "Zap",
    });
  }

  // ── Peak hours ──
  const hourCounts = new Map<number, number>();
  for (const entry of entries) {
    const hour = new Date(entry.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  if (hourCounts.size > 0) {
    const peakHour = Array.from(hourCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );
    const timeLabel =
      peakHour[0] < 6
        ? "night owl"
        : peakHour[0] < 12
        ? "morning"
        : peakHour[0] < 18
        ? "afternoon"
        : "evening";
    insights.push({
      type: "peak-hours",
      title: `${timeLabel.charAt(0).toUpperCase() + timeLabel.slice(1)} Coder`,
      description: `Your peak coding hour is ${peakHour[0]}:00. You're most active in the ${timeLabel}.`,
      metric: `${peakHour[0]}:00`,
      icon: "Clock",
    });
  }

  // ── Weekend warrior ──
  let weekdayTurns = 0;
  let weekendTurns = 0;
  for (const entry of entries) {
    const day = new Date(entry.timestamp).getDay();
    if (day === 0 || day === 6) weekendTurns++;
    else weekdayTurns++;
  }
  const weekendPercent =
    weekdayTurns + weekendTurns > 0
      ? (weekendTurns / (weekdayTurns + weekendTurns)) * 100
      : 0;
  if (weekendPercent > 30) {
    insights.push({
      type: "weekend-warrior",
      title: "Weekend Warrior",
      description: `${weekendPercent.toFixed(0)}% of your AI usage happens on weekends. Shipping never sleeps.`,
      metric: `${weekendPercent.toFixed(0)}%`,
      icon: "Calendar",
    });
  }

  // ── High spend day ──
  if (daily.length > 0) {
    const peakDay = daily.reduce((a, b) =>
      a.estimatedCost > b.estimatedCost ? a : b
    );
    if (peakDay.estimatedCost > 50) {
      const dateStr = new Date(peakDay.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      insights.push({
        type: "high-spend-day",
        title: "Big Spender Day",
        description: `${dateStr} was your most expensive day at $${peakDay.estimatedCost.toFixed(0)} with ${peakDay.turnCount} turns.`,
        metric: `$${peakDay.estimatedCost.toFixed(0)}`,
        icon: "TrendingUp",
      });
    }
  }

  // ── Subagent heavy ──
  const subagentTurns = entries.filter((e) => e.isSubagent).length;
  const subagentPercent =
    entries.length > 0 ? (subagentTurns / entries.length) * 100 : 0;
  if (subagentPercent > 20) {
    insights.push({
      type: "subagent-heavy",
      title: "Delegation Master",
      description: `${subagentPercent.toFixed(0)}% of your turns are from subagents. You're leveraging parallel execution.`,
      metric: `${subagentPercent.toFixed(0)}%`,
      icon: "GitBranch",
    });
  }

  // ── Cache champion ──
  const totalCacheReads = entries.reduce((s, e) => s + e.cacheReadTokens, 0);
  const totalInput = entries.reduce(
    (s, e) => s + e.inputTokens + e.cacheReadTokens + e.cacheWriteTokens,
    0
  );
  const cacheRate = totalInput > 0 ? (totalCacheReads / totalInput) * 100 : 0;
  if (cacheRate > 60) {
    insights.push({
      type: "cache-champion",
      title: "Cache Champion",
      description: `${cacheRate.toFixed(0)}% of your input tokens come from cache. Your prompt patterns are cache-friendly.`,
      metric: `${cacheRate.toFixed(0)}%`,
      icon: "Database",
    });
  }

  return insights;
}
