import { readFile, writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import { SETTINGS_FILE } from '../utils/paths.js';

const HOOK_COMMAND = 'npx claude-salary --hook-mode';

export async function installHook(): Promise<void> {
  let settings: Record<string, unknown>;

  try {
    const raw = await readFile(SETTINGS_FILE, 'utf-8');
    settings = JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      settings = {};
    } else if (err instanceof SyntaxError) {
      console.error(chalk.red('Error: ~/.claude/settings.json contains invalid JSON.'));
      return;
    } else {
      throw err;
    }
  }

  // Ensure hooks.SessionEnd array exists
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown>;

  if (!Array.isArray(hooks.SessionEnd)) {
    hooks.SessionEnd = [];
  }
  const sessionEndHooks = hooks.SessionEnd as Array<Record<string, unknown>>;

  // Check if already installed
  const alreadyInstalled = sessionEndHooks.some((entry) => {
    if (!Array.isArray(entry.hooks)) return false;
    return (entry.hooks as Array<Record<string, unknown>>).some(
      (h) => typeof h.command === 'string' && (h.command as string).includes('claude-salary'),
    );
  });

  if (alreadyInstalled) {
    console.log(chalk.yellow('Hook already installed.'));
    return;
  }

  // Add the hook entry
  sessionEndHooks.push({
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: HOOK_COMMAND,
      },
    ],
  });

  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  console.log(chalk.green('claude-salary SessionEnd hook installed successfully.'));
}

export async function uninstallHook(): Promise<void> {
  let settings: Record<string, unknown>;

  try {
    const raw = await readFile(SETTINGS_FILE, 'utf-8');
    settings = JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.yellow('No settings file found.'));
      return;
    } else if (err instanceof SyntaxError) {
      console.error(chalk.red('Error: ~/.claude/settings.json contains invalid JSON.'));
      return;
    } else {
      throw err;
    }
  }

  const hooks = settings.hooks as Record<string, unknown> | undefined;
  if (!hooks || !Array.isArray(hooks.SessionEnd)) {
    console.log(chalk.yellow('No SessionEnd hooks found. Nothing to uninstall.'));
    return;
  }

  const sessionEndHooks = hooks.SessionEnd as Array<Record<string, unknown>>;
  const filtered = sessionEndHooks.filter((entry) => {
    if (!Array.isArray(entry.hooks)) return true;
    return !(entry.hooks as Array<Record<string, unknown>>).some(
      (h) => typeof h.command === 'string' && (h.command as string).includes('claude-salary'),
    );
  });

  if (filtered.length === sessionEndHooks.length) {
    console.log(chalk.yellow('No claude-salary hook found. Nothing to uninstall.'));
    return;
  }

  hooks.SessionEnd = filtered;
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  console.log(chalk.green('claude-salary SessionEnd hook removed successfully.'));
}
