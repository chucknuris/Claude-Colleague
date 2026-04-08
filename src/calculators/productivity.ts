import type { ToolUseEvent } from '../types.js';

export interface ProductivityResult {
  linesWritten: number;
  filesModified: number;
  complexityScore: number;
  humanHoursEquivalent: number;
  fileBreakdown: Record<string, number>;
}

// Realistic developer productivity: a solid junior-to-mid dev writes ~125-150
// meaningful lines of code per day (industry studies, after reviews/meetings/etc.)
const COMPLEXITY_WEIGHTED_LINES_PER_DAY = 150;
const HOURS_PER_DAY = 8;

function getComplexityMultiplier(filePath: string, extension: string): number {
  // Test files
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) {
    return 0.8;
  }

  // Infrastructure files
  const lowerPath = filePath.toLowerCase();
  if (
    lowerPath.includes('dockerfile') ||
    ((lowerPath.includes('/infra') ||
      lowerPath.includes('/deploy') ||
      lowerPath.includes('/ci')) &&
      (extension === '.yml' || extension === '.yaml'))
  ) {
    return 1.3;
  }

  // Config/JSON
  if (['.json', '.yaml', '.yml', '.toml'].includes(extension)) {
    return 0.5;
  }

  // Frontend
  if (['.tsx', '.jsx', '.vue', '.svelte'].includes(extension)) {
    return 1.2;
  }

  return 1.0;
}

/**
 * Calculate productivity metrics from tool use events.
 */
export function calculateProductivity(events: ToolUseEvent[]): ProductivityResult {
  const fileBreakdown: Record<string, number> = {};
  let totalLines = 0;
  let complexityScore = 0;
  const uniqueFiles = new Set<string>();

  for (const event of events) {
    const lines = event.linesWritten + event.linesChanged;
    totalLines += lines;

    if (event.filePath) {
      uniqueFiles.add(event.filePath);
      fileBreakdown[event.filePath] = (fileBreakdown[event.filePath] ?? 0) + lines;

      const ext = event.fileExtension ?? '';
      const multiplier = getComplexityMultiplier(event.filePath, ext);
      complexityScore += lines * multiplier;
    } else {
      // No file path — use default multiplier
      complexityScore += lines * 1.0;
    }
  }

  // Use complexity-weighted lines so config/JSON count less, infra/frontend count more
  const humanHoursEquivalent = complexityScore > 0
    ? (complexityScore / COMPLEXITY_WEIGHTED_LINES_PER_DAY) * HOURS_PER_DAY
    : 0;

  return {
    linesWritten: totalLines,
    filesModified: uniqueFiles.size,
    complexityScore,
    humanHoursEquivalent,
    fileBreakdown,
  };
}
