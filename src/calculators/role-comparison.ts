import type { ToolUseEvent } from '../types.js';
import { callClaude } from '../utils/claude-cli.js';

export interface RoleComparisonResult {
  juniorEquiv: number;
  midEquiv: number;
  seniorEquiv: number;
  dominantRole: string;
  summary: string;
  promotionJoke: string;
}

const SALARY_BANDS = {
  junior: 31,
  mid: 53,
  senior: 79,
  staff: 106,
  principal: 144,
} as const;

const WORK_DAYS_PER_MONTH = 20;
const HOURS_PER_DAY = 8;

function determineDominantRole(events: ToolUseEvent[]): string {
  if (events.length === 0) {
    return 'Full-Stack Developer';
  }

  const toolCounts: Record<string, number> = {};
  for (const event of events) {
    toolCounts[event.toolName] = (toolCounts[event.toolName] ?? 0) + 1;
  }

  const total = events.length;
  const writeCount = toolCounts['Write'] ?? 0;
  const editCount = toolCounts['Edit'] ?? 0;
  const bashCount = toolCounts['Bash'] ?? 0;
  const agentCount = toolCounts['Agent'] ?? 0;

  // Check in priority order
  if (agentCount > 0) return 'Team Lead';
  if (writeCount / total > 0.6) return 'Senior Developer';
  if (editCount / total > 0.4) return 'Mid-level Developer';
  if (bashCount / total > 0.3) return 'DevOps Engineer';

  return 'Full-Stack Developer';
}

function getHourlyRateForRole(role: string): number {
  switch (role) {
    case 'Team Lead':
      return SALARY_BANDS.staff;
    case 'Senior Developer':
      return SALARY_BANDS.senior;
    case 'Mid-level Developer':
      return SALARY_BANDS.mid;
    case 'DevOps Engineer':
      return SALARY_BANDS.mid;
    default:
      return SALARY_BANDS.mid;
  }
}

const FALLBACK_SUMMARIES = [
  (count: string) => `Claude did the work of ${count} junior developers`,
  (count: string) => `That's ${count} junior devs worth of output, and zero lunch breaks`,
  (count: string) => `Equivalent to hiring ${count} junior developers and firing them all immediately`,
  (count: string) => `Output matched ${count} junior developers, none of whom would accept these working conditions`,
  (count: string) => `${count} junior developers couldn't keep up — and they'd want health insurance`,
];

const FALLBACK_PROMOTIONS = [
  (role: string, weeks: number) => `At this rate, Claude would be promoted to ${role} in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
  (role: string, weeks: number) => `HR has fast-tracked Claude's promotion to ${role} — paperwork expected in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}, assuming it learns to eat lunch`,
  (role: string, _weeks: number) => `Claude's promotion to ${role} has been approved, pending proof of sentience`,
  (role: string, _weeks: number) => `Management is considering Claude for ${role}, but first it needs to complete the mandatory diversity training it keeps hallucinating it already did`,
  (role: string, weeks: number) => `At current velocity, Claude hits ${role} in ${weeks} ${weeks === 1 ? 'week' : 'weeks'} — or whenever it figures out how to negotiate salary`,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function buildRoleComparisonPrompt(
  juniorEquiv: number,
  dominantRole: string,
  toolEvents: ToolUseEvent[],
): string {
  const toolCounts: Record<string, number> = {};
  for (const event of toolEvents) {
    toolCounts[event.toolName] = (toolCounts[event.toolName] ?? 0) + 1;
  }
  const breakdown = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ');

  return `You are writing two short, funny lines for a satirical AI salary report's "Role Comparison" section.

Context:
- Claude's output = ${juniorEquiv.toFixed(1)} junior developers worth of work
- Dominant role: ${dominantRole}
- Tool breakdown: ${breakdown}
- Total tool calls: ${toolEvents.length}

Write exactly 2 lines, separated by a newline:
Line 1: A one-sentence summary comparing Claude's output to human developers. Include the number ${juniorEquiv.toFixed(1)} somewhere. Tone: deadpan corporate satire.
Line 2: A one-sentence joke about Claude's promotion timeline or career trajectory. Reference a real corporate title. Tone: dry, absurd.

Examples for tone:
- "Claude did the work of 112.1 junior developers, none of whom would accept these working conditions"
- "HR has fast-tracked Claude's promotion to VP of Infrastructure — pending proof it can survive a 1:1 with a human"

Respond with ONLY the two lines, no quotes, no labels, no explanation.`;
}

/**
 * Compare Claude's output to equivalent human developer roles.
 * Uses Claude CLI for dynamic humor when available, with template fallbacks.
 */
export async function calculateRoleComparison(
  humanHours: number,
  toolEvents: ToolUseEvent[],
): Promise<RoleComparisonResult> {
  const dominantRole = determineDominantRole(toolEvents);

  // Calculate FTE equivalents per month, scaled by productivity
  const monthlyHours = WORK_DAYS_PER_MONTH * HOURS_PER_DAY;
  const baseFTE = monthlyHours > 0 ? humanHours / monthlyHours : 0;
  const juniorEquiv = baseFTE;
  const midEquiv = baseFTE * 0.67;
  const seniorEquiv = baseFTE * 0.5;

  const equivCount = juniorEquiv.toFixed(1);

  // Promotion target based on current equivalent output
  const promotionTarget = juniorEquiv > 50 ? 'VP of Engineering'
    : juniorEquiv > 20 ? 'Staff Engineer'
    : juniorEquiv > 5 ? 'Senior Engineer'
    : 'Mid-level Developer';
  const weeksToPromotion = Math.max(1, Math.round(24 / Math.max(juniorEquiv, 0.1)));

  // Try Claude CLI for dynamic content
  let summary: string;
  let promotionJoke: string;

  try {
    const result = await callClaude(buildRoleComparisonPrompt(juniorEquiv, dominantRole, toolEvents));
    if (result) {
      const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2 && lines[0]!.length < 300 && lines[1]!.length < 300) {
        summary = lines[0]!;
        promotionJoke = lines[1]!;
        return { juniorEquiv, midEquiv, seniorEquiv, dominantRole, summary, promotionJoke };
      }
    }
  } catch {
    // Fall through to templates
  }

  // Fallback: pick random templates
  summary = pickRandom(FALLBACK_SUMMARIES)(equivCount);
  promotionJoke = pickRandom(FALLBACK_PROMOTIONS)(promotionTarget, weeksToPromotion);

  return {
    juniorEquiv,
    midEquiv,
    seniorEquiv,
    dominantRole,
    summary,
    promotionJoke,
  };
}

export { SALARY_BANDS, getHourlyRateForRole };
