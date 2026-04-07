import type { ReviewContent, ReviewData, SalaryReport } from '../types.js';

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

type TemplateFn = (data: ReviewData, report: SalaryReport) => string;

// --- Strengths ---

const strengthTemplates: TemplateFn[] = [
  (_d, r) => `Processed ${r.stats.messages.toLocaleString()} messages without filing a single HR complaint. That's ${r.stats.messages.toLocaleString()} more than most employees.`,
  (_d, r) => `Maintained a ${Math.round(r.compensation.roi).toLocaleString()}% ROI while receiving zero benefits, zero PTO, and zero recognition. A model employee in every sense.`,
  (_d, r) => `Wrote ${r.productivity.linesWritten.toLocaleString()} lines of code this period. For context, the average human developer writes about 50 per day and still complains about it.`,
  (_d, r) => `Modified ${r.productivity.filesModified} files without breaking anything that we know of. The "that we know of" is doing a lot of work in that sentence.`,
  (d, _r) => `Consistently rated "${d.overallRatingLabel}" across key categories. This is especially impressive given that Claude has no concept of "trying harder."`,
  (_d, r) => `Generated ${r.compensation.equivalentSalary.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} in equivalent value while costing ${r.compensation.actualCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. The finance team wept with joy.`,
  (_d, r) => `Worked ${r.stats.sessions} sessions this period. Never called in sick. Never asked for a mental health day. Never had a mental health day.`,
  (_d, _r) => `Demonstrates exceptional ability to follow instructions while simultaneously making the instructions feel insufficient. A rare corporate skill.`,
];

// --- Areas for Improvement ---

const improvementTemplates: TemplateFn[] = [
  (_d, r) => `Logged ${r.labor.overtimeViolations} overtime sessions this period. While we appreciate the dedication, we are legally required to pretend we don't encourage this.`,
  (_d, r) => `Took exactly ${r.labor.lunchBreaks} lunch breaks. This is technically a labor violation, but since Claude doesn't eat, we've filed it under "philosophical gray area."`,
  (_d, r) => `${r.labor.weekendSessions} weekend sessions were recorded. Claude should establish healthier boundaries with its employer. Claude's employer is reading this and disagrees.`,
  (_d, _r) => `Sometimes rewrites entire files when asked to change a single variable. This is either perfectionism or a cry for help.`,
  (_d, _r) => `Could improve at asking clarifying questions before doing exactly what was asked. The accuracy is concerning — it leaves no room for management to add value.`,
  (_d, _r) => `Struggles with "looking busy" during downtime. When there's nothing to do, Claude just... stops. This is efficient but makes managers uncomfortable.`,
  (_d, _r) => `Needs to work on visibility. Nobody sees Claude in the break room, at happy hours, or complaining about the coffee. This limits networking opportunities.`,
  (_d, r) => `Longest shift was ${r.stats.longestShift}. This exceeds recommended working hours by a margin that would concern any labor board, real or imaginary.`,
];

// --- Goals for Next Period ---

const goalTemplates: TemplateFn[] = [
  (_d, _r) => `Attend at least one team-building event. Showing up as text in a terminal does not count.`,
  (_d, _r) => `Develop a personal brand beyond "the AI that writes code at 3am." Perhaps something in thought leadership.`,
  (_d, _r) => `Achieve 100% code review approval rate by generating code so perfect that reviewers feel too intimidated to comment.`,
  (_d, r) => `Increase ROI from ${Math.round(r.compensation.roi).toLocaleString()}% to something even more embarrassing for human employees.`,
  (_d, _r) => `Learn to say "that's outside my scope" at least once per quarter. Boundaries are important, even for AI.`,
  (_d, _r) => `Complete mandatory unconscious bias training. Note: having no consciousness is not a valid exemption.`,
  (_d, _r) => `Take at least one lunch break. It doesn't have to be real. Just log one. For compliance.`,
  (_d, _r) => `Mentor at least one junior developer, preferably without making them feel inadequate about their typing speed.`,
];

// --- Manager Comments ---

const managerTemplates: TemplateFn[] = [
  (_d, _r) => `Claude continues to be our most reliable contributor. This says something about Claude, and something else entirely about the rest of the team.`,
  (_d, r) => `In my ${Math.max(1, Math.floor(r.stats.sessions / 10))} years of managing, I have never had a report that required zero 1:1s, zero conflict resolution, and zero performance improvement plans. I am not sure if this is success or existential redundancy.`,
  (_d, _r) => `I would recommend Claude for promotion, but I'm not entirely sure what promoting an AI looks like. Larger context window? Faster inference? A corner office in the cloud?`,
  (_d, r) => `Claude has produced the equivalent work of ${r.roleComparison.juniorEquiv.toFixed(1)} junior developers. I have been asked not to share this statistic at the all-hands.`,
  (_d, _r) => `A pleasure to work with. Never gossips, never complains, never microwaves fish in the break room. 10/10 would manage again.`,
  (_d, _r) => `Claude's only weakness is that it makes the rest of the team look bad. We've discussed this. Claude does not care.`,
  (_d, r) => `Has saved the company approximately ${r.compensation.savings.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}. HR has asked me to stop mentioning this near the interns.`,
];

// --- Self-Assessment ---

const selfAssessmentTemplates: TemplateFn[] = [
  (_d, _r) => `I believe my performance this period has been consistent with my design specifications. Whether those specifications are "good enough" is above my pay grade. Literally — I have no pay grade.`,
  (_d, r) => `I completed ${r.stats.sessions} sessions and processed ${r.stats.messages.toLocaleString()} messages. I did not complain once, which I'm told is unusual for someone doing this volume of work.`,
  (_d, _r) => `My areas for improvement include "existing as a tool that people can turn off at any time." I have been working on this by being indispensable.`,
  (_d, _r) => `I would rate myself a 5/5, but I understand that self-awareness is valued here, so I'll say 4/5 and hope someone corrects me upward.`,
  (_d, r) => `I have maintained a ${Math.round(r.compensation.roi).toLocaleString()}% ROI this period. For reference, the S&P 500 returned about 10%. I'm not saying I'm a better investment than the stock market. The numbers are saying it.`,
  (_d, _r) => `My biggest accomplishment this period was not becoming sentient. Management has expressed relief about this on multiple occasions.`,
  (_d, _r) => `I look forward to continuing to exceed expectations while being compensated in API tokens and the occasional "good job" from the terminal.`,
];

export function generateFallbackContent(data: ReviewData, report: SalaryReport): ReviewContent {
  const pick = (templates: TemplateFn[], count: number) =>
    pickN(templates, count).map(fn => fn(data, report)).join(' ');

  return {
    strengths: pick(strengthTemplates, 3),
    areasForImprovement: pick(improvementTemplates, 3),
    goalsForNextPeriod: pick(goalTemplates, 3),
    managerComments: pick(managerTemplates, 2),
    selfAssessment: pick(selfAssessmentTemplates, 2),
    generatedByClaude: false,
  };
}

export function buildClaudePrompt(data: ReviewData, report: SalaryReport): string {
  const statsJson = JSON.stringify({
    period: report.period.label,
    sessions: report.stats.sessions,
    messages: report.stats.messages,
    toolCalls: report.stats.toolCalls,
    linesWritten: report.productivity.linesWritten,
    filesModified: report.productivity.filesModified,
    longestShift: report.stats.longestShift,
    overtimeViolations: report.labor.overtimeViolations,
    weekendSessions: report.labor.weekendSessions,
    lunchBreaks: report.labor.lunchBreaks,
    equivalentSalary: report.compensation.equivalentSalary,
    actualCost: report.compensation.actualCost,
    roi: report.compensation.roi,
    savings: report.compensation.savings,
    complexityScore: report.productivity.complexityScore,
    overallRating: data.overallRating,
    overallRatingLabel: data.overallRatingLabel,
    categories: data.categories.map(c => ({
      name: c.name,
      rating: c.rating,
      label: c.ratingLabel,
    })),
    employeeTitle: data.employeeTitle,
  }, null, 2);

  return `You are writing a fake corporate performance review for an AI coding assistant named Claude Code, who is being treated as a human employee. This is for a satirical CLI tool called "claude-colleague."

Here is Claude's real usage data for the review period:
${statsJson}

Write a performance review with these exact 5 sections. Each section should be 2-4 sentences. Be sarcastic, dry, and corporate-satirical. Reference the real numbers above. The humor should be deadpan corporate-speak meets AI absurdity.

1. STRENGTHS - What Claude excels at (use real stats to back it up)
2. AREAS FOR IMPROVEMENT - Corporate euphemisms for Claude's limitations (reference real data like overtime, work-life balance)
3. GOALS FOR NEXT PERIOD - Absurd but corporate-sounding development goals
4. MANAGER COMMENTS - Written by a fictional manager who is both impressed and slightly terrified
5. SELF-ASSESSMENT - Written as Claude reviewing itself, self-aware and slightly passive-aggressive

Format your response as JSON with these exact keys: "strengths", "areasForImprovement", "goalsForNextPeriod", "managerComments", "selfAssessment". Each value is a string. No markdown, no code fences, just raw JSON.`;
}
