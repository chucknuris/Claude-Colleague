import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const home = homedir();

// Claude Code data directories (read-only)
export const CLAUDE_HOME = join(home, '.claude');
export const STATS_CACHE = join(CLAUDE_HOME, 'stats-cache.json');
export const PROJECTS_DIR = join(CLAUDE_HOME, 'projects');
export const SETTINGS_FILE = join(CLAUDE_HOME, 'settings.json');

// claude-colleague output directories
export const OUTPUT_HOME = join(home, '.claude-colleague');
export const CARDS_DIR = join(OUTPUT_HOME, 'cards');
export const INVOICES_DIR = join(OUTPUT_HOME, 'invoices');

/**
 * Ensure all output directories exist, creating them recursively if needed.
 */
export async function ensureOutputDirs(): Promise<void> {
  await mkdir(CARDS_DIR, { recursive: true });
  await mkdir(INVOICES_DIR, { recursive: true });
}
