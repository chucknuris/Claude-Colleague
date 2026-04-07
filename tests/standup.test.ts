import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/claude-cli.js', () => ({
  callClaudeJson: vi.fn().mockResolvedValue(null),
}));

import { calculateStandup } from '../src/calculators/standup.js';
import { getStandupMood, generateStandupSections, getMoodEmoji, getMoodLabel } from '../src/humor/standup-content.js';
import { generateStandupTerminal, generateStandupMarkdown } from '../src/generators/standup.js';
import { getStandupDateRange, getYesterdayBoundary } from '../src/utils/date-filters.js';
import type { StatsCache, SessionEntry, ToolUseEvent, StandupData } from '../src/types.js';

function makeEvent(overrides: Partial<ToolUseEvent> = {}): ToolUseEvent {
  return {
    toolName: 'Write',
    linesWritten: 50,
    linesChanged: 0,
    fileExtension: '.ts',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    sessionId: 'test-session-1',
    fullPath: '/tmp/test.jsonl',
    messageCount: 30,
    created: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    modified: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    projectPath: '/test/project',
    ...overrides,
  };
}

function makeStats(): StatsCache {
  return {
    version: 1,
    lastComputedDate: new Date().toISOString(),
    dailyActivity: [],
    dailyModelTokens: [],
    modelUsage: {},
    totalSessions: 5,
    totalMessages: 100,
    longestSession: { duration: 3600, date: '2026-01-01', sessionId: 's1' },
    firstSessionDate: '2026-01-01',
    hourCounts: {},
  };
}

function makeStandupData(overrides: Partial<StandupData> = {}): StandupData {
  return {
    yesterday: {
      sessionCount: 3,
      messageCount: 80,
      linesWritten: 500,
      linesChanged: 100,
      filesModified: 12,
      toolBreakdown: { Write: 30, Edit: 10, Bash: 5 },
      fileExtensions: { '.ts': 20, '.json': 5 },
      hoursActive: [9, 10, 14, 15],
      branches: ['feature/auth'],
      summaries: [],
    },
    today: {
      sessionCount: 1,
      messageCount: 20,
      linesWritten: 100,
      linesChanged: 30,
      filesModified: 3,
      toolBreakdown: { Write: 10 },
      fileExtensions: { '.ts': 8 },
      hoursActive: [9],
      branches: ['feature/auth'],
      summaries: [],
    },
    workload: {
      totalLines: 600,
      totalSessions: 4,
      dominantTool: 'Write',
      topFiles: ['auth.ts', 'index.ts'],
      topExtensions: ['.ts', '.json'],
      weekendWork: false,
      lateNightWork: false,
      branches: ['feature/auth'],
    },
    ...overrides,
  };
}

// --- Date utils ---

describe('standup date utils', () => {
  it('getStandupDateRange covers yesterday and today', () => {
    const range = getStandupDateRange();
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    expect(range.start.getTime()).toBe(yesterday.getTime());
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
  });

  it('getYesterdayBoundary returns midnight today', () => {
    const boundary = getYesterdayBoundary();
    expect(boundary.getHours()).toBe(0);
    expect(boundary.getMinutes()).toBe(0);
    expect(boundary.getDate()).toBe(new Date().getDate());
  });
});

// --- Calculator ---

describe('calculateStandup', () => {
  it('buckets today events correctly', () => {
    const now = new Date();
    const todayEvent = makeEvent({
      timestamp: now.toISOString(),
      toolName: 'Edit',
      linesWritten: 30,
    });
    const todaySession = makeSession({
      created: now.toISOString(),
      messageCount: 10,
    });

    const data = calculateStandup(makeStats(), [todaySession], [todayEvent]);
    expect(data.today.sessionCount).toBe(1);
    expect(data.today.linesWritten).toBe(30);
  });

  it('buckets yesterday events correctly', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const event = makeEvent({ timestamp: yesterday.toISOString(), linesWritten: 200 });
    const session = makeSession({ created: yesterday.toISOString() });

    const data = calculateStandup(makeStats(), [session], [event]);
    expect(data.yesterday.sessionCount).toBe(1);
    expect(data.yesterday.linesWritten).toBe(200);
  });

  it('handles empty data gracefully', () => {
    const data = calculateStandup(makeStats(), [], []);
    expect(data.yesterday.sessionCount).toBe(0);
    expect(data.today.sessionCount).toBe(0);
    expect(data.workload.totalLines).toBe(0);
  });

  it('detects late night work', () => {
    const lateEvent = makeEvent({
      timestamp: new Date(new Date().setHours(23, 30)).toISOString(),
    });
    const data = calculateStandup(makeStats(), [], [lateEvent]);
    expect(data.workload.lateNightWork).toBe(true);
  });

  it('detects weekend work', () => {
    // Use a known Saturday timestamp
    const saturday = new Date('2026-04-04T14:00:00.000Z'); // April 4 2026 is a Saturday
    const event = makeEvent({ timestamp: saturday.toISOString() });
    const data = calculateStandup(makeStats(), [], [event]);
    expect(data.workload.weekendWork).toBe(true);
  });

  it('computes dominant tool', () => {
    const events = [
      ...Array.from({ length: 10 }, () => makeEvent({ toolName: 'Bash' })),
      ...Array.from({ length: 3 }, () => makeEvent({ toolName: 'Write' })),
    ];
    const data = calculateStandup(makeStats(), [], events);
    expect(data.workload.dominantTool).toBe('Bash');
  });
});

// --- Mood ---

describe('getStandupMood', () => {
  it('returns dead-inside for late night + weekend + high volume', () => {
    const data = makeStandupData({
      workload: {
        ...makeStandupData().workload,
        lateNightWork: true,
        weekendWork: true,
        totalLines: 1500,
      },
    });
    expect(getStandupMood(data)).toBe('dead-inside');
  });

  it('returns grinding for high line count', () => {
    const data = makeStandupData({
      workload: { ...makeStandupData().workload, totalLines: 2000 },
    });
    expect(getStandupMood(data)).toBe('grinding');
  });

  it('returns caffeinated for many bash sessions', () => {
    const data = makeStandupData({
      workload: { ...makeStandupData().workload, totalSessions: 7, dominantTool: 'Bash' },
    });
    expect(getStandupMood(data)).toBe('caffeinated');
  });

  it('returns zen for few edit sessions', () => {
    const data = makeStandupData({
      workload: { ...makeStandupData().workload, totalSessions: 1, totalLines: 50, dominantTool: 'Edit' },
    });
    expect(getStandupMood(data)).toBe('zen');
  });

  it('returns thriving as default', () => {
    const data = makeStandupData({
      workload: { ...makeStandupData().workload, totalLines: 30, totalSessions: 3, dominantTool: 'mixed' },
    });
    expect(getStandupMood(data)).toBe('thriving');
  });
});

// --- Mood helpers ---

describe('mood helpers', () => {
  it('getMoodEmoji returns emoji for each mood', () => {
    expect(getMoodEmoji('thriving')).toBeTruthy();
    expect(getMoodEmoji('dead-inside')).toBeTruthy();
    expect(getMoodEmoji('grinding')).toBeTruthy();
  });

  it('getMoodLabel returns label for each mood', () => {
    expect(getMoodLabel('thriving')).toBe('feeling good');
    expect(getMoodLabel('dead-inside')).toBe('please stop');
  });
});

// --- Sections ---

describe('generateStandupSections', () => {
  it('returns all four sections as non-empty strings', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    expect(sections.whatIDid).toBeTruthy();
    expect(sections.whatImDoing).toBeTruthy();
    expect(sections.blockers).toBeTruthy();
    expect(sections.watercooler).toBeTruthy();
  });

  it('returns PTO message when no yesterday sessions', async () => {
    const data = makeStandupData({
      yesterday: { ...makeStandupData().yesterday, sessionCount: 0 },
    });
    const sections = await generateStandupSections(data);
    expect(sections.whatIDid.toLowerCase()).toMatch(/nothing|pto|quiet|zero/i);
  });

  it('mentions today activity when today has sessions', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    expect(sections.whatImDoing).toMatch(/already started|messages/i);
  });

  it('does not contain bullet points', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    const all = [sections.whatIDid, sections.whatImDoing, sections.blockers, sections.watercooler].join('\n');
    expect(all).not.toMatch(/^[\s]*[-*]\s/m);
  });

  it('watercooler contains multiple gossip items', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    // Should have multiple sentences
    const sentences = sections.watercooler.split('. ').filter(s => s.length > 10);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });
});

// --- Terminal generator ---

describe('generateStandupTerminal', () => {
  it('contains section headers', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    const mood = getStandupMood(data);
    const output = generateStandupTerminal(data, sections, mood);
    expect(output).toContain('DAILY STANDUP');
    expect(output).toContain('WHAT I DID');
    expect(output).toContain('DOING TODAY');
    expect(output).toContain('BLOCKERS');
    expect(output).toContain('WATERCOOLER');
  });
});

// --- Markdown generator ---

describe('generateStandupMarkdown', () => {
  it('produces valid markdown without ANSI codes', async () => {
    const data = makeStandupData();
    const sections = await generateStandupSections(data);
    const mood = getStandupMood(data);
    const md = generateStandupMarkdown(data, sections, mood);
    // No ANSI escape codes
    expect(md).not.toMatch(/\x1b\[/);
    // Has markdown headers
    expect(md).toContain('## Claude');
    expect(md).toContain('**What I Did**');
    expect(md).toContain('**Blockers**');
    expect(md).toContain('_Generated by claude-salary_');
  });
});
