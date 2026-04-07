import { describe, it, expect } from 'vitest';
import { getRandomTitle } from '../../src/humor/titles.js';
import { getRandomJoke, getRandomBenefit } from '../../src/humor/jokes.js';
import { getRandomDisclaimer } from '../../src/humor/disclaimers.js';
import type { ToolUseEvent } from '../../src/types.js';

function makeEvent(toolName: string, timestamp = '2026-04-07T10:00:00Z'): ToolUseEvent {
  return {
    toolName,
    filePath: '/src/file.ts',
    linesWritten: 10,
    linesChanged: 0,
    fileExtension: '.ts',
    timestamp,
  };
}

describe('getRandomTitle', () => {
  it('returns a string with no arguments', () => {
    const title = getRandomTitle();
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('returns a string with empty events', () => {
    const title = getRandomTitle([]);
    expect(typeof title).toBe('string');
  });

  it('returns write-category title for Write-heavy events', () => {
    const events = Array.from({ length: 10 }, () => makeEvent('Write'));
    const titles = new Set<string>();
    for (let i = 0; i < 50; i++) {
      titles.add(getRandomTitle(events));
    }
    // Should return at least one title (randomness)
    expect(titles.size).toBeGreaterThan(0);
  });

  it('returns bash-category title for Bash-heavy events', () => {
    const events = Array.from({ length: 10 }, () => makeEvent('Bash'));
    const title = getRandomTitle(events);
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('returns agent-category title for Agent events', () => {
    const events = Array.from({ length: 10 }, () => makeEvent('Agent'));
    const title = getRandomTitle(events);
    expect(typeof title).toBe('string');
  });
});

describe('getRandomJoke', () => {
  it('returns a non-empty string', () => {
    const joke = getRandomJoke();
    expect(typeof joke).toBe('string');
    expect(joke.length).toBeGreaterThan(0);
  });

  it('returns different values over multiple calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomJoke());
    }
    // With 24 jokes and 50 tries, we should get at least 2 different ones
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('getRandomBenefit', () => {
  it('returns a non-empty string', () => {
    const benefit = getRandomBenefit();
    expect(typeof benefit).toBe('string');
    expect(benefit.length).toBeGreaterThan(0);
  });

  it('returns different values over multiple calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomBenefit());
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('getRandomDisclaimer', () => {
  it('returns a non-empty string', () => {
    const disclaimer = getRandomDisclaimer();
    expect(typeof disclaimer).toBe('string');
    expect(disclaimer.length).toBeGreaterThan(0);
  });

  it('returns different values over multiple calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomDisclaimer());
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
