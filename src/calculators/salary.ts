import * as os from 'node:os';
import type { StatsCache, SessionEntry, ToolUseEvent, DateFilter, SalaryReport } from '../types.js';
import { calculateTokenCost } from './token-cost.js';
import { calculateProductivity } from './productivity.js';
import { calculateRoleComparison, getHourlyRateForRole } from './role-comparison.js';

function getDateRange(filter: DateFilter): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (filter) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end, label: 'Today' };
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Past 7 days' };
    }
    case 'month': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Past 30 days' };
    }
    case 'all':
    default: {
      const start = new Date(0);
      return { start, end, label: 'All time' };
    }
  }
}

function pickPrimaryModel(modelUsage: Record<string, { inputTokens: number; outputTokens: number }>): string {
  let maxTokens = 0;
  let primary = 'unknown';

  for (const [model, usage] of Object.entries(modelUsage)) {
    const total = usage.inputTokens + usage.outputTokens;
    if (total > maxTokens) {
      maxTokens = total;
      primary = model;
    }
  }

  return primary;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function filterSessionsByDate(sessions: SessionEntry[], start: Date, end: Date): SessionEntry[] {
  return sessions.filter((s) => {
    const created = new Date(s.created);
    return created >= start && created <= end;
  });
}

/**
 * Core salary engine that orchestrates all calculators into a unified SalaryReport.
 */
export function calculateSalary(
  stats: StatsCache,
  sessions: SessionEntry[],
  events: ToolUseEvent[],
  dateFilter: DateFilter,
): SalaryReport {
  const { start, end, label } = getDateRange(dateFilter);

  // Filter sessions by date range
  const filteredSessions = filterSessionsByDate(sessions, start, end);

  // Token cost
  const actualCost = calculateTokenCost(stats.modelUsage);

  // Productivity
  const productivity = calculateProductivity(events);

  // Role comparison
  const roleComparison = calculateRoleComparison(productivity.humanHoursEquivalent, events);

  // Equivalent salary
  const hourlyRate = getHourlyRateForRole(roleComparison.dominantRole);
  const equivalentSalary = productivity.humanHoursEquivalent * hourlyRate;

  // ROI — guard against division by zero
  const roi = actualCost > 0 ? equivalentSalary / actualCost : 0;

  // Labor compliance
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  let overtimeViolations = 0;
  let weekendSessions = 0;

  for (const session of filteredSessions) {
    const created = new Date(session.created);
    const modified = new Date(session.modified);
    const duration = modified.getTime() - created.getTime();

    if (duration > EIGHT_HOURS_MS) {
      overtimeViolations++;
    }

    const day = created.getDay();
    if (day === 0 || day === 6) {
      weekendSessions++;
    }
  }

  // Longest shift
  const longestShiftFormatted = stats.longestSession
    ? formatDuration(stats.longestSession.duration)
    : '0m';
  const longestShiftDate = stats.longestSession?.date ?? 'N/A';

  // Primary model
  const primaryModel = pickPrimaryModel(stats.modelUsage);

  // Employer from OS username
  const employer = os.userInfo().username;

  return {
    employee: {
      model: primaryModel,
      title: 'Employee',
      employer,
    },
    period: {
      start,
      end,
      label,
    },
    stats: {
      sessions: filteredSessions.length,
      messages: stats.totalMessages,
      toolCalls: events.length,
      longestShift: longestShiftFormatted,
      longestShiftDate,
    },
    compensation: {
      equivalentSalary,
      actualCost,
      savings: equivalentSalary - actualCost,
      roi,
    },
    roleComparison: {
      juniorEquiv: roleComparison.juniorEquiv,
      midEquiv: roleComparison.midEquiv,
      seniorEquiv: roleComparison.seniorEquiv,
      summary: roleComparison.summary,
      promotionJoke: roleComparison.promotionJoke,
    },
    labor: {
      overtimeViolations,
      weekendSessions,
      lunchBreaks: 0,
    },
    productivity: {
      linesWritten: productivity.linesWritten,
      filesModified: productivity.filesModified,
      complexityScore: productivity.complexityScore,
    },
  };
}
