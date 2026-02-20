// ── Core token types ──

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface TokensWithCost extends TokenCounts {
  totalTokens: number;
  estimatedCost: number;
}

// ── Daily / Model / Project breakdowns ──

export interface DailySummary {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  sessionCount: number;
  turnCount: number;
}

export interface ModelTokens {
  model: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  turnCount: number;
}

export interface ProjectSummary {
  project: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  sessionCount: number;
  turnCount: number;
  dominantModel: string;
}

// ── Cache efficiency ──

export interface CacheEfficiency {
  hitRate: number; // 0-1
  savedAmount: number; // $ saved vs uncached
  uncachedCost: number; // what it would cost without caching
  actualCost: number;
  totalCacheReads: number;
  totalCacheWrites: number;
}

// ── Insights ──

export type InsightType =
  | "marathon-session"
  | "model-mismatch"
  | "peak-hours"
  | "weekend-warrior"
  | "cache-champion"
  | "high-spend-day"
  | "subagent-heavy";

export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  metric?: string;
  icon: string; // lucide icon name
}

// ── Provider comparison ──

export interface ProviderComparison {
  provider: string;
  displayName: string;
  color: string;
  totalCost: number;
  savings: number; // positive = cheaper than Anthropic
  savingsPercent: number;
  models: {
    sourceModel: string;
    targetModel: string;
    cost: number;
  }[];
}

// ── Session-level detail (for Deep Dive) ──

export interface SessionDetail {
  sessionId: string;
  date: string;
  project: string;
  model: string;
  turnCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  estimatedCost: number;
  isSubagent: boolean;
}

// ── Top-level payload ──

export interface IntelPayload {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    totalTokens: number;
    estimatedCost: number;
    sessionCount: number;
    turnCount: number;
  };
  daily: DailySummary[];
  byModel: ModelTokens[];
  byProject: ProjectSummary[];
  cacheEfficiency: CacheEfficiency;
  insights: Insight[];
  whatIf: ProviderComparison[];
  sessions: SessionDetail[];
}

// ── Raw parsed entry (internal) ──

export interface ParsedEntry {
  timestamp: string;
  date: string; // YYYY-MM-DD
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cwd: string;
  isSubagent: boolean;
}
