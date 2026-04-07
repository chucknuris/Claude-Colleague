import type { DateFilter, DateRange } from '../types.js';

/**
 * Get a DateRange for the given filter keyword.
 *
 * - 'today'  start of today to end of today
 * - 'week'   start of Monday this week to end of today
 * - 'month'  start of this month to end of today
 * - 'all'    epoch to end of today
 */
export function getDateRange(filter: DateFilter): DateRange {
  const now = new Date();

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999,
  );

  let start: Date;

  switch (filter) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case 'week': {
      // getDay() returns 0 for Sunday; we want Monday = 0 offset
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'all': {
      start = new Date(0);
      break;
    }
  }

  return { start, end: endOfToday };
}

/**
 * Check whether a date string (ISO-8601 or YYYY-MM-DD) falls within the given range (inclusive).
 */
export function isInRange(dateStr: string, range: DateRange): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

/**
 * Get a DateRange covering yesterday-start to today-end (48-hour window for standup).
 */
export function getStandupDateRange(): DateRange {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999,
  );
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  return { start: startOfYesterday, end: endOfToday };
}

/**
 * Midnight boundary between "yesterday" and "today" (start of today in local time).
 */
export function getYesterdayBoundary(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
