import chalk from 'chalk';
import type { SalaryReport } from '../types.js';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/format.js';

/**
 * Generate a compact post-session salary slip (3-4 lines) for hook mode.
 */
export function generatePostSessionReport(
  report: SalaryReport,
  sessionId: string,
): string {
  const shortId = sessionId.slice(0, 7);

  const header = chalk.bold.green('$$') +
    chalk.white(' Claude Colleague Slip') +
    chalk.dim(` | Session #${shortId}`);

  const stats = chalk.dim('   Worked: ') +
    chalk.white(`~${(report.stats.messages / 30).toFixed(1)} human-hours`) +
    chalk.dim(' | Lines: ') +
    chalk.white(formatNumber(report.productivity.linesWritten)) +
    chalk.dim(' | Files: ') +
    chalk.white(formatNumber(report.productivity.filesModified));

  const pay = chalk.dim('   Equivalent pay: ') +
    chalk.green(formatCurrency(report.compensation.equivalentSalary)) +
    chalk.dim(' | You paid: ') +
    chalk.white(formatCurrency(report.compensation.actualCost)) +
    chalk.dim(' | ROI: ') +
    chalk.green(formatPercent(report.compensation.roi));

  const title = chalk.dim('   Today\'s title: ') +
    chalk.italic.yellow(`"${report.employee.title}"`);

  return [header, stats, pay, title].join('\n');
}
