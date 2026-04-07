import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { extname, join } from 'node:path';
import type { DateRange, ToolUseEvent } from '../types.js';
import { PROJECTS_DIR } from '../utils/paths.js';

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

    const entry = parsed as Record<string, unknown>;

    // JSONL entries have a wrapper: { type, message: { role, content, ... } }
    // or flat: { role, content, ... }
    let msgObj: Record<string, unknown>;
    if (typeof entry['message'] === 'object' && entry['message'] !== null) {
      msgObj = entry['message'] as Record<string, unknown>;
    } else {
      msgObj = entry;
    }

    // Only process assistant messages
    if (msgObj['role'] !== 'assistant') continue;

    const content = msgObj['content'];
    if (!Array.isArray(content)) continue;

    // Try multiple timestamp sources
    const timestamp = typeof entry['timestamp'] === 'string'
      ? entry['timestamp']
      : typeof msgObj['createdAt'] === 'string'
        ? msgObj['createdAt']
        : typeof entry['createdAt'] === 'string'
          ? entry['createdAt']
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
 * Discover all .jsonl transcript files across all project directories.
 */
async function discoverJsonlFiles(): Promise<string[]> {
  const files: string[] = [];
  try {
    const projectDirs = await readdir(PROJECTS_DIR);
    for (const dir of projectDirs) {
      try {
        const dirPath = join(PROJECTS_DIR, dir);
        const dirEntries = await readdir(dirPath);
        for (const entry of dirEntries) {
          if (entry.endsWith('.jsonl')) {
            files.push(join(dirPath, entry));
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }
  } catch {
    // Projects directory doesn't exist
  }
  return files;
}

/**
 * Parse multiple session transcript files with a concurrency limit.
 * If sessionPaths is empty or yields no results, falls back to scanning
 * all .jsonl files in the projects directory.
 */
export async function parseAllTranscripts(
  sessionPaths: string[],
  _dateRange?: DateRange,
): Promise<ToolUseEvent[]> {
  // Use provided paths, but also discover all .jsonl files to fill gaps
  const discoveredPaths = await discoverJsonlFiles();

  // Merge: use provided paths + any discovered paths not already included
  const pathSet = new Set(sessionPaths);
  for (const p of discoveredPaths) {
    pathSet.add(p);
  }
  const allPaths = [...pathSet];

  const allEvents: ToolUseEvent[] = [];
  const concurrencyLimit = 10;

  for (let i = 0; i < allPaths.length; i += concurrencyLimit) {
    const batch = allPaths.slice(i, i + concurrencyLimit);

    const batchResults = await Promise.allSettled(
      batch.map(async (filePath) => {
        const events: ToolUseEvent[] = [];
        try {
          for await (const event of parseTranscript(filePath)) {
            events.push(event);
          }
        } catch {
          // Skip files that can't be read
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
