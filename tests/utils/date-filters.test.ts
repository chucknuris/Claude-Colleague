import { describe, it, expect } from 'vitest';
import { getDateRange, isInRange } from '../../src/utils/date-filters.js';

describe('getDateRange', () => {
  it('returns start of today for "today" filter', () => {
    const range = getDateRange('today');
    const now = new Date();
    expect(range.start.getFullYear()).toBe(now.getFullYear());
    expect(range.start.getMonth()).toBe(now.getMonth());
    expect(range.start.getDate()).toBe(now.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.start.getSeconds()).toBe(0);
  });

  it('returns end of today for "today" filter', () => {
    const range = getDateRange('today');
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getSeconds()).toBe(59);
  });

  it('returns a Monday start for "week" filter', () => {
    const range = getDateRange('week');
    // The start should be a Monday (day 1)
    expect(range.start.getDay()).toBe(1);
  });

  it('returns first of month for "month" filter', () => {
    const range = getDateRange('month');
    expect(range.start.getDate()).toBe(1);
  });

  it('returns epoch for "all" filter', () => {
    const range = getDateRange('all');
    expect(range.start.getTime()).toBe(0);
  });

  it('end date is always end of today regardless of filter', () => {
    for (const filter of ['today', 'week', 'month', 'all'] as const) {
      const range = getDateRange(filter);
      const now = new Date();
      expect(range.end.getDate()).toBe(now.getDate());
      expect(range.end.getHours()).toBe(23);
      expect(range.end.getMinutes()).toBe(59);
    }
  });
});

describe('isInRange', () => {
  const range = {
    start: new Date('2026-04-01T00:00:00'),
    end: new Date('2026-04-07T23:59:59.999'),
  };

  it('returns true for a date within range', () => {
    expect(isInRange('2026-04-03', range)).toBe(true);
  });

  it('returns true for start boundary', () => {
    expect(isInRange('2026-04-01T00:00:00', range)).toBe(true);
  });

  it('returns true for end boundary', () => {
    expect(isInRange('2026-04-07T23:59:59', range)).toBe(true);
  });

  it('returns false for a date before range', () => {
    expect(isInRange('2026-03-31', range)).toBe(false);
  });

  it('returns false for a date after range', () => {
    expect(isInRange('2026-04-08', range)).toBe(false);
  });

  it('handles ISO timestamps', () => {
    expect(isInRange('2026-04-05T14:30:00Z', range)).toBe(true);
  });

  it('returns false for invalid date strings', () => {
    expect(isInRange('not-a-date', range)).toBe(false);
    expect(isInRange('', range)).toBe(false);
  });

  it('handles midnight edge case', () => {
    const midnightRange = {
      start: new Date('2026-01-01T00:00:00'),
      end: new Date('2026-01-01T23:59:59.999'),
    };
    expect(isInRange('2026-01-01T00:00:00', midnightRange)).toBe(true);
    expect(isInRange('2026-01-01T23:59:59', midnightRange)).toBe(true);
  });

  it('handles year boundary', () => {
    const yearRange = {
      start: new Date('2025-12-31T00:00:00'),
      end: new Date('2026-01-02T23:59:59.999'),
    };
    expect(isInRange('2025-12-31', yearRange)).toBe(true);
    expect(isInRange('2026-01-01', yearRange)).toBe(true);
    expect(isInRange('2025-12-30', yearRange)).toBe(false);
  });
});
