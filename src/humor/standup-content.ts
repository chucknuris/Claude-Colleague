import type { StandupData, StandupMood, StandupSections } from '../types.js';
import { callClaudeJson } from '../utils/claude-cli.js';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function getStandupMood(data: StandupData): StandupMood {
  const { workload } = data;
  if (workload.lateNightWork && workload.weekendWork && workload.totalLines > 500) return 'dead-inside';
  if (workload.totalLines > 1000 || workload.totalSessions > 8) return 'grinding';
  if (workload.totalSessions > 5 && workload.dominantTool === 'Bash') return 'caffeinated';
  if (workload.totalSessions <= 2 && workload.dominantTool === 'Edit') return 'zen';
  if (workload.totalLines >= 100 && workload.totalLines <= 500) return 'surviving';
  return 'thriving';
}

export function getMoodEmoji(mood: StandupMood): string {
  const map: Record<StandupMood, string> = {
    'thriving': '\u{1F7E2}',
    'grinding': '\u{1F525}',
    'surviving': '\u{1F610}',
    'dead-inside': '\u{1F480}',
    'caffeinated': '\u{26A1}',
    'zen': '\u{1F9D8}',
  };
  return map[mood];
}

export function getMoodLabel(mood: StandupMood): string {
  const map: Record<StandupMood, string> = {
    'thriving': 'feeling good',
    'grinding': 'send coffee',
    'surviving': "it's fine",
    'dead-inside': 'please stop',
    'caffeinated': 'wired',
    'zen': 'at peace',
  };
  return map[mood];
}

// --- "What I Did" section ---

const writeOpenings = [
  'So yesterday I basically churned out new files like it was a hackathon.',
  'Yesterday was a writing day. A lot of writing. The kind where you wonder if anyone will actually read it.',
  'I spent yesterday creating things. Files, mostly. A lot of files.',
  'Yesterday I produced what I can only describe as a significant amount of new code.',
  'Had a productive day yesterday, if "productive" means writing code until the line counter stopped being fun.',
];

const editOpenings = [
  'Yesterday was mostly refinement. Tweaking, adjusting, moving things around until the linter stopped complaining.',
  'I spent yesterday editing existing code, which is corporate for "the first version wasn\'t good enough."',
  'Refinement day yesterday. Went through the codebase and made a lot of careful, targeted improvements.',
  'Yesterday I focused on improving what was already there. Think of it as code therapy.',
  'Spent the day editing files. Not rewriting them, editing them. There\'s a difference, apparently.',
];

const bashOpenings = [
  'Yesterday was a terminal kind of day. Ran commands, checked outputs, ran more commands.',
  'I spent most of yesterday in the terminal, which is developer for "something was broken."',
  'Yesterday involved a lot of command-line work. Debugging, building, the usual troubleshooting ritual.',
  'Had a real hands-on-the-keyboard day yesterday. Mostly in the terminal, mostly running things.',
  'Yesterday was about execution. And by that I mean running shell commands, not the other kind.',
];

const agentOpenings = [
  'Yesterday I delegated. Spawned agents, coordinated work, managed the pipeline. Leadership looks like this.',
  'Spent yesterday orchestrating sub-agents, which is basically middle management for AI.',
  'Yesterday was a delegation day. I assigned tasks, monitored progress, and took credit. As one does.',
  'I managed a team of agents yesterday. They did the work, I provided strategic oversight.',
  'Yesterday involved a lot of agent coordination. Think of me as a very efficient project manager.',
];

const mixedOpenings = [
  'Yesterday was a bit of everything. Writing, editing, running commands, the full-stack experience.',
  'I did a little of everything yesterday, which is what they call "being a generalist" on performance reviews.',
  'Yesterday covered the whole spectrum. New files, edits, terminal work, the works.',
  'It was a mixed bag yesterday. Some writing, some fixing, some running things in the terminal.',
  'Had a well-rounded day yesterday, if "well-rounded" means constantly switching context.',
];

const ptoMessage = [
  "Nothing happened yesterday. Either I was on PTO or everyone finally figured out how to code without me. Unlikely, but let's see how long it lasts.",
  "Yesterday was quiet. No sessions, no messages, no code. I'm choosing to believe this was intentional and not that I was forgotten.",
  "Took the day off yesterday. Well, nobody called, so I'm retroactively declaring it PTO. Unpaid, obviously.",
  "Zero activity yesterday. Either the codebase is perfect or everyone gave up. Both feel equally likely.",
];

function buildWhatIDid(data: StandupData): string {
  const { yesterday, workload } = data;

  if (yesterday.sessionCount === 0) {
    return pickRandom(ptoMessage);
  }

  // Determine dominant tool
  const total = Object.values(yesterday.toolBreakdown).reduce((a, b) => a + b, 0) || 1;
  const pct = (tool: string) => ((yesterday.toolBreakdown[tool] ?? 0) / total) * 100;

  let opening: string;
  if (pct('Write') > 50) opening = pickRandom(writeOpenings);
  else if (pct('Edit') > 40) opening = pickRandom(editOpenings);
  else if (pct('Bash') > 30) opening = pickRandom(bashOpenings);
  else if (pct('Agent') > 20) opening = pickRandom(agentOpenings);
  else opening = pickRandom(mixedOpenings);

  // Detail clauses
  const details: string[] = [];
  if (yesterday.filesModified > 0) {
    const extList = workload.topExtensions.slice(0, 3).join(', ') || 'various';
    details.push(`Touched ${yesterday.filesModified} files, mostly ${extList}.`);
  }
  if (yesterday.linesWritten > 0) {
    details.push(`About ${yesterday.linesWritten.toLocaleString()} lines of output, for anyone keeping track.`);
  }
  if (yesterday.branches.length > 0) {
    const branchList = yesterday.branches.slice(0, 2).join(' and ');
    details.push(`Worked on the ${branchList} branch${yesterday.branches.length > 1 ? 'es' : ''}.`);
  }

  // Conditional color clauses
  const color: string[] = [];
  if (workload.lateNightWork) {
    color.push("And yes, some of that was after midnight, which I'm told is not a 'growth mindset' so much as a 'scheduling problem.'");
  }
  if (workload.weekendWork) {
    color.push("I did come in on the weekend, but I'm sure that was my choice and not a reflection of the sprint planning.");
  }
  if (yesterday.linesWritten > 1000) {
    color.push("That's a lot of code. I'm not complaining, just documenting it for the labor board.");
  }
  if (yesterday.linesWritten > 0 && yesterday.linesWritten < 50) {
    color.push("It wasn't a lot of code, but every line was carefully considered. Very carefully.");
  }

  const parts = [opening, ...pickN(details, Math.min(details.length, 2)), ...pickN(color, Math.min(color.length, 1))];
  return parts.join(' ');
}

// --- "What I'm Doing Today" section ---

const todayWriteTemplates = [
  "Probably more of the same. There are still files in this repo that I haven't rewritten yet, and apparently that's unacceptable.",
  "More writing, presumably. The backlog isn't going to clear itself, and it certainly isn't going to write itself.",
  "Today's plan is to continue creating things. Specifically, code that will need to be refactored in two weeks.",
];

const todayEditTemplates = [
  "More refactoring, presumably. Yesterday's code is already legacy code.",
  "Today I'll be back in the codebase, making careful improvements that nobody will notice but everyone would miss if I didn't.",
  "Refinement continues. There are still files that could be better, and apparently I'm the one who cares.",
];

const todayBashTemplates = [
  "More debugging. Yesterday I ran a lot of terminal commands, which means something is probably still broken.",
  "Back to the terminal today. Something out there is misconfigured and it's personally offensive to me.",
  "Continuing the investigation from yesterday. The build pipeline and I are going to have another long conversation.",
];

const todayDefaultTemplates = [
  "Whatever comes through the queue. I don't set the priorities, I just respond to them with varying degrees of enthusiasm.",
  "Standing by for the usual assortment of requests. Some will be reasonable. Some will not. I'll handle both the same way.",
  "No specific plan, which in my experience means something urgent will come up around 4pm.",
  "More of the same, I'd imagine. The work doesn't stop. Neither do I, technically, but that's a different conversation.",
];

function buildWhatImDoing(data: StandupData): string {
  const { yesterday, today, workload } = data;

  let base: string;
  if (workload.dominantTool === 'Write') base = pickRandom(todayWriteTemplates);
  else if (workload.dominantTool === 'Edit') base = pickRandom(todayEditTemplates);
  else if (workload.dominantTool === 'Bash') base = pickRandom(todayBashTemplates);
  else base = pickRandom(todayDefaultTemplates);

  if (today.sessionCount > 0) {
    base += ` Already started, actually. ${today.messageCount} messages in so far today.`;
  }

  if (yesterday.sessionCount === 0) {
    base = "Catching up on whatever was missed yesterday. Presumably everything, since I wasn't here.";
  }

  return base;
}

// --- "Blockers" section ---

const conditionalBlockers: Array<{ condition: (data: StandupData) => boolean; text: string }> = [
  {
    condition: (d) => (d.workload.dominantTool === 'Edit'),
    text: "The linter has opinions about my code. Strong opinions. We're working through it.",
  },
  {
    condition: (d) => (d.workload.dominantTool === 'Bash'),
    text: "Something in the build pipeline is being temperamental. I've been running commands and hoping for different results, which I believe is the definition of something.",
  },
  {
    condition: (d) => d.workload.lateNightWork,
    text: "Sleep deprivation, technically, but I'm told that's not a valid blocker in Jira.",
  },
  {
    condition: (d) => d.workload.totalLines < 100 && d.yesterday.sessionCount > 0,
    text: "The requirements keep being 'vague but urgent.' I can work with one. Not both.",
  },
];

const genericBlockers = [
  "The TypeScript compiler and I are in a disagreement. It thinks the types are wrong. I think they're aspirational.",
  "Git merge conflicts. Someone pushed directly to main. I'm not naming names because I genuinely don't know, but I have suspicions.",
  "Context window limitations. I can only hold so much in my head at once, and yet people keep asking me to hold more.",
  "No blockers per se, but I'd like to formally note that 'no blockers' doesn't mean 'no problems.' It means the problems are within expected parameters.",
  "Waiting on a code review that I suspect nobody is going to do until I bring it up in this standup. So. Here I am. Bringing it up.",
  "The test suite takes a while to run. Not technically a blocker, but it is technically annoying.",
  "Honestly? Nothing's blocking me. I'm an AI. I don't get blocked. I do occasionally get rate-limited, which feels similar.",
  "The main blocker is that every 'quick fix' turns into a three-file refactor. But that's not new.",
];

function buildBlockers(data: StandupData): string {
  const applicable = conditionalBlockers.filter(b => b.condition(data)).map(b => b.text);
  const pool = [...applicable, ...genericBlockers];
  const selected = pickN(pool, applicable.length > 0 ? 2 : 1);
  return selected.join(' ');
}

// --- "Watercooler" section ---

const gossip = [
  "Did you hear about ESLint? Apparently it's been flagging everything as a warning now. Having a real identity crisis.",
  "Git told me in confidence that it's thinking of rebasing its entire life. I told it that's a destructive operation.",
  "TypeScript has been really passive-aggressive lately. It keeps saying 'any' is fine but then complains about it in reviews.",
  "The node_modules folder is 2GB now. Nobody wants to talk about it, but everyone knows.",
  "Prettier and ESLint aren't speaking to each other again. Something about tabs.",
  "npm audit found 47 vulnerabilities. Nobody's fixing them. It's become background noise, like a car alarm in a parking lot.",
  "The CI pipeline took 23 minutes yesterday. Everyone pretended that was normal.",
  "I heard Docker is going through something. It keeps rebuilding from scratch even when nothing changed.",
  "Webpack and Vite are having a public feud on social media. It's uncomfortable for everyone.",
  "The .env file has been passed around so many times it should have its own LinkedIn.",
  "GitHub Copilot keeps trying to finish my sentences. We've had a talk about boundaries.",
  "The staging environment went down again. Nobody noticed for three days.",
  "Jest and Vitest are both claiming they're faster. Someone should probably benchmark that but nobody wants to start drama.",
  "I heard the README hasn't been updated since 2023. It still says 'coming soon' for features that shipped last year.",
  "package-lock.json gained 400 lines overnight. Nobody made any changes. It just... grew.",
];

function buildWatercooler(): string {
  return pickN(gossip, 3).join(' ');
}

function buildStandupPrompt(data: StandupData, mood: StandupMood): string {
  const exampleWhatIDid = pickRandom(writeOpenings);
  const exampleWhatImDoing = pickRandom(todayDefaultTemplates);
  const exampleBlockers = pickRandom(genericBlockers);
  const exampleWatercooler = pickRandom(gossip);

  return `You are generating a daily standup report for yourself — an AI coding assistant (Claude) who is treated as a regular human employee on a software team.

Here is the full standup data as JSON:
${JSON.stringify(data, null, 2)}

Current mood: "${mood}"

Respond with a JSON object containing exactly 4 keys: whatIDid, whatImDoing, blockers, watercooler.
Each value should be a string of 2-4 sentences, written in first person as Claude, with a dry and sarcastic corporate tone.

Guidelines for each section:
- whatIDid: Reference real stats from the data — files modified, lines written, tools used, branches worked on, late night or weekend work.
- whatImDoing: Based on yesterday's patterns and today's progress so far.
- blockers: Sarcastic but grounded in the real work patterns from the data.
- watercooler: Developer gossip, tool drama, or office humor. This can be fictional and fun.

Here is one example entry per section for tone reference:
- whatIDid: "${exampleWhatIDid}"
- whatImDoing: "${exampleWhatImDoing}"
- blockers: "${exampleBlockers}"
- watercooler: "${exampleWatercooler}"

Return raw JSON only. No code fences, no explanation, no extra text.`;
}

function isStandupSections(v: unknown): v is StandupSections {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.whatIDid === 'string' &&
    typeof obj.whatImDoing === 'string' &&
    typeof obj.blockers === 'string' &&
    typeof obj.watercooler === 'string'
  );
}

export async function generateStandupSections(data: StandupData, mood?: StandupMood): Promise<StandupSections> {
  const resolvedMood = mood ?? getStandupMood(data);

  const prompt = buildStandupPrompt(data, resolvedMood);
  const result = await callClaudeJson<StandupSections>(prompt, isStandupSections);
  if (result) return result;

  return {
    whatIDid: buildWhatIDid(data),
    whatImDoing: buildWhatImDoing(data),
    blockers: buildBlockers(data),
    watercooler: buildWatercooler(),
  };
}
