import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { DateRange, DataError, ParseResult, SessionEntry } from '../types.js';
import { PROJECTS_DIR } from '../utils/paths.js';
import { isInRange } from '../utils/date-filters.js';

/**
 * Parse all sessions-index.json files found under ~/.claude/projects/
 * AND discover standalone .jsonl transcript files (projects that lack an index).
 * Returns a flat, deduplicated, sorted list of SessionEntry objects.
 */
export async function parseAllSessionIndexes(dateRange?: DateRange): Promise<ParseResult<SessionEntry[]>> {
  const errors: DataError[] = [];
  const allEntries: SessionEntry[] = [];
  const seenPaths = new Set<string>();

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

  for (const dir of projectDirs) {
    const dirPath = join(PROJECTS_DIR, dir);
    const indexPath = join(dirPath, 'sessions-index.json');

    // Try sessions-index.json first
    try {
      const raw = await readFile(indexPath, 'utf-8');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        errors.push({
          source: indexPath,
          error: 'Invalid JSON in sessions-index.json',
          severity: 'warning',
        });
        parsed = null;
      }

      if (typeof parsed === 'object' && parsed !== null) {
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

          if (!sessionEntry.created) continue;
          if (dateRange && !isInRange(sessionEntry.created, dateRange)) continue;

          seenPaths.add(sessionEntry.fullPath);
          allEntries.push(sessionEntry);
        }
      }
    } catch {
      // No sessions-index.json — will fall through to .jsonl discovery
    }

    // Discover standalone .jsonl files not covered by the index
    try {
      const dirEntries = await readdir(dirPath);
      for (const entry of dirEntries) {
        if (!entry.endsWith('.jsonl')) continue;

        const filePath = join(dirPath, entry);
        if (seenPaths.has(filePath)) continue;

        // Extract session ID from filename (UUID.jsonl)
        const sessionId = basename(entry, '.jsonl');

        // Use file stats for created/modified timestamps
        try {
          const fileStat = await stat(filePath);
          const created = fileStat.birthtime.toISOString();
          const modified = fileStat.mtime.toISOString();

          if (dateRange && !isInRange(created, dateRange)) continue;

          seenPaths.add(filePath);
          allEntries.push({
            sessionId,
            fullPath: filePath,
            messageCount: 0, // Unknown without parsing
            created,
            modified,
            projectPath: dir,
          });
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  // Sort by created date descending (newest first)
  allEntries.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  return { data: allEntries, errors };
}
