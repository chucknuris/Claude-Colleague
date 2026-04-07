import type {
  StatsCache,
  SessionEntry,
  ToolUseEvent,
  StandupData,
  StandupBucket,
  WorkloadSignals,
} from '../types.js';
import { getYesterdayBoundary } from '../utils/date-filters.js';

function emptyBucket(): StandupBucket {
  return {
    sessionCount: 0,
    messageCount: 0,
    linesWritten: 0,
    linesChanged: 0,
    filesModified: 0,
    toolBreakdown: {},
    fileExtensions: {},
    hoursActive: [],
    branches: [],
    summaries: [],
  };
}

function addEventToBucket(bucket: StandupBucket, event: ToolUseEvent): void {
  bucket.toolBreakdown[event.toolName] = (bucket.toolBreakdown[event.toolName] ?? 0) + 1;
  bucket.linesWritten += event.linesWritten;
  bucket.linesChanged += event.linesChanged;

  if (event.fileExtension) {
    bucket.fileExtensions[event.fileExtension] = (bucket.fileExtensions[event.fileExtension] ?? 0) + 1;
  }

  if (event.filePath) {
    bucket.filesModified += 1; // will dedupe later via Set in workload signals
  }

  if (event.timestamp) {
    const hour = new Date(event.timestamp).getHours();
    if (!bucket.hoursActive.includes(hour)) {
      bucket.hoursActive.push(hour);
    }
  }
}

function addSessionToBucket(bucket: StandupBucket, session: SessionEntry): void {
  bucket.sessionCount += 1;
  bucket.messageCount += session.messageCount;
  if (session.gitBranch && !bucket.branches.includes(session.gitBranch)) {
    bucket.branches.push(session.gitBranch);
  }
  if (session.summary) {
    bucket.summaries.push(session.summary);
  }
}

function computeWorkloadSignals(
  yesterday: StandupBucket,
  today: StandupBucket,
  events: ToolUseEvent[],
): WorkloadSignals {
  const totalLines = yesterday.linesWritten + today.linesWritten;
  const totalSessions = yesterday.sessionCount + today.sessionCount;

  // Dominant tool from combined breakdown
  const combined: Record<string, number> = {};
  for (const [tool, count] of Object.entries(yesterday.toolBreakdown)) {
    combined[tool] = (combined[tool] ?? 0) + count;
  }
  for (const [tool, count] of Object.entries(today.toolBreakdown)) {
    combined[tool] = (combined[tool] ?? 0) + count;
  }

  const totalToolUses = Object.values(combined).reduce((a, b) => a + b, 0) || 1;
  let dominantTool = 'mixed';
  let maxPct = 0;
  for (const [tool, count] of Object.entries(combined)) {
    const pct = count / totalToolUses;
    if (pct > maxPct && pct > 0.3) {
      maxPct = pct;
      dominantTool = tool;
    }
  }

  // Top files by frequency
  const fileCounts: Record<string, number> = {};
  for (const event of events) {
    if (event.filePath) {
      const basename = event.filePath.split('/').pop() ?? event.filePath;
      fileCounts[basename] = (fileCounts[basename] ?? 0) + 1;
    }
  }
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Top extensions
  const extCombined: Record<string, number> = {};
  for (const [ext, count] of Object.entries(yesterday.fileExtensions)) {
    extCombined[ext] = (extCombined[ext] ?? 0) + count;
  }
  for (const [ext, count] of Object.entries(today.fileExtensions)) {
    extCombined[ext] = (extCombined[ext] ?? 0) + count;
  }
  const topExtensions = Object.entries(extCombined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ext]) => ext);

  // Late night / weekend detection
  const allHours = [...yesterday.hoursActive, ...today.hoursActive];
  const lateNightWork = allHours.some(h => h >= 22 || h <= 4);

  const weekendWork = events.some(e => {
    if (!e.timestamp) return false;
    const day = new Date(e.timestamp).getDay();
    return day === 0 || day === 6;
  });

  const branches = [...new Set([...yesterday.branches, ...today.branches])];

  return {
    totalLines,
    totalSessions,
    dominantTool,
    topFiles,
    topExtensions,
    weekendWork,
    lateNightWork,
    branches,
  };
}

export function calculateStandup(
  _stats: StatsCache,
  sessions: SessionEntry[],
  events: ToolUseEvent[],
): StandupData {
  const boundary = getYesterdayBoundary();

  const yesterday = emptyBucket();
  const today = emptyBucket();

  // Bucket sessions
  for (const session of sessions) {
    const created = new Date(session.created);
    if (created >= boundary) {
      addSessionToBucket(today, session);
    } else {
      addSessionToBucket(yesterday, session);
    }
  }

  // Bucket events
  for (const event of events) {
    if (!event.timestamp) continue;
    const ts = new Date(event.timestamp);
    if (ts >= boundary) {
      addEventToBucket(today, event);
    } else {
      addEventToBucket(yesterday, event);
    }
  }

  // Dedupe filesModified using filePath sets
  const yesterdayFiles = new Set(events.filter(e => e.filePath && new Date(e.timestamp) < boundary).map(e => e.filePath));
  const todayFiles = new Set(events.filter(e => e.filePath && new Date(e.timestamp) >= boundary).map(e => e.filePath));
  yesterday.filesModified = yesterdayFiles.size;
  today.filesModified = todayFiles.size;

  const workload = computeWorkloadSignals(yesterday, today, events);

  return { yesterday, today, workload };
}
