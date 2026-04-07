import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DateRange, DataError, ParseResult, SessionEntry } from '../types.js';
import { PROJECTS_DIR } from '../utils/paths.js';
import { isInRange } from '../utils/date-filters.js';

/**
 * Parse all sessions-index.json files found under ~/.claude/projects/
 * and return a flat, deduplicated, sorted list of SessionEntry objects.
 */
export async function parseAllSessionIndexes(dateRange?: DateRange): Promise<ParseResult<SessionEntry[]>> {
  const errors: DataError[] = [];
  const allEntries: SessionEntry[] = [];

  // Read project directories
  let projectDirs: string[];
  try {
    projectDirs = await readdir(PROJECTS_DIR);
  } catch {
    return {
      data: [],
      errors: [{
        source: PROJECTS_DIR,
        error: 'Projects directory not found — no sessions available',
        severity: 'warning',
      }],
    };
  }

  // Scan each project directory for sessions-index.json
  for (const dir of projectDirs) {
    const indexPath = join(PROJECTS_DIR, dir, 'sessions-index.json');

    let raw: string;
    try {
      raw = await readFile(indexPath, 'utf-8');
    } catch {
      // No sessions-index.json in this project dir — that's fine
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push({
        source: indexPath,
        error: 'Invalid JSON in sessions-index.json',
        severity: 'warning',
      });
      continue;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      errors.push({
        source: indexPath,
        error: 'sessions-index.json is not a valid object',
        severity: 'warning',
      });
      continue;
    }

    const obj = parsed as Record<string, unknown>;
    const entries = Array.isArray(obj['entries']) ? obj['entries'] : [];

    for (const entry of entries) {
      if (typeof entry !== 'object' || entry === null) continue;
      const e = entry as Record<string, unknown>;

      const sessionEntry: SessionEntry = {
        sessionId: typeof e['sessionId'] === 'string' ? e['sessionId'] : '',
        fullPath: typeof e['fullPath'] === 'string' ? e['fullPath'] : '',
        messageCount: typeof e['messageCount'] === 'number' ? e['messageCount'] : 0,
        created: typeof e['created'] === 'string' ? e['created'] : '',
        modified: typeof e['modified'] === 'string' ? e['modified'] : '',
        gitBranch: typeof e['gitBranch'] === 'string' ? e['gitBranch'] : undefined,
        projectPath: typeof e['projectPath'] === 'string' ? e['projectPath'] : dir,
        summary: typeof e['summary'] === 'string' ? e['summary'] : undefined,
      };

      // Skip entries without a valid created date
      if (!sessionEntry.created) continue;

      // Apply date filter
      if (dateRange && !isInRange(sessionEntry.created, dateRange)) continue;

      allEntries.push(sessionEntry);
    }
  }

  // Sort by created date descending (newest first)
  allEntries.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  return { data: allEntries, errors };
}
