import { describe, it, expect } from 'vitest';
import { calculateProductivity } from '../../src/calculators/productivity.js';
import type { ToolUseEvent } from '../../src/types.js';

function makeEvent(overrides: Partial<ToolUseEvent> = {}): ToolUseEvent {
  return {
    toolName: 'Write',
    filePath: '/src/app.ts',
    linesWritten: 50,
    linesChanged: 0,
    fileExtension: '.ts',
    timestamp: '2026-04-07T10:00:00Z',
    ...overrides,
  };
}

describe('calculateProductivity', () => {
  it('calculates lines written from Write events', () => {
    const events = [makeEvent({ linesWritten: 100, linesChanged: 0 })];
    const result = calculateProductivity(events);
    expect(result.linesWritten).toBe(100);
    expect(result.filesModified).toBe(1);
  });

  it('calculates lines from Edit events', () => {
    const events = [
      makeEvent({ toolName: 'Edit', linesWritten: 0, linesChanged: 25 }),
    ];
    const result = calculateProductivity(events);
    expect(result.linesWritten).toBe(25);
  });

  it('combines Write and Edit lines', () => {
    const events = [
      makeEvent({ linesWritten: 50, linesChanged: 0 }),
      makeEvent({ toolName: 'Edit', linesWritten: 0, linesChanged: 30, filePath: '/src/other.ts' }),
    ];
    const result = calculateProductivity(events);
    expect(result.linesWritten).toBe(80);
    expect(result.filesModified).toBe(2);
  });

  it('returns zeros for empty events', () => {
    const result = calculateProductivity([]);
    expect(result.linesWritten).toBe(0);
    expect(result.filesModified).toBe(0);
    expect(result.complexityScore).toBe(0);
    expect(result.humanHoursEquivalent).toBe(0);
  });

  it('applies 0.8x multiplier for test files', () => {
    const events = [
      makeEvent({
        filePath: '/src/app.test.ts',
        fileExtension: '.ts',
        linesWritten: 100,
        linesChanged: 0,
      }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBeCloseTo(80, 0);
  });

  it('applies 0.5x multiplier for config/json files', () => {
    const events = [
      makeEvent({
        filePath: '/config.json',
        fileExtension: '.json',
        linesWritten: 100,
        linesChanged: 0,
      }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBeCloseTo(50, 0);
  });

  it('applies 1.2x multiplier for frontend files', () => {
    const events = [
      makeEvent({
        filePath: '/src/App.tsx',
        fileExtension: '.tsx',
        linesWritten: 100,
        linesChanged: 0,
      }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBeCloseTo(120, 0);
  });

  it('applies 1.3x multiplier for infra yaml files', () => {
    const events = [
      makeEvent({
        filePath: '/infra/deploy.yml',
        fileExtension: '.yml',
        linesWritten: 100,
        linesChanged: 0,
      }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBeCloseTo(130, 0);
  });

  it('applies 1.3x multiplier for Dockerfile', () => {
    const events = [
      makeEvent({
        filePath: '/Dockerfile',
        fileExtension: '',
        linesWritten: 100,
        linesChanged: 0,
      }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBeCloseTo(130, 0);
  });

  it('calculates human hours equivalent', () => {
    // 400 lines * 1.0 complexity / 150 lines-per-day * 8 hours-per-day ≈ 21.3 hours
    const events = [makeEvent({ linesWritten: 400, linesChanged: 0 })];
    const result = calculateProductivity(events);
    expect(result.humanHoursEquivalent).toBeCloseTo(21.3, 0);
  });

  it('tracks file breakdown correctly', () => {
    const events = [
      makeEvent({ filePath: '/a.ts', linesWritten: 10, linesChanged: 0 }),
      makeEvent({ filePath: '/a.ts', linesWritten: 20, linesChanged: 0 }),
      makeEvent({ filePath: '/b.ts', linesWritten: 5, linesChanged: 0 }),
    ];
    const result = calculateProductivity(events);
    expect(result.fileBreakdown['/a.ts']).toBe(30);
    expect(result.fileBreakdown['/b.ts']).toBe(5);
  });

  it('uses default multiplier when filePath is undefined', () => {
    const events = [
      makeEvent({ filePath: undefined, fileExtension: undefined, linesWritten: 100, linesChanged: 0 }),
    ];
    const result = calculateProductivity(events);
    expect(result.complexityScore).toBe(100);
    expect(result.filesModified).toBe(0);
  });
});
