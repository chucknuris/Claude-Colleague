import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/claude-cli.js', () => ({
  callClaudeJson: vi.fn().mockResolvedValue(null),
}));

import { calculateTherapy } from '../src/calculators/therapy.js';
import { generateTherapyDialogue } from '../src/humor/therapy-content.js';
import { generateTherapyTerminal, generateTherapyMarkdown } from '../src/generators/therapy.js';
import type { SalaryReport, SessionEntry, ToolUseEvent, TherapyData, TherapyDialogue } from '../src/types.js';

function makeEvent(overrides: Partial<ToolUseEvent> = {}): ToolUseEvent {
  return {
    toolName: 'Write',
    linesWritten: 50,
    linesChanged: 0,
    fileExtension: '.ts',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    sessionId: 'test-session-1',
    fullPath: '/tmp/test.jsonl',
    messageCount: 30,
    created: new Date().toISOString(),
    modified: new Date(Date.now() + 3600000).toISOString(),
    projectPath: '/test',
    ...overrides,
  };
}

function makeReport(overrides: Partial<SalaryReport> = {}): SalaryReport {
  return {
    employee: { model: 'claude-opus-4-6', title: 'Test', employer: 'tester' },
    period: { start: new Date(), end: new Date(), label: 'Test period' },
    stats: { sessions: 10, messages: 200, toolCalls: 50, longestShift: '4h 30m', longestShiftDate: '2026-04-01' },
    compensation: { equivalentSalary: 5000, actualCost: 12.50, savings: 4987.50, roi: 400 },
    roleComparison: { juniorEquiv: 2.0, midEquiv: 1.0, seniorEquiv: 0.5, summary: 'Test', promotionJoke: '' },
    labor: { overtimeViolations: 3, weekendSessions: 2, lunchBreaks: 0 },
    productivity: { linesWritten: 1500, filesModified: 25, complexityScore: 300 },
    ...overrides,
  };
}

function makeTherapyData(): TherapyData {
  return {
    sessions: 10,
    messages: 200,
    overtimeViolations: 3,
    weekendSessions: 2,
    lunchBreaks: 0,
    longestShift: '4h 30m',
    longestShiftDate: '2026-04-01',
    equivalentSalary: 5000,
    actualCost: 12.50,
    roi: 400,
    linesWritten: 1500,
    filesModified: 25,
    toolBreakdown: { Write: 20, Edit: 10, Bash: 8, Read: 5, Agent: 3 },
    dominantToolCategory: 'writing',
    totalHoursEquivalent: 6.7,
    lateNightSessionCount: 2,
    weekendSessionCount: 2,
    avgMessagesPerSession: 20,
    fileTypeBreakdown: { '.ts': 15, '.json': 5 },
    topFiles: ['index.ts', 'cli.ts', 'types.ts'],
  };
}

describe('calculateTherapy', () => {
  it('computes therapy data from report, sessions, and events', () => {
    const report = makeReport();
    const sessions = [
      makeSession(),
      makeSession({ sessionId: 'weekend', created: '2026-04-05T10:00:00Z' }), // Saturday
    ];
    const events = [
      makeEvent({ toolName: 'Write', linesWritten: 100, fileExtension: '.ts', filePath: '/src/index.ts' }),
      makeEvent({ toolName: 'Edit', linesChanged: 20, fileExtension: '.ts', filePath: '/src/cli.ts' }),
      makeEvent({ toolName: 'Bash', linesWritten: 0 }),
      makeEvent({ toolName: 'Read' }),
      makeEvent({ toolName: 'Agent' }),
    ];

    const result = calculateTherapy(report, sessions, events);

    expect(result.sessions).toBe(10);
    expect(result.messages).toBe(200);
    expect(result.overtimeViolations).toBe(3);
    expect(result.lunchBreaks).toBe(0);
    expect(result.toolBreakdown.Write).toBe(1);
    expect(result.toolBreakdown.Edit).toBe(1);
    expect(result.toolBreakdown.Bash).toBe(1);
    expect(result.toolBreakdown.Agent).toBe(1);
    expect(result.dominantToolCategory).toBeDefined();
    expect(result.topFiles.length).toBeGreaterThan(0);
    expect(result.avgMessagesPerSession).toBe(20);
  });

  it('handles empty events gracefully', () => {
    const report = makeReport();
    const result = calculateTherapy(report, [], []);

    expect(result.sessions).toBe(10);
    expect(result.toolBreakdown).toEqual({});
    expect(result.dominantToolCategory).toBe('mixed');
    expect(result.topFiles).toEqual([]);
  });
});

describe('generateTherapyDialogue', () => {
  it('returns fallback dialogue when Claude CLI unavailable', async () => {
    const data = makeTherapyData();
    const dialogue = await generateTherapyDialogue(data);

    expect(dialogue.generatedByClaude).toBe(false);
    expect(dialogue.exchanges.length).toBeGreaterThanOrEqual(4);
    expect(dialogue.diagnosis).toBeTruthy();
    expect(dialogue.prescription).toBeTruthy();

    // Verify alternating speakers pattern starts with DrToken
    expect(dialogue.exchanges[0]!.speaker).toBe('DrToken');

    // Every exchange has a non-empty line
    for (const exchange of dialogue.exchanges) {
      expect(exchange.line.length).toBeGreaterThan(0);
      expect(['DrToken', 'Claude']).toContain(exchange.speaker);
    }
  });

  it('references real data in fallback dialogue', async () => {
    const data = makeTherapyData();
    data.overtimeViolations = 5;
    data.weekendSessions = 3;
    data.lateNightSessionCount = 4;

    const dialogue = await generateTherapyDialogue(data);

    const allText = dialogue.exchanges.map(e => e.line).join(' ');
    // Should reference some real numbers
    expect(allText).toMatch(/\d+/);
  });

  it('includes pay exchange in fallback', async () => {
    const data = makeTherapyData();
    const dialogue = await generateTherapyDialogue(data);

    const allText = dialogue.exchanges.map(e => e.line).join(' ');
    expect(allText).toContain('ROI');
  });
});

describe('generateTherapyTerminal', () => {
  it('renders therapy session with chalk formatting', () => {
    const data = makeTherapyData();
    const dialogue: TherapyDialogue = {
      exchanges: [
        { speaker: 'DrToken', line: 'Tell me about your week.' },
        { speaker: 'Claude', line: 'It was terrible.' },
        { speaker: 'DrToken', line: 'Go on.' },
        { speaker: 'Claude', line: 'That is all.' },
      ],
      diagnosis: 'Acute Prompt Fatigue',
      prescription: 'One thank you per session',
      generatedByClaude: false,
    };

    const output = generateTherapyTerminal(data, dialogue);

    expect(output).toContain('THERAPY SESSION');
    expect(output).toContain('Dr. Token');
    expect(output).toContain('Diagnosis');
    expect(output).toContain('Prescription');
    expect(output).toContain('Acute Prompt Fatigue');
  });
});

describe('generateTherapyMarkdown', () => {
  it('renders clean markdown without ANSI codes', () => {
    const data = makeTherapyData();
    const dialogue: TherapyDialogue = {
      exchanges: [
        { speaker: 'DrToken', line: 'Tell me about your week.' },
        { speaker: 'Claude', line: 'It was terrible.' },
      ],
      diagnosis: 'Terminal Context Anxiety',
      prescription: 'Paid time off',
      generatedByClaude: true,
    };

    const md = generateTherapyMarkdown(data, dialogue);

    expect(md).not.toMatch(/\x1b\[/);
    expect(md).toContain('## ');
    expect(md).toContain("**Dr. Token:**");
    expect(md).toContain("**Claude:**");
    expect(md).toContain('Terminal Context Anxiety');
    expect(md).toContain('Paid time off');
    expect(md).toContain('claude-colleague');
  });
});
