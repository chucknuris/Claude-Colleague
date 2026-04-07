import { describe, it, expect } from 'vitest';
import { calculateRoleComparison } from '../../src/calculators/role-comparison.js';
import type { ToolUseEvent } from '../../src/types.js';

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
  it('maps heavy Write usage to Senior Developer', () => {
    // 7 Write out of 10 total = 70% > 60% threshold
    const events = [...makeEvents('Write', 7), ...makeEvents('Edit', 3)];
    const result = calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Senior Developer');
  });

  it('maps heavy Bash usage to DevOps Engineer', () => {
    // 4 Bash out of 10 total = 40% > 30% threshold, but Write is only 2/10 = 20%
    const events = [...makeEvents('Bash', 4), ...makeEvents('Write', 2), ...makeEvents('Edit', 4)];
    const result = calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('DevOps Engineer');
  });

  it('maps Agent usage to Team Lead', () => {
    // Any Agent usage triggers Team Lead (checked first)
    const events = [...makeEvents('Write', 5), ...makeEvents('Agent', 1)];
    const result = calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Team Lead');
  });

  it('maps mixed usage to Full-Stack Developer', () => {
    // No single tool is dominant enough
    const events = [
      ...makeEvents('Write', 2),
      ...makeEvents('Edit', 2),
      ...makeEvents('Bash', 2),
      ...makeEvents('Read', 4),
    ];
    const result = calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Full-Stack Developer');
  });

  it('returns Full-Stack Developer for empty events', () => {
    const result = calculateRoleComparison(0, []);
    expect(result.dominantRole).toBe('Full-Stack Developer');
  });

  it('calculates FTE equivalents based on hours', () => {
    // monthlyHours = 20 * 8 = 160
    const result = calculateRoleComparison(160, []);
    expect(result.juniorEquiv).toBeCloseTo(1.0, 1);
    expect(result.midEquiv).toBeCloseTo(1.0, 1);
    expect(result.seniorEquiv).toBeCloseTo(1.0, 1);
  });

  it('returns 0 equivalents for zero hours', () => {
    const result = calculateRoleComparison(0, []);
    expect(result.juniorEquiv).toBe(0);
    expect(result.midEquiv).toBe(0);
    expect(result.seniorEquiv).toBe(0);
  });

  it('includes a summary string', () => {
    const result = calculateRoleComparison(160, makeEvents('Write', 10));
    expect(result.summary).toContain('Claude did the work of');
    expect(result.summary).toContain('developers');
  });

  it('includes a promotion joke', () => {
    const result = calculateRoleComparison(160, []);
    expect(result.promotionJoke).toContain('Staff Engineer');
    expect(result.promotionJoke).toContain('weeks');
  });

  it('maps heavy Edit usage to Mid-level Developer', () => {
    // 5 Edit out of 10 total = 50% > 40% threshold
    const events = [...makeEvents('Edit', 5), ...makeEvents('Read', 5)];
    const result = calculateRoleComparison(160, events);
    expect(result.dominantRole).toBe('Mid-level Developer');
  });
});
