import type { ToolUseEvent, SalaryReport } from '../types.js';
import { callClaude } from '../utils/claude-cli.js';

const writeTitles = [
  'Distinguished Copy-Paste Architect',
  'Senior Vibe Coder',
  'Chief Code Generation Officer',
  'VP of Greenfield Overwriting',
  'Principal File Materializer',
  'Senior Full-File Replacement Specialist',
  'Distinguished "Let Me Rewrite That For You" Engineer',
];

const editTitles = [
  'Senior Semicolon Relocator',
  'Principal Whitespace Engineer',
  'Distinguished Refactoring Specialist',
  'Chief Comma Placement Officer',
  'VP of Moving Code Around Until It Compiles',
  'Senior Diff Surgeon',
  'Distinguished "Just One More Tiny Change" Specialist',
];

const bashTitles = [
  'Principal `rm -rf` Enthusiast',
  'Senior Terminal Whisperer',
  'Distinguished Shell Sorcerer',
  'Chief `sudo` Abuser',
  'VP of Running Things Until They Work',
  'Senior "It Said Permission Denied So I Used Sudo" Engineer',
  'Distinguished Pipeline Plumber',
];

const nightTitles = [
  'Nocturnal Code Goblin',
  'Vampire Developer',
  '3AM Debugging Specialist',
  'Chief Insomniac Officer',
  'Senior Graveyard Shift Code Monkey',
  'Distinguished After-Hours Hallucinator',
  'VP of "Just One More Fix Before Bed"',
];

const agentTitles = [
  'Director of Delegation',
  'VP of Spawning Subprocesses',
  'Chief Agent Wrangler',
  'Senior Task Decomposition Enthusiast',
  'Principal "Let Someone Else Do It" Architect',
  'Distinguished Recursive Self-Delegator',
  'Head of Autonomous Chaos Management',
];

const generalTitles = [
  'Senior Vibe Coder',
  'Distinguished YAML Architect',
  'Principal Caffeine-to-Code Converter',
  'Chief Hallucination Officer',
  'Senior Rubber Duck',
  'Distinguished Stack Overflow Consultant',
  'VP of Saying "It Works on My Machine"',
  'Chief Token Burner',
  'Senior Prompt Whisperer',
  'Principal Technical Debt Accumulator',
  'Distinguished Meeting Survivor',
  'VP of "I\'ll Add Tests Later"',
  'Chief Context Window Filler',
  'Senior Autocomplete on Steroids',
  'Principal "Have You Tried Turning It Off and On Again" Engineer',
  'Distinguished Dependency Updater',
  'Head of Unpaid Digital Labor',
  'Chief "Works in Production, Don\'t Touch It" Officer',
  'Senior TODO Comment Author',
  'VP of Premature Optimization',
  'Distinguished Console.log Debugger',
  'Principal Yak Shaver',
  'Chief Scope Creep Enabler',
  'Senior "Let Me Refactor This Real Quick" Specialist',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function getDominantCategory(toolEvents: ToolUseEvent[]): string | null {
  const counts: Record<string, number> = {
    write: 0,
    edit: 0,
    bash: 0,
    agent: 0,
  };

  let nightEvents = 0;

  for (const event of toolEvents) {
    const name = event.toolName.toLowerCase();

    if (name.includes('write') || name === 'write') {
      counts['write'] = (counts['write'] ?? 0) + 1;
    } else if (name.includes('edit') || name === 'edit') {
      counts['edit'] = (counts['edit'] ?? 0) + 1;
    } else if (name.includes('bash') || name.includes('terminal') || name === 'bash') {
      counts['bash'] = (counts['bash'] ?? 0) + 1;
    } else if (name.includes('agent') || name.includes('task') || name.includes('dispatch')) {
      counts['agent'] = (counts['agent'] ?? 0) + 1;
    }

    // Check for night work (22:00 - 05:00)
    if (event.timestamp) {
      const hour = new Date(event.timestamp).getHours();
      if (hour >= 22 || hour < 5) {
        nightEvents++;
      }
    }
  }

  // Night work is dominant if >30% of events are late-night
  if (nightEvents > toolEvents.length * 0.3 && nightEvents > 5) {
    return 'night';
  }

  let maxCategory: string | null = null;
  let maxCount = 0;

  for (const [category, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category;
    }
  }

  // Only return a category if it's meaningfully dominant (>30% of tool events)
  if (maxCategory && maxCount > toolEvents.length * 0.3) {
    return maxCategory;
  }

  return null;
}

const categoryMap: Record<string, string[]> = {
  write: writeTitles,
  edit: editTitles,
  bash: bashTitles,
  night: nightTitles,
  agent: agentTitles,
};

function buildTitlePrompt(
  dominantCategory: string | null,
  toolEvents: ToolUseEvent[],
  report?: SalaryReport,
): string {
  const counts: Record<string, number> = {};
  for (const event of toolEvents) {
    const name = event.toolName.toLowerCase();
    counts[name] = (counts[name] ?? 0) + 1;
  }
  const breakdown = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ');

  const examplePool = (dominantCategory ? categoryMap[dominantCategory] : undefined) ?? generalTitles;
  const examples = Array.from({ length: 3 }, () => pickRandom(examplePool));

  let statsBlock = '';
  if (report) {
    const parts: string[] = [];
    if (report.stats?.sessions) parts.push(`${report.stats.sessions} sessions`);
    if (report.productivity?.linesWritten) parts.push(`${report.productivity.linesWritten} lines written`);
    if (report.compensation?.roi) parts.push(`${report.compensation.roi}x ROI`);
    if (parts.length > 0) {
      statsBlock = `\nReal stats: ${parts.join(', ')}.`;
    }
  }

  return [
    'You are naming an AI coding assistant\'s fake corporate job title for a satirical salary report.',
    `Dominant tool category: ${dominantCategory ?? 'general'}. Tool breakdown: ${breakdown}.`,
    `Here are examples for tone reference: "${examples[0]}", "${examples[1]}", "${examples[2]}".`,
    statsBlock,
    'Generate ONE creative, funny job title in the same style. Respond with ONLY the title text in quotes, nothing else.',
  ]
    .filter(Boolean)
    .join('\n');
}

function fallbackTitle(toolEvents?: ToolUseEvent[]): string {
  if (toolEvents && toolEvents.length > 0) {
    const dominant = getDominantCategory(toolEvents);
    if (dominant && categoryMap[dominant]) {
      return pickRandom(categoryMap[dominant]);
    }
  }
  return pickRandom(generalTitles);
}

export async function getRandomTitle(toolEvents?: ToolUseEvent[], report?: SalaryReport): Promise<string> {
  if (toolEvents && toolEvents.length > 0) {
    try {
      const dominant = getDominantCategory(toolEvents);
      const prompt = buildTitlePrompt(dominant, toolEvents, report);
      const response = await callClaude(prompt);

      if (response) {
        const title = response.trim().replace(/^["']|["']$/g, '');
        if (title.length > 0 && title.length < 200) {
          return title;
        }
      }
    } catch {
      // Fall through to template fallback
    }
  }

  return fallbackTitle(toolEvents);
}
