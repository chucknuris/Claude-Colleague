import * as os from 'node:os';
import type { StatsCache, SessionEntry, ToolUseEvent, DateFilter, SalaryReport } from '../types.js';
import { getDateRange } from '../utils/date-filters.js';
import { formatDuration } from '../utils/format.js';
import { calculateTokenCost, calculateDailyTokenCost } from './token-cost.js';
import { calculateProductivity } from './productivity.js';
import { calculateRoleComparison, getHourlyRateForRole } from './role-comparison.js';

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  all: 'All time',
};

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
  const { start, end } = getDateRange(dateFilter);
  const label = DATE_FILTER_LABELS[dateFilter];

  // Filter sessions by date range
  const filteredSessions = filterSessionsByDate(sessions, start, end);

  // Sum messages from filtered daily activity (not all-time total)
  const filteredMessages = dateFilter === 'all'
    ? stats.totalMessages
    : stats.dailyActivity.reduce((sum, day) => {
        const d = new Date(day.date);
        return d >= start && d <= end ? sum + day.messageCount : sum;
      }, 0);

  // Token cost — use daily breakdown for filtered periods, global for all-time
  const actualCost = dateFilter === 'all'
    ? calculateTokenCost(stats.modelUsage)
    : calculateDailyTokenCost(stats.dailyModelTokens, { start, end });

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

  // Longest shift — compute from filtered sessions, fall back to global stat for all-time
  let longestShiftFormatted: string;
  let longestShiftDate: string;

  if (dateFilter === 'all' && stats.longestSession && stats.longestSession.duration > 0) {
    longestShiftFormatted = formatDuration(stats.longestSession.duration);
    longestShiftDate = stats.longestSession.date ?? 'N/A';
  } else {
    let maxDuration = 0;
    let maxDate = 'N/A';
    for (const session of filteredSessions) {
      const created = new Date(session.created);
      const modified = new Date(session.modified);
      const duration = modified.getTime() - created.getTime();
      if (duration > maxDuration) {
        maxDuration = duration;
        maxDate = session.created.split('T')[0] ?? 'N/A';
      }
    }
    longestShiftFormatted = maxDuration > 0 ? formatDuration(maxDuration) : '0m';
    longestShiftDate = maxDate;
  }

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
      messages: filteredMessages,
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
