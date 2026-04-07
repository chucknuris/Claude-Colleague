import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatDuration, formatPercent } from '../../src/utils/format.js';

describe('formatCurrency', () => {
  it('formats a normal value', () => {
    expect(formatCurrency(47832)).toBe('$47,832.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a large value', () => {
    expect(formatCurrency(1_500_000)).toBe('$1,500,000.00');
  });

  it('formats a negative value', () => {
    // toLocaleString places the minus sign after the manually prepended $
    expect(formatCurrency(-123.45)).toBe('$-123.45');
  });

  it('formats a very small amount', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
  });

  it('rounds fractional cents', () => {
    expect(formatCurrency(9.999)).toBe('$10.00');
  });
});

describe('formatNumber', () => {
  it('formats a normal value', () => {
    expect(formatNumber(77184)).toBe('77,184');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats a large value', () => {
    expect(formatNumber(10_000_000)).toBe('10,000,000');
  });

  it('formats a negative value', () => {
    expect(formatNumber(-5000)).toBe('-5,000');
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(38_040_000)).toBe('10h 34m');
  });

  it('formats zero as 0m', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats minutes only when under an hour', () => {
    expect(formatDuration(300_000)).toBe('5m');
  });

  it('formats exact hours without minutes', () => {
    expect(formatDuration(7_200_000)).toBe('2h');
  });

  it('handles very large durations', () => {
    // 100 hours
    expect(formatDuration(360_000_000)).toBe('100h');
  });

  it('handles sub-minute durations as 0m', () => {
    expect(formatDuration(30_000)).toBe('0m');
  });
});

describe('formatPercent', () => {
  it('formats a normal percentage', () => {
    expect(formatPercent(5362)).toBe('5,362%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('formats a large percentage', () => {
    expect(formatPercent(100_000)).toBe('100,000%');
  });

  it('rounds fractional values', () => {
    expect(formatPercent(99.7)).toBe('100%');
  });

  it('formats negative percentages', () => {
    expect(formatPercent(-50)).toBe('-50%');
  });
});
