import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let claudeAvailableCache: boolean | null = null;

/**
 * Check if Claude CLI is available on PATH. Cached after first call.
 */
export async function isClaudeAvailable(): Promise<boolean> {
  if (claudeAvailableCache !== null) return claudeAvailableCache;
  try {
    await execFileAsync('which', ['claude'], { timeout: 5000 });
    claudeAvailableCache = true;
  } catch {
    claudeAvailableCache = false;
  }
  return claudeAvailableCache;
}

/**
 * Call `claude --print -p <prompt>` and return raw trimmed stdout.
 * Returns null on any failure.
 */
export async function callClaude(prompt: string, timeoutMs = 30_000): Promise<string | null> {
  if (!(await isClaudeAvailable())) return null;
  try {
    const { stdout } = await execFileAsync('claude', ['--print', '-p', prompt], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: { ...process.env },
    });
    const trimmed = stdout.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

/**
 * Call Claude CLI and parse response as JSON. Strips code fences before parsing.
 * Returns null on failure or if validate rejects.
 */
export async function callClaudeJson<T>(
  prompt: string,
  validate?: (parsed: unknown) => parsed is T,
  timeoutMs = 60_000,
): Promise<T | null> {
  const raw = await callClaude(prompt, timeoutMs);
  if (!raw) return null;
  try {
    const jsonStr = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}
