import { describe, it, expect, vi } from 'vitest';
import { calculateRoleComparison } from '../../src/calculators/role-comparison.js';
import type { ToolUseEvent } from '../../src/types.js';

// Mock Claude CLI to always return null (use fallback templates in tests)
vi.mock('../../src/utils/claude-cli.js', () => ({
  callClaude: vi.fn().mockResolvedValue(null),
  callClaudeJson: vi.fn().mockResolvedValue(null),
  isClaudeAvailable: vi.fn().mockResolvedValue(false),
}));

function makeEvent(toolName: string): ToolUseEvent {
  return {
    toolName,
    filePath: '/src/file.ts',
    linesWritten: 10,
    linesChanged: 0,
    fileExtension: '.ts',
    timestamp: '2026-04-07T10:00:00Z',
  };
}

function makeEvents(toolName: string, count: number): ToolUseEvent[] {
  return Array.from({ length: count }, () => makeEvent(toolName));
}

describe('calculateRoleComparison', () => {
  it('maps heavy Write usage to Senior Developer', async () => {
    const events = [...makeEvents('Write', 7), ...makeEvents('Edit', 3)];
    const result = await calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Senior Developer');
  });

  it('maps heavy Bash usage to DevOps Engineer', async () => {
    const events = [...makeEvents('Bash', 4), ...makeEvents('Write', 2), ...makeEvents('Edit', 4)];
    const result = await calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('DevOps Engineer');
  });

  it('maps Agent usage to Team Lead', async () => {
    const events = [...makeEvents('Write', 5), ...makeEvents('Agent', 1)];
    const result = await calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Team Lead');
  });

  it('maps mixed usage to Full-Stack Developer', async () => {
    const events = [
      ...makeEvents('Write', 2),
      ...makeEvents('Edit', 2),
      ...makeEvents('Bash', 2),
      ...makeEvents('Read', 4),
    ];
    const result = await calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Full-Stack Developer');
  });

  it('returns Full-Stack Developer for empty events', async () => {
    const result = await calculateRoleComparison(0, []);
    expect(result.dominantRole).toBe('Full-Stack Developer');
  });

  it('calculates FTE equivalents based on hours', async () => {
    const result = await calculateRoleComparison(160, []);
    expect(result.juniorEquiv).toBeCloseTo(1.0, 1);
    expect(result.midEquiv).toBeCloseTo(0.67, 1);
    expect(result.seniorEquiv).toBeCloseTo(0.5, 1);
  });

  it('returns 0 equivalents for zero hours', async () => {
    const result = await calculateRoleComparison(0, []);
    expect(result.juniorEquiv).toBe(0);
    expect(result.midEquiv).toBe(0);
    expect(result.seniorEquiv).toBe(0);
  });

  it('includes a summary string', async () => {
    const result = await calculateRoleComparison(160, makeEvents('Write', 10));
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('includes a promotion joke', async () => {
    const result = await calculateRoleComparison(160, []);
    expect(result.promotionJoke).toBeTruthy();
    expect(typeof result.promotionJoke).toBe('string');
    expect(result.promotionJoke.length).toBeGreaterThan(10);
  });

  it('maps heavy Edit usage to Mid-level Developer', async () => {
    const events = [...makeEvents('Edit', 5), ...makeEvents('Read', 5)];
    const result = await calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Mid-level Developer');
  });
});
