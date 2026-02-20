import {
  getAnthropicPricing,
  getModelTier,
  competitorPricing,
  providers,
} from "../data/pricing";
import type { TokenCounts, ProviderComparison, ModelTokens } from "../data/types";

/**
 * Calculate actual Anthropic cost for a set of tokens on a given model.
 */
export function calculateActualCost(
  tokens: TokenCounts,
  model: string
): number {
  const pricing = getAnthropicPricing(model);

  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.outputPer1M;
  const cacheReadCost =
    (tokens.cacheReadTokens / 1_000_000) * pricing.cacheReadPer1M;
  const cacheWriteCost =
    (tokens.cacheWriteTokens / 1_000_000) * pricing.cacheWritePer1M;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/**
 * Calculate "What If" cost: re-price tokens across all competitor providers.
 * For each provider, maps each Anthropic model tier to the competitor equivalent.
 */
export function calculateWhatIf(
  byModel: ModelTokens[]
): ProviderComparison[] {
  const actualTotal = byModel.reduce((sum, m) => sum + m.estimatedCost, 0);
  const providerIds = ["openai", "google", "bytedance"];

  return providerIds.map((providerId) => {
    const providerInfo = providers[providerId];
    const models: ProviderComparison["models"] = [];
    let totalCost = 0;

    for (const modelEntry of byModel) {
      const tier = getModelTier(modelEntry.model);
      const competitor = competitorPricing.find(
        (c) => c.provider === providerId && c.tier === tier
      );

      if (!competitor) continue;

      // If competitor has no cache pricing, treat cache reads as full input
      const effectiveCacheReadPrice =
        competitor.cacheReadPer1M > 0
          ? competitor.cacheReadPer1M
          : competitor.inputPer1M;
      const effectiveCacheWritePrice =
        competitor.cacheWritePer1M > 0
          ? competitor.cacheWritePer1M
          : competitor.inputPer1M;

      const cost =
        (modelEntry.inputTokens / 1_000_000) * competitor.inputPer1M +
        (modelEntry.outputTokens / 1_000_000) * competitor.outputPer1M +
        (modelEntry.cacheReadTokens / 1_000_000) * effectiveCacheReadPrice +
        (modelEntry.cacheWriteTokens / 1_000_000) * effectiveCacheWritePrice;

      totalCost += cost;
      models.push({
        sourceModel: modelEntry.displayName,
        targetModel: competitor.displayName,
        cost,
      });
    }

    const savings = actualTotal - totalCost;
    const savingsPercent =
      actualTotal > 0 ? (savings / actualTotal) * 100 : 0;

    return {
      provider: providerId,
      displayName: providerInfo.displayName,
      color: providerInfo.color,
      totalCost,
      savings,
      savingsPercent,
      models,
    };
  });
}
