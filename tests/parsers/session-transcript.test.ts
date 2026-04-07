import { describe, it, expect, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTranscript } from '../../src/parsers/session-transcript.js';

const TMP_DIR = join(tmpdir(), 'claude-colleague-test-' + Date.now());

async function collectEvents(filePath: string) {
  const events = [];
  for await (const event of parseTranscript(filePath)) {
    events.push(event);
  }
  return events;
}

// Setup: create temp directory
await mkdir(TMP_DIR, { recursive: true });

afterAll(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('parseTranscript', () => {
  it('extracts Write tool_use events with correct line counts', async () => {
    const filePath = join(TMP_DIR, 'write-test.jsonl');
    const line = JSON.stringify({
      parentUuid: 'aaa-111',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: 'Write',
            input: {
              file_path: '/tmp/test.ts',
              content: 'line1\nline2\nline3\n',
            },
          },
        ],
      },
      timestamp: '2026-04-07T10:00:00Z',
    });
    await writeFile(filePath, line + '\n');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('Write');
    expect(events[0].filePath).toBe('/tmp/test.ts');
    // "line1\nline2\nline3\n" has 3 newlines + 1 = 4 lines
    expect(events[0].linesWritten).toBe(4);
    expect(events[0].linesChanged).toBe(0);
    expect(events[0].fileExtension).toBe('.ts');
    expect(events[0].timestamp).toBe('2026-04-07T10:00:00Z');
  });

  it('extracts Edit tool_use events with correct line changes', async () => {
    const filePath = join(TMP_DIR, 'edit-test.jsonl');
    const line = JSON.stringify({
      parentUuid: 'bbb-222',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: 'Edit',
            input: {
              file_path: '/tmp/edit.ts',
              old_string: 'const a = 1;',
              new_string: 'const a = 1;\nconst b = 2;\nconst c = 3;',
            },
          },
        ],
      },
      timestamp: '2026-04-07T10:01:00Z',
    });
    await writeFile(filePath, line + '\n');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('Edit');
    expect(events[0].filePath).toBe('/tmp/edit.ts');
    expect(events[0].linesWritten).toBe(0);
    // old: "const a = 1;" = 1 line, new: "const a = 1;\nconst b = 2;\nconst c = 3;" = 3 lines
    // linesChanged = |3 - 1| + max(1, 3) = 2 + 3 = 5
    expect(events[0].linesChanged).toBe(5);
  });

  it('skips non-assistant entries', async () => {
    const filePath = join(TMP_DIR, 'user-test.jsonl');
    const lines = [
      JSON.stringify({
        parentUuid: 'ccc-111',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      }),
      JSON.stringify({
        parentUuid: 'ccc-222',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              name: 'Write',
              input: { file_path: '/tmp/x.ts', content: 'hello\n' },
            },
          ],
        },
        timestamp: '2026-04-07T10:02:00Z',
      }),
    ];
    await writeFile(filePath, lines.join('\n') + '\n');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(1);
    expect(events[0].toolName).toBe('Write');
  });

  it('handles corrupt JSON lines gracefully', async () => {
    const filePath = join(TMP_DIR, 'corrupt-test.jsonl');
    const lines = [
      'this is not json at all',
      '{"broken": json}',
      JSON.stringify({
        parentUuid: 'ddd-111',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              name: 'Write',
              input: { file_path: '/tmp/ok.ts', content: 'valid\n' },
            },
          ],
        },
        timestamp: '2026-04-07T10:03:00Z',
      }),
    ];
    await writeFile(filePath, lines.join('\n') + '\n');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(1);
    expect(events[0].filePath).toBe('/tmp/ok.ts');
  });

  it('handles multiple tool_use blocks in one message', async () => {
    const filePath = join(TMP_DIR, 'multi-test.jsonl');
    const line = JSON.stringify({
      parentUuid: 'eee-111',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: 'Write',
            input: { file_path: '/tmp/a.ts', content: 'a\n' },
          },
          {
            type: 'tool_use',
            name: 'Write',
            input: { file_path: '/tmp/b.ts', content: 'b\n' },
          },
        ],
      },
      timestamp: '2026-04-07T10:04:00Z',
    });
    await writeFile(filePath, line + '\n');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(2);
    expect(events[0].filePath).toBe('/tmp/a.ts');
    expect(events[1].filePath).toBe('/tmp/b.ts');
  });

  it('parses the sample fixture file', async () => {
    const fixturePath = join(
      __dirname,
      '..',
      'fixtures',
      'sample-session.jsonl',
    );
    const events = await collectEvents(fixturePath);

    // Fixture has: 1 Write, 1 Edit, 1 Bash, 1 text-only (skipped), 1 corrupt (skipped)
    expect(events).toHaveLength(3);
    expect(events[0].toolName).toBe('Write');
    expect(events[1].toolName).toBe('Edit');
    expect(events[2].toolName).toBe('Bash');
  });

  it('handles empty file', async () => {
    const filePath = join(TMP_DIR, 'empty-test.jsonl');
    await writeFile(filePath, '');

    const events = await collectEvents(filePath);
    expect(events).toHaveLength(0);
  });

  it('extracts file extension correctly', async () => {
    const filePath = join(TMP_DIR, 'ext-test.jsonl');
    const line = JSON.stringify({
      parentUuid: 'fff-111',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            name: 'Write',
            input: { file_path: '/tmp/styles.module.css', content: 'body {}\n' },
          },
        ],
      },
      timestamp: '2026-04-07T10:05:00Z',
    });
    await writeFile(filePath, line + '\n');

    const events = await collectEvents(filePath);
    expect(events[0].fileExtension).toBe('.css');
  });
});
