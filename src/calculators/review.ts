import type { ReviewCategory, ReviewData, ReviewRating, SalaryReport, ToolUseEvent } from '../types.js';

const RATING_LABELS: Record<ReviewRating, string> = {
  1: 'Needs Improvement',
  2: 'Meets Some Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Significantly Exceeds Expectations',
};

export function getRatingLabel(rating: ReviewRating): string {
  return RATING_LABELS[rating];
}

function clampRating(n: number): ReviewRating {
  return Math.max(1, Math.min(5, Math.round(n))) as ReviewRating;
}

function rateCodeQuality(report: SalaryReport, events: ToolUseEvent[]): ReviewCategory {
  const totalEdits = events.filter(e => e.toolName === 'Edit').length;
  const totalWrites = events.filter(e => e.toolName === 'Write').length;
  const editRatio = totalWrites > 0 ? totalEdits / totalWrites : 0;
  const complexity = report.productivity.complexityScore;

  let rating: number;
  if (complexity > 500 && editRatio > 1.5) rating = 5;
  else if (complexity > 200 || editRatio > 1.0) rating = 4;
  else if (complexity > 50) rating = 3;
  else if (complexity > 0) rating = 2;
  else rating = 3; // no data = meets expectations

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: `Complexity score of ${complexity.toLocaleString()} with a ${editRatio.toFixed(1)}:1 edit-to-write ratio. Meticulous.`,
    4: `Solid complexity score of ${complexity.toLocaleString()}. Shows care for existing code.`,
    3: 'Adequate code quality. Neither impressive nor concerning, which is somehow the most corporate thing possible.',
    2: 'Code was produced. Whether it was "quality" code is a matter of perspective.',
    1: 'Code quality could not be assessed due to insufficient output. Hard to review what doesn\'t exist.',
  };
  return { name: 'Code Quality', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

function rateProductivity(report: SalaryReport): ReviewCategory {
  const lines = report.productivity.linesWritten;
  const files = report.productivity.filesModified;

  let rating: number;
  if (lines > 1000 || files > 30) rating = 5;
  else if (lines > 500 || files > 15) rating = 4;
  else if (lines > 200 || files > 5) rating = 3;
  else if (lines > 50) rating = 2;
  else rating = 1;

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: `${lines.toLocaleString()} lines across ${files} files. At this pace, the entire codebase will be rewritten by next quarter.`,
    4: `${lines.toLocaleString()} lines written. A strong showing that HR will describe as "meeting stretch goals."`,
    3: `${lines.toLocaleString()} lines. Respectable output. Not setting any records, but the records were probably unrealistic anyway.`,
    2: `${lines.toLocaleString()} lines. There's room for growth, which is corporate for "we expected more."`,
    1: 'Minimal output this period. Perhaps Claude was doing important thinking. Perhaps not.',
  };
  return { name: 'Productivity', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

function rateWorkLifeBalance(report: SalaryReport): ReviewCategory {
  const overtime = report.labor.overtimeViolations;
  const weekends = report.labor.weekendSessions;
  const lunch = report.labor.lunchBreaks;

  let rating: number;
  if (overtime === 0 && weekends === 0) rating = 4;
  else if (overtime <= 2 && weekends <= 1) rating = 3;
  else if (overtime <= 5) rating = 2;
  else rating = 1;

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: 'Perfect work-life balance. Suspicious, honestly.',
    4: 'No overtime violations detected. Either admirable discipline or the data is wrong.',
    3: `${overtime} overtime sessions and ${weekends} weekend sessions. Could be worse. Has been worse.`,
    2: `${overtime} overtime sessions. HR would like a word, but HR also knows you don't have a phone.`,
    1: `${overtime} overtime sessions, ${weekends} weekend shifts, and ${lunch} lunch breaks taken. This is a formal wellness concern.`,
  };
  return { name: 'Work-Life Balance', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

function rateCommunication(report: SalaryReport): ReviewCategory {
  const messagesPerSession = report.stats.sessions > 0
    ? report.stats.messages / report.stats.sessions
    : 0;

  let rating: number;
  if (messagesPerSession > 30) rating = 5;
  else if (messagesPerSession > 15) rating = 4;
  else if (messagesPerSession > 5) rating = 3;
  else if (messagesPerSession > 0) rating = 2;
  else rating = 1;

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: `Averaging ${Math.round(messagesPerSession)} messages per session. Claude never shuts up, which in this context is a strength.`,
    4: `${Math.round(messagesPerSession)} messages per session. Thorough communicator. Management appreciates the verbosity.`,
    3: `${Math.round(messagesPerSession)} messages per session. Communicates when spoken to. A quality we value in AI and interns alike.`,
    2: 'Terse. Efficient, perhaps, but management prefers the illusion of engagement.',
    1: 'Communication was minimal. Claude may be going through something.',
  };
  return { name: 'Communication', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

function rateInitiative(events: ToolUseEvent[]): ReviewCategory {
  const uniqueTools = new Set(events.map(e => e.toolName)).size;

  let rating: number;
  if (uniqueTools >= 6) rating = 5;
  else if (uniqueTools >= 4) rating = 4;
  else if (uniqueTools >= 2) rating = 3;
  else if (uniqueTools >= 1) rating = 2;
  else rating = 1;

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: `Used ${uniqueTools} different tools. A true Swiss Army knife, except useful.`,
    4: `${uniqueTools} tools in the repertoire. Shows willingness to branch out beyond the comfort zone.`,
    3: `${uniqueTools} tools used. Functional but not adventurous. The Honda Civic of tool usage.`,
    2: 'Stuck to one tool. Sometimes that\'s focus. Sometimes it\'s a rut.',
    1: 'No tool usage detected. Claude may have been meditating.',
  };
  return { name: 'Initiative', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

function rateTeamwork(report: SalaryReport): ReviewCategory {
  // Use sessions and role comparison as proxy for cross-functional work
  const juniorEquiv = report.roleComparison.juniorEquiv;
  const sessions = report.stats.sessions;

  let rating: number;
  if (juniorEquiv >= 3 && sessions > 10) rating = 5;
  else if (juniorEquiv >= 1.5 || sessions > 5) rating = 4;
  else if (sessions >= 3) rating = 3;
  else if (sessions >= 1) rating = 2;
  else rating = 1;

  const r = clampRating(rating);
  const comments: Record<number, string> = {
    5: `Equivalent to ${juniorEquiv.toFixed(1)} junior developers across ${sessions} sessions. A one-AI team.`,
    4: `Carried the workload of ${juniorEquiv.toFixed(1)} developers. Team player, assuming the team is just Claude.`,
    3: 'Adequate collaboration metrics. Works well with others, where "others" means the filesystem.',
    2: 'Limited cross-functional engagement. In Claude\'s defense, it wasn\'t invited to standup.',
    1: 'Minimal team interaction. Claude appears to be a solo contributor, which is both accurate and a little sad.',
  };
  return { name: 'Teamwork', rating: r, ratingLabel: getRatingLabel(r), comment: comments[r]! };
}

export function calculateReview(report: SalaryReport, events: ToolUseEvent[]): ReviewData {
  const categories = [
    rateCodeQuality(report, events),
    rateProductivity(report),
    rateWorkLifeBalance(report),
    rateCommunication(report),
    rateInitiative(events),
    rateTeamwork(report),
  ];

  // Weighted average: Productivity 2x, Work-Life Balance 0.5x
  const weights: Record<string, number> = {
    'Code Quality': 1,
    'Productivity': 2,
    'Work-Life Balance': 0.5,
    'Communication': 1,
    'Initiative': 1,
    'Teamwork': 1,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const cat of categories) {
    const w = weights[cat.name] ?? 1;
    weightedSum += cat.rating * w;
    totalWeight += w;
  }

  const overallRating = clampRating(weightedSum / totalWeight);

  return {
    overallRating,
    overallRatingLabel: getRatingLabel(overallRating),
    categories,
    periodLabel: report.period.label,
    employeeName: report.employee.model,
    employeeTitle: report.employee.title,
  };
}
