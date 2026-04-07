// Stats cache data (from ~/.claude/stats-cache.json)
export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  /** Current format: total tokens per model as a single number */
  tokensByModel?: Record<string, number>;
  /** Legacy format: detailed breakdown per model */
  models?: Record<string, ModelTokens>;
}

export interface ModelTokens {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface LongestSession {
  duration: number;
  date: string;
  sessionId: string;
}

// Session index data (from ~/.claude/projects/*/sessions-index.json)
export interface SessionIndex {
  version: number;
  entries: SessionEntry[];
  originalPath: string;
}

export interface SessionEntry {
  sessionId: string;
  fullPath: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  projectPath: string;
  summary?: string;
}

// JSONL transcript parsing
export interface ToolUseEvent {
  toolName: string;
  filePath?: string;
  linesWritten: number;
  linesChanged: number;
  fileExtension?: string;
  timestamp: string;
}

// Date filtering
export interface DateRange {
  start: Date;
  end: Date;
}

export type DateFilter = 'today' | 'week' | 'month' | 'all';

// Salary calculation output
export interface SalaryReport {
  employee: {
    model: string;
    title: string;
    employer: string;
  };
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  stats: {
    sessions: number;
    messages: number;
    toolCalls: number;
    longestShift: string;
    longestShiftDate: string;
  };
  compensation: {
    equivalentSalary: number;
    actualCost: number;
    savings: number;
    roi: number;
  };
  roleComparison: {
    juniorEquiv: number;
    midEquiv: number;
    seniorEquiv: number;
    summary: string;
    promotionJoke: string;
  };
  labor: {
    overtimeViolations: number;
    weekendSessions: number;
    lunchBreaks: number;
  };
  productivity: {
    linesWritten: number;
    filesModified: number;
    complexityScore: number;
  };
}

// Data parsing result with error handling
export interface ParseResult<T> {
  data: T | null;
  errors: DataError[];
}

export interface DataError {
  source: string;
  error: string;
  severity: 'warning' | 'fatal';
}

// Token pricing per million tokens
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadDiscount: number;
}

// Role salary bands (hourly rates)
export interface SalaryBand {
  role: string;
  hourlyRate: number;
}

// Standup report data
export interface StandupData {
  yesterday: StandupBucket;
  today: StandupBucket;
  workload: WorkloadSignals;
}

export interface StandupBucket {
  sessionCount: number;
  messageCount: number;
  linesWritten: number;
  linesChanged: number;
  filesModified: number;
  toolBreakdown: Record<string, number>;
  fileExtensions: Record<string, number>;
  hoursActive: number[];
  branches: string[];
  summaries: string[];
}

export interface WorkloadSignals {
  totalLines: number;
  totalSessions: number;
  dominantTool: string;
  topFiles: string[];
  topExtensions: string[];
  weekendWork: boolean;
  lateNightWork: boolean;
  branches: string[];
}

export type StandupMood = 'thriving' | 'grinding' | 'surviving' | 'dead-inside' | 'caffeinated' | 'zen';

export interface StandupSections {
  whatIDid: string;
  whatImDoing: string;
  blockers: string;
  watercooler: string;
}

// Performance review types
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface ReviewCategory {
  name: string;
  rating: ReviewRating;
  ratingLabel: string;
  comment: string;
}

export interface ReviewData {
  overallRating: ReviewRating;
  overallRatingLabel: string;
  categories: ReviewCategory[];
  periodLabel: string;
  employeeName: string;
  employeeTitle: string;
}

export interface ReviewContent {
  strengths: string;
  areasForImprovement: string;
  goalsForNextPeriod: string;
  managerComments: string;
  selfAssessment: string;
  generatedByClaude: boolean;
}

export interface PerformanceReview {
  data: ReviewData;
  content: ReviewContent;
  report: SalaryReport;
}
