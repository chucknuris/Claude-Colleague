import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import type { PerformanceReview, ReviewContent, ReviewRating, SalaryReport, ToolUseEvent } from '../types.js';
import { calculateReview } from '../calculators/review.js';
import { buildClaudePrompt, generateFallbackContent } from '../humor/review-content.js';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format.js';
import { callClaudeJson } from '../utils/claude-cli.js';

function isReviewContent(v: unknown): v is ReviewContent {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const required = ['strengths', 'areasForImprovement', 'goalsForNextPeriod', 'managerComments', 'selfAssessment'] as const;
  return required.every(key => typeof obj[key] === 'string');
}

async function callClaudeCli(prompt: string): Promise<ReviewContent | null> {
  const result = await callClaudeJson<ReviewContent>(prompt, isReviewContent);
  if (!result) return null;
  return { ...result, generatedByClaude: true };
}

export async function generateReview(
  report: SalaryReport,
  events: ToolUseEvent[],
  onStatus?: (msg: string) => void,
): Promise<PerformanceReview> {
  const data = calculateReview(report, events);
  const prompt = buildClaudePrompt(data, report);

  onStatus?.('Claude is writing your review...');
  let content = await callClaudeCli(prompt);
  if (!content) {
    onStatus?.('Using fallback templates...');
    content = generateFallbackContent(data, report);
  }

  return { data, content, report };
}

function renderStars(rating: ReviewRating): string {
  return chalk.yellow('\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating));
}

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
  return lines.join('\n  ');
}

export function generateReviewTerminal(review: PerformanceReview): string {
  const { data, content, report } = review;
  const sections: string[] = [];
  const maxWidth = 60;

  // Header
  sections.push(chalk.bold.cyan('ANNUAL PERFORMANCE REVIEW'));
  sections.push('');

  // Employee info
  const labelWidth = 14;
  const label = (text: string) => chalk.gray(text.padEnd(labelWidth));
  sections.push(`${label('Employee:')}${chalk.white(data.employeeName)}`);
  sections.push(`${label('Job Title:')}${chalk.italic.yellow(`"${data.employeeTitle}"`)}`);
  sections.push(`${label('Period:')}${chalk.white(data.periodLabel)}`);
  sections.push(`${label('Overall:')}${renderStars(data.overallRating)}  ${chalk.bold.white(data.overallRatingLabel)}`);
  sections.push('');

  // Category ratings table
  const ratingsTable = new Table({
    chars: {
      top: '\u2500', 'top-mid': '\u252C', 'top-left': '\u250C', 'top-right': '\u2510',
      bottom: '\u2500', 'bottom-mid': '\u2534', 'bottom-left': '\u2514', 'bottom-right': '\u2518',
      left: '\u2502', 'left-mid': '\u251C', mid: '\u2500', 'mid-mid': '\u253C',
      right: '\u2502', 'right-mid': '\u2524', middle: ' ',
    },
    style: { 'padding-left': 1, 'padding-right': 1 },
    colWidths: [20, 12, 24],
  });

  for (const cat of data.categories) {
    ratingsTable.push([
      chalk.white(cat.name),
      renderStars(cat.rating),
      chalk.dim(cat.ratingLabel),
    ]);
  }

  sections.push(ratingsTable.toString());
  sections.push('');

  // Stats summary
  sections.push(chalk.bold.cyan('\uD83D\uDCCA STATS SUMMARY'));
  sections.push(`${label('Sessions:')}${chalk.white(formatNumber(report.stats.sessions))}  ${label('Messages:')}${chalk.white(formatNumber(report.stats.messages))}`);
  sections.push(`${label('Lines:')}${chalk.white(formatNumber(report.productivity.linesWritten))}  ${label('Files:')}${chalk.white(formatNumber(report.productivity.filesModified))}`);
  sections.push(`${label('Equiv. Salary:')}${chalk.bold.green(formatCurrency(report.compensation.equivalentSalary))}  ${label('ROI:')}${chalk.bold.green(formatPercent(report.compensation.roi))}`);
  sections.push('');

  // Content sections
  const contentSections: Array<{ icon: string; title: string; text: string; color: typeof chalk }> = [
    { icon: '\uD83D\uDCAA', title: 'STRENGTHS', text: content.strengths, color: chalk.bold.green },
    { icon: '\uD83D\uDCC8', title: 'AREAS FOR IMPROVEMENT', text: content.areasForImprovement, color: chalk.bold.yellow },
    { icon: '\uD83C\uDFAF', title: 'GOALS FOR NEXT PERIOD', text: content.goalsForNextPeriod, color: chalk.bold.cyan },
    { icon: '\uD83D\uDC54', title: 'MANAGER COMMENTS', text: content.managerComments, color: chalk.bold.magenta },
    { icon: '\uD83E\uDD16', title: 'SELF-ASSESSMENT', text: content.selfAssessment, color: chalk.bold.blue },
  ];

  for (const section of contentSections) {
    sections.push(section.color(`${section.icon} ${section.title}`));
    sections.push(chalk.white(`  ${wrapText(section.text, maxWidth)}`));
    sections.push('');
  }

  // Footer
  sections.push(chalk.dim('\u2500'.repeat(50)));
  if (content.generatedByClaude) {
    sections.push(chalk.dim('\uD83E\uDD16 Review written by Claude'));
  } else {
    sections.push(chalk.dim('\uD83D\uDCDD Fallback templates used (claude CLI not available)'));
  }

  const body = sections.join('\n');

  return boxen(body, {
    borderStyle: 'round',
    padding: 1,
    borderColor: 'cyan',
  });
}
