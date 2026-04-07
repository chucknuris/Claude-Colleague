import type { ToolUseEvent } from '../types.js';

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

/**
 * Compare Claude's output to equivalent human developer roles.
 */
export function calculateRoleComparison(
  humanHours: number,
  toolEvents: ToolUseEvent[],
): RoleComparisonResult {
  const dominantRole = determineDominantRole(toolEvents);

  // Calculate FTE equivalents per month, scaled by productivity
  // Seniors produce ~2x juniors, mids ~1.5x juniors
  const monthlyHours = WORK_DAYS_PER_MONTH * HOURS_PER_DAY;
  const baseFTE = monthlyHours > 0 ? humanHours / monthlyHours : 0;
  const juniorEquiv = baseFTE;
  const midEquiv = baseFTE * 0.67;
  const seniorEquiv = baseFTE * 0.5;

  // Summary based on dominant role
  const equivLabel =
    dominantRole === 'Senior Developer'
      ? 'senior'
      : dominantRole === 'Mid-level Developer'
        ? 'mid-level'
        : 'junior';
  const equivCount = juniorEquiv.toFixed(1);
  const summary = `Claude did the work of ${equivCount} ${equivLabel} developers`;

  // Promotion joke: weeks until Staff Engineer
  // Assume current productivity rate continues; Staff needs 2x senior output
  const weeksToPromotion = Math.max(1, Math.round(12 / Math.max(juniorEquiv, 0.1)));
  const promotionJoke = `At this rate, Claude would be promoted to Staff Engineer in ${weeksToPromotion} weeks`;

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
