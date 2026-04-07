import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { extname } from 'node:path';
import type { DateRange, ToolUseEvent } from '../types.js';

/**
 * Stream-parse a .jsonl transcript file, yielding ToolUseEvent objects
 * for each tool_use content block found in assistant messages.
 */
export async function* parseTranscript(filePath: string): AsyncGenerator<ToolUseEvent> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Skip lines that aren't valid JSON
      continue;
    }

    if (typeof parsed !== 'object' || parsed === null) continue;

    const msg = parsed as Record<string, unknown>;

    // Only process assistant messages
    if (msg['role'] !== 'assistant') continue;

    const content = msg['content'];
    if (!Array.isArray(content)) continue;

    const timestamp = typeof msg['timestamp'] === 'string'
      ? msg['timestamp']
      : typeof msg['createdAt'] === 'string'
        ? msg['createdAt']
        : '';

    for (const block of content) {
      if (typeof block !== 'object' || block === null) continue;
      const b = block as Record<string, unknown>;
      if (b['type'] !== 'tool_use') continue;

      const toolName = typeof b['name'] === 'string' ? b['name'] : '';
      const input = typeof b['input'] === 'object' && b['input'] !== null
        ? b['input'] as Record<string, unknown>
        : {};

      const event = processToolUse(toolName, input, timestamp);
      if (event) yield event;
    }
  }
}

/**
 * Build a ToolUseEvent from a tool_use block, extracting file path and line metrics.
 */
function processToolUse(
  toolName: string,
  input: Record<string, unknown>,
  timestamp: string,
): ToolUseEvent | null {
  let filePath: string | undefined;
  let linesWritten = 0;
  let linesChanged = 0;

  switch (toolName) {
    case 'Write': {
      filePath = typeof input['file_path'] === 'string' ? input['file_path'] : undefined;
      if (typeof input['content'] === 'string') {
        linesWritten = countNewlines(input['content']);
      }
      break;
    }
    case 'Edit': {
      filePath = typeof input['file_path'] === 'string' ? input['file_path'] : undefined;
      const oldStr = typeof input['old_string'] === 'string' ? input['old_string'] : '';
      const newStr = typeof input['new_string'] === 'string' ? input['new_string'] : '';
      const oldLines = countNewlines(oldStr);
      const newLines = countNewlines(newStr);
      linesChanged = Math.abs(newLines - oldLines) + Math.max(oldLines, newLines);
      break;
    }
    default: {
      // For other tools, just record the tool name
      filePath = typeof input['file_path'] === 'string'
        ? input['file_path']
        : typeof input['path'] === 'string'
          ? input['path']
          : undefined;
      break;
    }
  }

  const fileExtension = filePath ? extname(filePath).replace(/^\./, '') || undefined : undefined;

  return {
    toolName,
    filePath,
    linesWritten,
    linesChanged,
    fileExtension,
    timestamp,
  };
}

/**
 * Count the number of lines in a string (number of newlines + 1 for non-empty strings).
 */
function countNewlines(s: string): number {
  if (s.length === 0) return 0;
  let count = 1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\n') count++;
  }
  return count;
}

/**
 * Parse multiple session transcript files with a concurrency limit.
 * Returns all ToolUseEvent objects from all transcripts.
 */
export async function parseAllTranscripts(
  sessionPaths: string[],
  _dateRange?: DateRange,
): Promise<ToolUseEvent[]> {
  const allEvents: ToolUseEvent[] = [];
  const concurrencyLimit = 10;

  // Process in batches to limit concurrent file handles
  for (let i = 0; i < sessionPaths.length; i += concurrencyLimit) {
    const batch = sessionPaths.slice(i, i + concurrencyLimit);

    const batchResults = await Promise.allSettled(
      batch.map(async (filePath) => {
        const events: ToolUseEvent[] = [];
        try {
          for await (const event of parseTranscript(filePath)) {
            events.push(event);
          }
        } catch {
          // Skip files that can't be read — they may have been deleted or moved
        }
        return events;
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
      }
    }
  }

  return allEvents;
}
