import { readFile } from 'node:fs/promises';
import type { DateRange, DataError, ParseResult, StatsCache } from '../types.js';
import { STATS_CACHE } from '../utils/paths.js';
import { isInRange } from '../utils/date-filters.js';

/**
 * Parse ~/.claude/stats-cache.json, optionally filtering daily arrays by date range.
 */
export async function parseStatsCache(dateRange?: DateRange): Promise<ParseResult<StatsCache>> {
  const errors: DataError[] = [];

  // Read the file
  let raw: string;
  try {
    raw = await readFile(STATS_CACHE, 'utf-8');
  } catch {
    return {
      data: null,
      errors: [{
        source: STATS_CACHE,
        error: 'stats-cache.json not found — has Claude Code been used on this machine?',
        severity: 'fatal',
      }],
    };
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      data: null,
      errors: [{
        source: STATS_CACHE,
        error: 'stats-cache.json contains invalid JSON',
        severity: 'fatal',
      }],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      data: null,
      errors: [{
        source: STATS_CACHE,
        error: 'stats-cache.json is not a valid object',
        severity: 'fatal',
      }],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Build StatsCache with defaults for missing optional fields
  const warnIfMissing = (field: string): void => {
    if (!(field in obj)) {
      errors.push({
        source: STATS_CACHE,
        error: `Missing field "${field}", using default`,
        severity: 'warning',
      });
    }
  };

  warnIfMissing('dailyActivity');
  warnIfMissing('dailyModelTokens');
  warnIfMissing('totalSessions');
  warnIfMissing('totalMessages');

  let dailyActivity = Array.isArray(obj['dailyActivity'])
    ? (obj['dailyActivity'] as StatsCache['dailyActivity'])
    : [];

  let dailyModelTokens = Array.isArray(obj['dailyModelTokens'])
    ? (obj['dailyModelTokens'] as StatsCache['dailyModelTokens'])
    : [];

  // Filter by date range if provided
  if (dateRange) {
    dailyActivity = dailyActivity.filter(d => isInRange(d.date, dateRange));
    dailyModelTokens = dailyModelTokens.filter(d => isInRange(d.date, dateRange));
  }

  const statsCache: StatsCache = {
    version: typeof obj['version'] === 'number' ? obj['version'] : 0,
    lastComputedDate: typeof obj['lastComputedDate'] === 'string' ? obj['lastComputedDate'] : '',
    dailyActivity,
    dailyModelTokens,
    modelUsage: (typeof obj['modelUsage'] === 'object' && obj['modelUsage'] !== null
      ? obj['modelUsage']
      : {}) as StatsCache['modelUsage'],
    totalSessions: typeof obj['totalSessions'] === 'number' ? obj['totalSessions'] : 0,
    totalMessages: typeof obj['totalMessages'] === 'number' ? obj['totalMessages'] : 0,
    longestSession: (typeof obj['longestSession'] === 'object' && obj['longestSession'] !== null
      ? obj['longestSession']
      : { duration: 0, date: '', sessionId: '' }) as StatsCache['longestSession'],
    firstSessionDate: typeof obj['firstSessionDate'] === 'string' ? obj['firstSessionDate'] : '',
    hourCounts: (typeof obj['hourCounts'] === 'object' && obj['hourCounts'] !== null
      ? obj['hourCounts']
      : {}) as StatsCache['hourCounts'],
  };

  return { data: statsCache, errors };
}
