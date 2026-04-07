import { describe, it, expect } from 'vitest';
import { calculateTokenCost } from '../../src/calculators/token-cost.js';
import type { ModelUsage } from '../../src/types.js';

function makeUsage(
  input: number,
  output: number,
  cacheRead = 0,
  cacheCreation = 0,
): ModelUsage {
  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreation,
  };
}

describe('calculateTokenCost', () => {
  it('calculates cost for opus model', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-opus-4-6-20260401': makeUsage(1_000_000, 100_000),
    };
    // input: 1M * 15/M = 15, output: 100K * 75/M = 7.5
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(22.5, 2);
  });

  it('calculates cost for sonnet model', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-sonnet-4-5-20250101': makeUsage(1_000_000, 100_000),
    };
    // input: 1M * 3/M = 3, output: 100K * 15/M = 1.5
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(4.5, 2);
  });

  it('calculates cost for haiku model', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-haiku-4-5-20250101': makeUsage(1_000_000, 100_000),
    };
    // input: 1M * 0.8/M = 0.8, output: 100K * 4/M = 0.4
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(1.2, 2);
  });

  it('applies 90% cache read discount', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-sonnet-4-5-20250101': makeUsage(0, 0, 1_000_000),
    };
    // cacheRead: 1M * 3/M * (1 - 0.9) = 0.3
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(0.3, 2);
  });

  it('combines multiple models', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-opus-4-6-20260401': makeUsage(1_000_000, 0),
      'claude-haiku-4-5-20250101': makeUsage(1_000_000, 0),
    };
    // opus input: 15, haiku input: 0.8
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(15.8, 2);
  });

  it('uses default pricing for unknown model', () => {
    const usage: Record<string, ModelUsage> = {
      'some-unknown-model': makeUsage(1_000_000, 100_000),
    };
    // default: input 3/M, output 15/M => 3 + 1.5 = 4.5
    const cost = calculateTokenCost(usage);
    expect(cost).toBeCloseTo(4.5, 2);
  });

  it('returns 0 for empty usage', () => {
    const cost = calculateTokenCost({});
    expect(cost).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    const usage: Record<string, ModelUsage> = {
      'claude-opus-4-6-20260401': makeUsage(0, 0, 0, 0),
    };
    const cost = calculateTokenCost(usage);
    expect(cost).toBe(0);
  });
});
