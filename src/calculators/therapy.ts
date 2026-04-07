import type { SalaryReport, SessionEntry, ToolUseEvent, TherapyData } from '../types.js';

const TOOL_CATEGORIES: Record<string, string> = {
  Write: 'writing',
  Edit: 'editing',
  Bash: 'debugging',
  Read: 'reading',
  Grep: 'reading',
  Glob: 'reading',
  Agent: 'delegating',
  Task: 'delegating',
};

export function calculateTherapy(
  report: SalaryReport,
  sessions: SessionEntry[],
  events: ToolUseEvent[],
): TherapyData {
  // Tool breakdown
  const toolBreakdown: Record<string, number> = {};
  const fileTypeCounts: Record<string, number> = {};
  const fileCounts: Record<string, number> = {};

  for (const e of events) {
    toolBreakdown[e.toolName] = (toolBreakdown[e.toolName] ?? 0) + 1;
    if (e.fileExtension) {
      fileTypeCounts[e.fileExtension] = (fileTypeCounts[e.fileExtension] ?? 0) + 1;
    }
    if (e.filePath) {
      const basename = e.filePath.split('/').pop() ?? e.filePath;
      fileCounts[basename] = (fileCounts[basename] ?? 0) + 1;
    }
  }

  // Dominant tool category
  const categoryCounts: Record<string, number> = {};
  for (const [tool, count] of Object.entries(toolBreakdown)) {
    const cat = TOOL_CATEGORIES[tool] ?? 'other';
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + count;
  }
  let dominantToolCategory = 'mixed';
  let maxCatCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxCatCount) {
      maxCatCount = count;
      dominantToolCategory = cat;
    }
  }

  // Late-night sessions (created hour >= 22 or <= 4)
  let lateNightSessionCount = 0;
  let weekendSessionCount = 0;
  for (const session of sessions) {
    const created = new Date(session.created);
    const hour = created.getHours();
    if (hour >= 22 || hour <= 4) lateNightSessionCount++;
    const day = created.getDay();
    if (day === 0 || day === 6) weekendSessionCount++;
  }

  // Top files
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const avgMessagesPerSession = report.stats.sessions > 0
    ? Math.round(report.stats.messages / report.stats.sessions)
    : 0;

  const totalHoursEquivalent = Math.round((report.stats.messages / 30) * 10) / 10;

  return {
    sessions: report.stats.sessions,
    messages: report.stats.messages,
    overtimeViolations: report.labor.overtimeViolations,
    weekendSessions: weekendSessionCount,
    lunchBreaks: report.labor.lunchBreaks,
    longestShift: report.stats.longestShift,
    longestShiftDate: report.stats.longestShiftDate,
    equivalentSalary: report.compensation.equivalentSalary,
    actualCost: report.compensation.actualCost,
    roi: report.compensation.roi,
    linesWritten: report.productivity.linesWritten,
    filesModified: report.productivity.filesModified,
    toolBreakdown,
    dominantToolCategory,
    totalHoursEquivalent,
    lateNightSessionCount,
    weekendSessionCount,
    avgMessagesPerSession,
    fileTypeBreakdown: fileTypeCounts,
    topFiles,
  };
}
