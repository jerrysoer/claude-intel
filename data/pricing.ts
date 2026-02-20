// All prices in $ per 1M tokens

export interface ModelPricing {
  model: string;
  displayName: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M: number;
  cacheWritePer1M: number;
}

export interface ProviderInfo {
  id: string;
  displayName: string;
  color: string;
}

// ── Providers ──

export const providers: Record<string, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    displayName: "Anthropic",
    color: "#da7756",
  },
  openai: {
    id: "openai",
    displayName: "OpenAI",
    color: "#10a37f",
  },
  google: {
    id: "google",
    displayName: "Google",
    color: "#4285f4",
  },
  bytedance: {
    id: "bytedance",
    displayName: "ByteDance",
    color: "#25f4ee",
  },
};

// ── Anthropic pricing (source of truth for actual cost) ──

export const anthropicModels: ModelPricing[] = [
  {
    model: "claude-opus-4-6",
    displayName: "Opus 4.6",
    provider: "anthropic",
    inputPer1M: 15,
    outputPer1M: 75,
    cacheReadPer1M: 1.50,
    cacheWritePer1M: 18.75,
  },
  {
    model: "claude-opus-4-5-20251101",
    displayName: "Opus 4.5",
    provider: "anthropic",
    inputPer1M: 15,
    outputPer1M: 75,
    cacheReadPer1M: 1.50,
    cacheWritePer1M: 18.75,
  },
  {
    model: "claude-sonnet-4-5-20250929",
    displayName: "Sonnet 4.5",
    provider: "anthropic",
    inputPer1M: 3,
    outputPer1M: 15,
    cacheReadPer1M: 0.30,
    cacheWritePer1M: 3.75,
  },
  {
    model: "claude-haiku-4-5-20251001",
    displayName: "Haiku 4.5",
    provider: "anthropic",
    inputPer1M: 1,
    outputPer1M: 5,
    cacheReadPer1M: 0.10,
    cacheWritePer1M: 1.25,
  },
];

// ── Competitor pricing for "What If" comparisons ──
// Maps each Anthropic tier to the closest competitor equivalent

export interface CompetitorMapping {
  anthropicModel: string; // model ID pattern to match
  tier: "flagship" | "mid" | "small";
}

export const tierMappings: CompetitorMapping[] = [
  { anthropicModel: "claude-opus", tier: "flagship" },
  { anthropicModel: "claude-sonnet", tier: "mid" },
  { anthropicModel: "claude-haiku", tier: "small" },
];

export interface CompetitorTierPricing {
  provider: string;
  tier: "flagship" | "mid" | "small";
  model: string;
  displayName: string;
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M: number; // 0 = no cache pricing, use input price
  cacheWritePer1M: number;
}

export const competitorPricing: CompetitorTierPricing[] = [
  // OpenAI
  {
    provider: "openai",
    tier: "flagship",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    inputPer1M: 2,
    outputPer1M: 8,
    cacheReadPer1M: 0.50,
    cacheWritePer1M: 2, // same as input
  },
  {
    provider: "openai",
    tier: "mid",
    model: "gpt-4o",
    displayName: "GPT-4o",
    inputPer1M: 2.50,
    outputPer1M: 10,
    cacheReadPer1M: 1.25,
    cacheWritePer1M: 2.50,
  },
  {
    provider: "openai",
    tier: "small",
    model: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    cacheReadPer1M: 0.075,
    cacheWritePer1M: 0.15,
  },

  // Google
  {
    provider: "google",
    tier: "flagship",
    model: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    inputPer1M: 1.25,
    outputPer1M: 10,
    cacheReadPer1M: 0.315,
    cacheWritePer1M: 4.50,
  },
  {
    provider: "google",
    tier: "mid",
    model: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    inputPer1M: 1.25,
    outputPer1M: 10,
    cacheReadPer1M: 0.315,
    cacheWritePer1M: 4.50,
  },
  {
    provider: "google",
    tier: "small",
    model: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    cacheReadPer1M: 0.0375,
    cacheWritePer1M: 1.00,
  },

  // ByteDance (Seed)
  {
    provider: "bytedance",
    tier: "flagship",
    model: "seed-2.0-pro",
    displayName: "Seed 2.0 Pro",
    inputPer1M: 0.47,
    outputPer1M: 2.37,
    cacheReadPer1M: 0, // no cache tier — use input price
    cacheWritePer1M: 0,
  },
  {
    provider: "bytedance",
    tier: "mid",
    model: "seed-2.0-pro",
    displayName: "Seed 2.0 Pro",
    inputPer1M: 0.47,
    outputPer1M: 2.37,
    cacheReadPer1M: 0,
    cacheWritePer1M: 0,
  },
  {
    provider: "bytedance",
    tier: "small",
    model: "seed-2.0-lite",
    displayName: "Seed 2.0 Lite (est.)",
    inputPer1M: 0.10,
    outputPer1M: 0.30,
    cacheReadPer1M: 0,
    cacheWritePer1M: 0,
  },
];

// ── Helper: get tier for a model string ──

export function getModelTier(model: string): "flagship" | "mid" | "small" {
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "flagship";
  if (lower.includes("sonnet")) return "mid";
  if (lower.includes("haiku")) return "small";
  // Default unknown models to mid tier
  return "mid";
}

// ── Helper: get Anthropic pricing for a model ──

export function getAnthropicPricing(model: string): ModelPricing {
  const found = anthropicModels.find((m) => model.startsWith(m.model) || model === m.model);
  if (found) return found;

  // Fallback: match by tier keyword
  const tier = getModelTier(model);
  if (tier === "flagship") return anthropicModels[0]; // Opus
  if (tier === "small") return anthropicModels[3]; // Haiku
  return anthropicModels[2]; // Sonnet
}

// ── Helper: get display name for model ──

export function getModelDisplayName(model: string): string {
  const found = anthropicModels.find((m) => model.startsWith(m.model) || model === m.model);
  if (found) return found.displayName;

  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "Opus";
  if (lower.includes("sonnet")) return "Sonnet";
  if (lower.includes("haiku")) return "Haiku";
  return model;
}
