import type { ModelUsage, ModelPricing, DailyModelTokens, DateRange } from '../types.js';

const MODEL_PRICING: { prefix: string; pricing: ModelPricing }[] = [
  {
    prefix: 'claude-opus-4-6',
    pricing: { inputPerMillion: 15, outputPerMillion: 75, cacheReadDiscount: 0.9 },
  },
  {
    prefix: 'claude-opus-4-5',
    pricing: { inputPerMillion: 15, outputPerMillion: 75, cacheReadDiscount: 0.9 },
  },
  {
    prefix: 'claude-sonnet-4-6',
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheReadDiscount: 0.9 },
  },
  {
    prefix: 'claude-sonnet-4-5',
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheReadDiscount: 0.9 },
  },
  {
    prefix: 'claude-haiku-4-5',
    pricing: { inputPerMillion: 0.8, outputPerMillion: 4, cacheReadDiscount: 0.9 },
  },
];

const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheReadDiscount: 0.9,
};

function getPricing(modelName: string): ModelPricing {
  for (const entry of MODEL_PRICING) {
    if (modelName.startsWith(entry.prefix)) {
      return entry.pricing;
    }
  }
  return DEFAULT_PRICING;
}

function computeCost(tokens: ModelUsage, pricing: ModelPricing): number {
  const inputCost = tokens.inputTokens * pricing.inputPerMillion;
  const outputCost = tokens.outputTokens * pricing.outputPerMillion;
  const cacheReadCost =
    tokens.cacheReadInputTokens * pricing.inputPerMillion * (1 - pricing.cacheReadDiscount);
  return (inputCost + outputCost + cacheReadCost) / 1_000_000;
}

/**
 * Calculate total API cost from aggregated model usage data.
 */
export function calculateTokenCost(modelUsage: Record<string, ModelUsage>): number {
  let total = 0;
  for (const [model, usage] of Object.entries(modelUsage)) {
    total += computeCost(usage, getPricing(model));
  }
  return total;
}

/**
 * Calculate API cost from daily token breakdowns, optionally filtered by date range.
 */
export function calculateDailyTokenCost(
  dailyModelTokens: DailyModelTokens[],
  dateRange?: DateRange,
): number {
  let total = 0;

  for (const day of dailyModelTokens) {
    if (dateRange) {
      const dayDate = new Date(day.date);
      if (dayDate < dateRange.start || dayDate > dateRange.end) {
        continue;
      }
    }

    for (const [model, tokens] of Object.entries(day.models)) {
      const usage: ModelUsage = {
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        cacheReadInputTokens: tokens.cacheReadInputTokens,
        cacheCreationInputTokens: tokens.cacheCreationInputTokens,
      };
      total += computeCost(usage, getPricing(model));
    }
  }

  return total;
}
