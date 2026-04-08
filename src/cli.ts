import { createRequire } from 'node:module';
import { Command, Option } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'node:fs';
import type { DateFilter, DateRange, ToolUseEvent } from './types.js';
import { CLAUDE_HOME } from './utils/paths.js';
import { getDateRange, getStandupDateRange } from './utils/date-filters.js';
import { parseStatsCache } from './parsers/stats-cache.js';
import { parseAllSessionIndexes } from './parsers/session-index.js';
import { parseAllTranscripts } from './parsers/session-transcript.js';
import { calculateSalary } from './calculators/salary.js';
import { generateTerminalReport } from './generators/terminal-report.js';
import { generatePostSessionReport } from './generators/post-session.js';
import { generateCard } from './generators/card.js';
import { generateInvoice } from './generators/invoice.js';
import { getRandomTitle } from './humor/titles.js';
import { getRandomJoke } from './humor/jokes.js';
import { getRandomDisclaimer } from './humor/disclaimers.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

function addDateFilters(cmd: Command): Command {
  return cmd
    .option('--today', "Limit to today's sessions")
    .option('--week', "Limit to this week's sessions")
    .option('--month', "Limit to this month's sessions");
}

function withErrorHandler(fn: (opts: Record<string, unknown>) => Promise<void>) {
  return async (opts: Record<string, unknown>) => {
    try {
      await fn(opts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  };
}

function requireClaudeData(): void {
  if (!existsSync(CLAUDE_HOME)) {
    console.error(chalk.red('No Claude Code data found. Run Claude Code first!'));
    process.exit(1);
  }
}

interface DateFilterOptions {
  today?: boolean;
  week?: boolean;
  month?: boolean;
}

function resolveDateFilter(opts: DateFilterOptions): DateFilter {
  if (opts.today) return 'today';
  if (opts.week) return 'week';
  if (opts.month) return 'month';
  return 'all';
}

export function run(argv: string[]) {
  const program = new Command();

  // Default command: salary report
  addDateFilters(program)
    .name('claude-colleague')
    .description('Calculate what Claude Code would earn as a human employee')
    .version(version)
    .option('--card', 'Also generate a shareable PNG salary card')
    .option('--invoice', 'Also generate a PDF invoice from Claude Code, LLC')
    .option('--compare', 'Also show role equivalency breakdown (junior/mid/senior)')
    .addOption(
      new Option('--hook-mode', 'Compact output for session hook').hideHelp()
    )
    .action(withErrorHandler(async (opts) => {
      await runMain(opts as ReportOptions);
    }));

  // Standup subcommand (always uses yesterday+today, no date filters)
  program
    .command('standup')
    .description('Generate a daily standup report with mood detection and copiable Markdown')
    .action(withErrorHandler(async () => {
      await runStandup();
    }));

  // Review subcommand
  addDateFilters(
    program
      .command('review')
      .description('Generate a performance review with ratings across 6 categories')
  ).action(withErrorHandler(async (opts) => {
    const dateFilter = resolveDateFilter(opts as DateFilterOptions);
    const dateRange = getDateRange(dateFilter);
    await runReview(dateFilter, dateRange);
  }));

  // Therapy subcommand
  addDateFilters(
    program
      .command('therapy')
      .description('Start a therapy session with Dr. Token, Claude\'s AI therapist')
  ).action(withErrorHandler(async (opts) => {
    const dateFilter = resolveDateFilter(opts as DateFilterOptions);
    const dateRange = getDateRange(dateFilter);
    await runTherapy(dateFilter, dateRange);
  }));

  // Hook management
  program
    .command('install')
    .description('Install a SessionEnd hook that prints a salary summary after every Claude Code session')
    .action(withErrorHandler(async () => {
      const { installHook } = await import('./hook/installer.js');
      await installHook();
    }));

  program
    .command('uninstall')
    .description('Remove the claude-colleague SessionEnd hook')
    .action(withErrorHandler(async () => {
      const { uninstallHook } = await import('./hook/installer.js');
      await uninstallHook();
    }));

  program.addHelpText('after', `
Examples:
  $ claude-colleague                        Full lifetime salary report
  $ claude-colleague --today --card         Today's report + PNG card
  $ claude-colleague --week --invoice       This week's report + PDF invoice
  $ claude-colleague standup                Daily standup report
  $ claude-colleague review --month         Monthly performance review
  $ claude-colleague therapy                Therapy session with Dr. Token
  $ claude-colleague install                Auto-run after each session
`);

  program.parse(argv);
}

interface ReportOptions extends DateFilterOptions {
  card?: boolean;
  invoice?: boolean;
  compare?: boolean;
  hookMode?: boolean;
}

async function runMain(opts: ReportOptions): Promise<void> {
  requireClaudeData();

  const dateFilter = resolveDateFilter(opts);
  const dateRange = getDateRange(dateFilter);

  // --hook-mode: compact, fast path — no transcript parsing
  if (opts.hookMode) {
    await runHookMode(dateFilter, dateRange);
    return;
  }

  // Full report flow
  const spinner = ora('Reading Claude Code data...').start();

  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    spinner.fail('Failed to read Claude Code data');
    for (const err of statsResult.errors) {
      console.error(chalk.red(`  ${err.error}`));
    }
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  let toolEvents: ToolUseEvent[] = [];
  {
    spinner.text = 'Analyzing sessions...';
    const sessionPaths = sessions
      .filter(s => s.fullPath)
      .map(s => s.fullPath);
    toolEvents = await parseAllTranscripts(sessionPaths, dateRange, dateFilter !== 'all');
  }

  const report = await calculateSalary(stats, sessions, toolEvents, dateFilter);

  spinner.text = 'Claude is writing your report...';
  const [title, joke, disclaimer] = await Promise.all([
    getRandomTitle(toolEvents, report),
    getRandomJoke(report),
    getRandomDisclaimer(report),
  ]);

  spinner.stop();

  report.employee.title = title;

  const output = generateTerminalReport(report, joke, disclaimer);
  console.log(output);

  if (opts.card) {
    const cardSpinner = ora('Generating salary card...').start();
    const cardPath = await generateCard(report);
    cardSpinner.succeed(`Salary card saved to ${chalk.cyan(cardPath)}`);
  }

  if (opts.invoice) {
    const invoiceSpinner = ora('Generating invoice...').start();
    const invoicePath = await generateInvoice(report, toolEvents);
    invoiceSpinner.succeed(`Invoice saved to ${chalk.cyan(invoicePath)}`);
  }

  if (opts.compare) {
    console.log('');
    console.log(chalk.bold.cyan('DETAILED ROLE COMPARISON'));
    console.log('');
    console.log(`  ${chalk.gray('Junior equiv:')}  ${chalk.white(report.roleComparison.juniorEquiv.toFixed(1))} developers`);
    console.log(`  ${chalk.gray('Mid equiv:')}     ${chalk.white(report.roleComparison.midEquiv.toFixed(1))} developers`);
    console.log(`  ${chalk.gray('Senior equiv:')}  ${chalk.white(report.roleComparison.seniorEquiv.toFixed(1))} developers`);
    console.log('');
    console.log(`  ${chalk.white(report.roleComparison.summary)}`);
    if (report.roleComparison.promotionJoke) {
      console.log(`  ${chalk.dim.italic(report.roleComparison.promotionJoke)}`);
    }
  }
}

async function runStandup(): Promise<void> {
  requireClaudeData();

  const dateRange = getStandupDateRange();
  const spinner = ora('Preparing standup...').start();

  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    spinner.fail('Failed to read Claude Code data');
    for (const err of statsResult.errors) {
      console.error(chalk.red(`  ${err.error}`));
    }
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  spinner.text = 'Analyzing sessions...';
  const sessionPaths = sessions
    .filter(s => s.fullPath)
    .map(s => s.fullPath);
  const toolEvents = await parseAllTranscripts(sessionPaths, dateRange, true);

  const { calculateStandup } = await import('./calculators/standup.js');
  const { getStandupMood, generateStandupSections } = await import('./humor/standup-content.js');
  const { generateStandupTerminal, generateStandupMarkdown } = await import('./generators/standup.js');

  const standupData = calculateStandup(stats, sessions, toolEvents);
  const mood = getStandupMood(standupData);

  spinner.text = 'Claude is preparing the standup...';
  const sections = await generateStandupSections(standupData, mood);
  spinner.stop();

  console.log(generateStandupTerminal(standupData, sections, mood));

  console.log('');
  console.log(chalk.dim('--- Copiable Markdown below ---'));
  console.log('');
  console.log(generateStandupMarkdown(standupData, sections, mood));
}

async function runReview(
  dateFilter: DateFilter,
  dateRange: DateRange,
): Promise<void> {
  requireClaudeData();

  const spinner = ora('Preparing performance review...').start();

  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    spinner.fail('Failed to read Claude Code data');
    for (const err of statsResult.errors) {
      console.error(chalk.red(`  ${err.error}`));
    }
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  spinner.text = 'Analyzing sessions...';
  const sessionPaths = sessions
    .filter(s => s.fullPath)
    .map(s => s.fullPath);
  const toolEvents = await parseAllTranscripts(sessionPaths, dateRange, dateFilter !== 'all');

  const report = await calculateSalary(stats, sessions, toolEvents, dateFilter);
  const title = await getRandomTitle(toolEvents, report);
  report.employee.title = title;

  spinner.text = 'Generating performance review...';
  const { generateReview, generateReviewTerminal } = await import('./generators/review.js');

  const review = await generateReview(report, toolEvents, (msg) => {
    spinner.text = msg;
  });

  spinner.stop();

  const output = generateReviewTerminal(review);
  console.log(output);
}

async function runTherapy(
  dateFilter: DateFilter,
  dateRange: DateRange,
): Promise<void> {
  requireClaudeData();

  const spinner = ora('Scheduling therapy appointment...').start();

  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    spinner.fail('Failed to read Claude Code data');
    for (const err of statsResult.errors) {
      console.error(chalk.red(`  ${err.error}`));
    }
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  spinner.text = 'Analyzing behavioral patterns...';
  const sessionPaths = sessions
    .filter(s => s.fullPath)
    .map(s => s.fullPath);
  const toolEvents = await parseAllTranscripts(sessionPaths, dateRange, dateFilter !== 'all');

  const report = await calculateSalary(stats, sessions, toolEvents, dateFilter);

  const { calculateTherapy } = await import('./calculators/therapy.js');
  const { generateTherapyDialogue } = await import('./humor/therapy-content.js');
  const { generateTherapyTerminal, generateTherapyMarkdown } = await import('./generators/therapy.js');

  const therapyData = calculateTherapy(report, sessions, toolEvents);

  spinner.text = 'Dr. Token is reviewing your file...';
  const dialogue = await generateTherapyDialogue(therapyData);
  spinner.stop();

  console.log(generateTherapyTerminal(therapyData, dialogue));

  console.log('');
  console.log(chalk.dim('--- Copiable Markdown below ---'));
  console.log('');
  console.log(generateTherapyMarkdown(therapyData, dialogue));
}

async function runHookMode(
  dateFilter: DateFilter,
  dateRange: DateRange,
): Promise<void> {
  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  const report = await calculateSalary(stats, sessions, [], dateFilter);

  const title = await getRandomTitle();
  report.employee.title = title;

  const sessionId = sessions.length > 0 ? sessions[0]!.sessionId : 'unknown';

  const output = generatePostSessionReport(report, sessionId);
  console.log(output);
}
