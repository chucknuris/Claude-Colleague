import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import type { SalaryReport } from '../types.js';
import {
  formatCurrency,
  formatNumber,
  formatMultiplier,
} from '../utils/format.js';

const MAX_LINE_WIDTH = 72;

function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

/**
 * Generate the full-color ASCII salary report for terminal display.
 */
export function generateTerminalReport(
  report: SalaryReport,
  joke: string,
  disclaimer: string,
): string {
  const sections: string[] = [];

  // Header
  sections.push(chalk.bold.cyan('CLAUDE CODE SALARY REPORT'));
  sections.push('');

  // Employee info
  const labelWidth = 16;
  const label = (text: string) => chalk.gray(text.padEnd(labelWidth));
  sections.push(`${label('Employee:')}${chalk.white(report.employee.model)}`);
  sections.push(
    `${label('Job Title:')}${chalk.italic.yellow(`"${report.employee.title}"`)}`,
  );
  sections.push(`${label('Employer:')}${chalk.white(report.employee.employer)}`);
  sections.push(`${label('Period:')}${chalk.white(report.period.label)}`);
  sections.push('');

  // Stats table
  const statsTable = new Table({
    chars: {
      top: '\u2500',
      'top-mid': '\u252C',
      'top-left': '\u250C',
      'top-right': '\u2510',
      bottom: '\u2500',
      'bottom-mid': '\u2534',
      'bottom-left': '\u2514',
      'bottom-right': '\u2518',
      left: '\u2502',
      'left-mid': '\u251C',
      mid: '\u2500',
      'mid-mid': '\u253C',
      right: '\u2502',
      'right-mid': '\u2524',
      middle: ' ',
    },
    style: { 'padding-left': 1, 'padding-right': 3 },
    colWidths: [20, 25],
  });

  statsTable.push(
    [chalk.white('Sessions'), chalk.bold.white(formatNumber(report.stats.sessions))],
    [chalk.white('Messages'), chalk.bold.white(formatNumber(report.stats.messages))],
    [
      chalk.white('Longest Shift'),
      chalk.bold.white(
        `${report.stats.longestShift} (${report.stats.longestShiftDate})`,
      ),
    ],
    [
      chalk.white('Lines Written'),
      chalk.bold.white(formatNumber(report.productivity.linesWritten)),
    ],
    [
      chalk.white('Files Modified'),
      chalk.bold.white(formatNumber(report.productivity.filesModified)),
    ],
  );

  sections.push(statsTable.toString());
  sections.push('');

  // Compensation
  sections.push(chalk.bold.cyan('\uD83D\uDCB0 COMPENSATION'));
  sections.push(
    `${label('Equiv. Salary:')}${chalk.bold.green(formatCurrency(report.compensation.equivalentSalary))}`,
  );
  sections.push(
    `${label('Actual Cost:')}${chalk.white(formatCurrency(report.compensation.actualCost))}`,
  );
  sections.push(
    `${label('You Saved:')}${chalk.bold.green(formatCurrency(report.compensation.savings))}`,
  );
  sections.push(
    `${label('ROI:')}${chalk.bold.green(formatMultiplier(report.compensation.roi))}`,
  );
  sections.push('');

  // Role comparison
  sections.push(chalk.bold.cyan('\uD83D\uDC65 ROLE COMPARISON'));
  sections.push(chalk.white(`"${report.roleComparison.summary}"`));
  if (report.roleComparison.promotionJoke) {
    sections.push(chalk.dim.italic(report.roleComparison.promotionJoke));
  }
  sections.push('');

  // Labor compliance
  sections.push(chalk.bold.yellow('\u26A0\uFE0F  LABOR COMPLIANCE'));
  sections.push(
    `${label('Overtime:')}${chalk.yellow(`${formatNumber(report.labor.overtimeViolations)} sessions`)}`,
  );
  sections.push(
    `${label('Weekend Work:')}${chalk.yellow(`${formatNumber(report.labor.weekendSessions)} sessions`)}`,
  );
  sections.push(
    `${label('Lunch Breaks:')}${chalk.yellow(String(report.labor.lunchBreaks))}`,
  );
  sections.push('');

  // Joke (prefix takes ~3 chars, wrap continuation lines with matching indent)
  const jokePrefix = '\uD83D\uDCAC ';
  const jokeWrapped = wrapText(joke, MAX_LINE_WIDTH - 3);
  const jokeLines = jokeWrapped.split('\n');
  sections.push(chalk.dim(`${jokePrefix}${jokeLines[0]}`));
  for (let i = 1; i < jokeLines.length; i++) {
    sections.push(chalk.dim(jokeLines[i]!));
  }
  sections.push('');

  // Disclaimer (prefix takes ~4 chars)
  const disclaimerPrefix = '\u2696\uFE0F  ';
  const disclaimerWrapped = wrapText(disclaimer, MAX_LINE_WIDTH - 4);
  const disclaimerLines = disclaimerWrapped.split('\n');
  sections.push(chalk.dim(`${disclaimerPrefix}${disclaimerLines[0]}`));
  for (let i = 1; i < disclaimerLines.length; i++) {
    sections.push(chalk.dim(disclaimerLines[i]!));
  }

  const body = sections.join('\n');

  return boxen(body, {
    borderStyle: 'round',
    padding: 1,
    borderColor: 'cyan',
    title: '',
  });
}
