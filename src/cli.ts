import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'node:fs';
import type { DateFilter, ToolUseEvent } from './types.js';
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

export function run(argv: string[]) {
  const program = new Command();

  program
    .name('claude-salary')
    .description('Calculate what Claude Code would earn as a human employee')
    .version('0.1.0')
    .option('--today', 'Show today only')
    .option('--week', 'Show this week')
    .option('--month', 'Show this month')
    .option('--card', 'Generate shareable PNG card')
    .option('--invoice', 'Generate PDF invoice')
    .option('--compare', 'Detailed role comparison')
    .option('--standup', 'Generate daily standup report')
    .option('--hook-mode', 'Compact output for session hook (internal)')
    .action(async (opts) => {
      try {
        await runMain(opts);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  program
    .command('install')
    .description('Install session hook')
    .action(async () => {
      try {
        const { installHook } = await import('./hook/installer.js');
        await installHook();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  program
    .command('uninstall')
    .description('Remove session hook')
    .action(async () => {
      try {
        const { uninstallHook } = await import('./hook/installer.js');
        await uninstallHook();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${message}`));
        process.exit(1);
      }
    });

  program.parse(argv);
}

interface CliOptions {
  today?: boolean;
  week?: boolean;
  month?: boolean;
  card?: boolean;
  invoice?: boolean;
  compare?: boolean;
  standup?: boolean;
  hookMode?: boolean;
}

function resolveDateFilter(opts: CliOptions): DateFilter {
  if (opts.today) return 'today';
  if (opts.week) return 'week';
  if (opts.month) return 'month';
  return 'all';
}

async function runMain(opts: CliOptions): Promise<void> {
  // Check that Claude Code data exists
  if (!existsSync(CLAUDE_HOME)) {
    console.error(chalk.red('No Claude Code data found. Run Claude Code first!'));
    process.exit(1);
  }

  const dateFilter = resolveDateFilter(opts);
  const dateRange = getDateRange(dateFilter);

  // --standup: daily standup report
  if (opts.standup) {
    await runStandup();
    return;
  }

  // --hook-mode: compact, fast path — no transcript parsing
  if (opts.hookMode) {
    await runHookMode(dateFilter, dateRange);
    return;
  }

  // Full report flow
  const spinner = ora('Reading Claude Code data...').start();

  // Step 3-4: Parse stats-cache and session indexes
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

  // Step 5: Parse transcripts for deep analysis (always needed for full report)
  let toolEvents: ToolUseEvent[] = [];
  {
    spinner.text = 'Analyzing sessions...';
    const sessionPaths = sessions
      .filter(s => s.fullPath)
      .map(s => s.fullPath);
    toolEvents = await parseAllTranscripts(sessionPaths, dateRange, dateFilter !== 'all');
  }

  spinner.stop();

  // Step 6: Calculate salary
  const report = calculateSalary(stats, sessions, toolEvents, dateFilter);

  // Step 7: Get humor elements
  const title = getRandomTitle(toolEvents);
  const joke = getRandomJoke();
  const disclaimer = getRandomDisclaimer();

  // Step 8: Set title on report
  report.employee.title = title;

  // Step 9: Generate and print terminal report
  const output = generateTerminalReport(report, joke, disclaimer);
  console.log(output);

  // Step 10: Generate PNG card if requested
  if (opts.card) {
    const cardSpinner = ora('Generating salary card...').start();
    const cardPath = await generateCard(report);
    cardSpinner.succeed(`Salary card saved to ${chalk.cyan(cardPath)}`);
  }

  // Step 11: Generate PDF invoice if requested
  if (opts.invoice) {
    const invoiceSpinner = ora('Generating invoice...').start();
    const invoicePath = await generateInvoice(report);
    invoiceSpinner.succeed(`Invoice saved to ${chalk.cyan(invoicePath)}`);
  }

  // Step 12: Print extra role comparison if requested
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
  if (!existsSync(CLAUDE_HOME)) {
    console.error(chalk.red('No Claude Code data found. Run Claude Code first!'));
    process.exit(1);
  }

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

  spinner.stop();

  const { calculateStandup } = await import('./calculators/standup.js');
  const { getStandupMood, generateStandupSections } = await import('./humor/standup-content.js');
  const { generateStandupTerminal, generateStandupMarkdown } = await import('./generators/standup.js');

  const standupData = calculateStandup(stats, sessions, toolEvents);
  const mood = getStandupMood(standupData);
  const sections = generateStandupSections(standupData);

  // Terminal output
  console.log(generateStandupTerminal(standupData, sections, mood));

  // Markdown output
  console.log('');
  console.log(chalk.dim('--- Copiable Markdown below ---'));
  console.log('');
  console.log(generateStandupMarkdown(standupData, sections, mood));
}

async function runHookMode(
  dateFilter: DateFilter,
  dateRange: import('./types.js').DateRange,
): Promise<void> {
  // Fast path: only stats-cache and session indexes, no transcripts
  const [statsResult, sessionsResult] = await Promise.all([
    parseStatsCache(dateRange),
    parseAllSessionIndexes(dateRange),
  ]);

  if (!statsResult.data) {
    // Silent failure in hook mode — don't disrupt the user's terminal
    process.exit(1);
  }

  const stats = statsResult.data;
  const sessions = sessionsResult.data ?? [];

  // Calculate salary with empty tool events (no transcript parsing)
  const report = calculateSalary(stats, sessions, [], dateFilter);

  // Get a random title (no tool events available in hook mode)
  const title = getRandomTitle();
  report.employee.title = title;

  // Use the most recent session ID if available
  const sessionId = sessions.length > 0 ? sessions[0]!.sessionId : 'unknown';

  // Print compact post-session report
  const output = generatePostSessionReport(report, sessionId);
  console.log(output);
}
