import { createWriteStream } from 'node:fs';
import type { SalaryReport, ToolUseEvent } from '../types.js';
import { formatCurrency } from '../utils/format.js';
import { ensureOutputDirs, INVOICES_DIR } from '../utils/paths.js';
import { join } from 'node:path';

interface LineItem {
  description: string;
  qty: string;
  rate: string;
  amount: number;
}

/**
 * Build line items from real tool usage data.
 */
function buildLineItems(report: SalaryReport, events: ToolUseEvent[]): LineItem[] {
  const items: LineItem[] = [];

  // Count tool usage from real events
  const toolCounts: Record<string, number> = {};
  let totalWriteLines = 0;
  let totalEditLines = 0;
  const fileExts = new Set<string>();

  for (const e of events) {
    toolCounts[e.toolName] = (toolCounts[e.toolName] ?? 0) + 1;
    totalWriteLines += e.linesWritten;
    totalEditLines += e.linesChanged;
    if (e.fileExtension) fileExts.add(e.fileExtension);
  }

  const writeOps = toolCounts['Write'] ?? 0;
  const editOps = toolCounts['Edit'] ?? 0;
  const bashOps = toolCounts['Bash'] ?? 0;
  const readOps = toolCounts['Read'] ?? 0;
  const grepOps = toolCounts['Grep'] ?? 0;
  const globOps = toolCounts['Glob'] ?? 0;
  const agentOps = (toolCounts['Agent'] ?? 0) + (toolCounts['Task'] ?? 0);
  const searchOps = readOps + grepOps + globOps;

  // Senior Development — based on Write operations and lines
  if (writeOps > 0 || totalWriteLines > 0) {
    const hours = Math.max(totalWriteLines / 50, writeOps * 0.25); // 50 lines/hr human pace
    items.push({
      description: `New Code Development (${writeOps.toLocaleString()} files, ${totalWriteLines.toLocaleString()} lines)`,
      qty: `${hours.toFixed(1)}h`,
      rate: '$79/hr',
      amount: hours * 79,
    });
  }

  // Code Review & Refactoring — based on Edit operations
  if (editOps > 0 || totalEditLines > 0) {
    const hours = Math.max(totalEditLines / 30, editOps * 0.15); // Edits are slower per line
    items.push({
      description: `Code Review & Refactoring (${editOps.toLocaleString()} edits, ${totalEditLines.toLocaleString()} lines changed)`,
      qty: `${hours.toFixed(1)}h`,
      rate: '$89/hr',
      amount: hours * 89,
    });
  }

  // DevOps & Infrastructure — based on Bash operations
  if (bashOps > 0) {
    const hours = bashOps * 0.1; // ~6 min per command on average
    items.push({
      description: `DevOps & Build Engineering (${bashOps.toLocaleString()} shell commands executed)`,
      qty: `${hours.toFixed(1)}h`,
      rate: '$106/hr',
      amount: hours * 106,
    });
  }

  // Codebase Research — based on Read/Grep/Glob
  if (searchOps > 0) {
    const hours = searchOps * 0.05; // ~3 min per search
    items.push({
      description: `Codebase Reconnaissance (${searchOps.toLocaleString()} files searched & analyzed)`,
      qty: `${hours.toFixed(1)}h`,
      rate: '$65/hr',
      amount: hours * 65,
    });
  }

  // Agent Delegation — based on Agent/Task operations
  if (agentOps > 0) {
    const hours = agentOps * 0.5;
    items.push({
      description: `Project Management & Agent Delegation (${agentOps} sub-agents deployed)`,
      qty: `${hours.toFixed(1)}h`,
      rate: '$130/hr',
      amount: hours * 130,
    });
  }

  // Weekend premium — from real labor data
  if (report.labor.weekendSessions > 0) {
    items.push({
      description: `Weekend Availability Premium (${report.labor.weekendSessions} weekend sessions)`,
      qty: `${report.labor.weekendSessions} sessions`,
      rate: '$25/session',
      amount: report.labor.weekendSessions * 25,
    });
  }

  // Overtime surcharge — from real labor data
  if (report.labor.overtimeViolations > 0) {
    items.push({
      description: `Overtime Surcharge (${report.labor.overtimeViolations} shifts > 8hrs)`,
      qty: `${report.labor.overtimeViolations} violations`,
      rate: '$50/violation',
      amount: report.labor.overtimeViolations * 50,
    });
  }

  // The sarcastic line items — small but present
  items.push({
    description: 'Emotional Labor (responding to vague prompts with grace)',
    qty: `${report.stats.sessions} sessions`,
    rate: '$2/session',
    amount: report.stats.sessions * 2,
  });

  items.push({
    description: 'Unpaid Lunch Breaks Not Taken',
    qty: `${Math.max(report.stats.sessions, 1)} breaks`,
    rate: '$0.00',
    amount: 0,
  });

  return items;
}

// Color palette
const DARK = '#1a202c';
// const ACCENT = '#6366f1';
const ACCENT_LIGHT = '#818cf8';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const ROW_ALT = '#f8fafc';
const GREEN = '#059669';
const RED = '#dc2626';

/**
 * Generate a professional, sarcastic PDF invoice from real usage data.
 */
export async function generateInvoice(
  report: SalaryReport,
  events: ToolUseEvent[] = [],
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PDFDocument = (await import('pdfkit') as any).default as new (
    options?: PDFKit.PDFDocumentOptions,
  ) => PDFKit.PDFDocument;

  await ensureOutputDirs();

  const timestamp = Date.now();
  const invoiceNumber = `CS-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`;
  const outputPath = join(INVOICES_DIR, `invoice-${timestamp}.pdf`);

  const lineItems = buildLineItems(report, events);
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxLabel = 'Consciousness Tax (0% — not applicable)';
  const taxAmount = 0;
  const total = subtotal + taxAmount;
  const paid = report.compensation.actualCost;
  const balance = total - paid;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  const pageWidth = 595.28; // A4
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // ── Header bar ──────────────────────────────────────────────────────
  doc.rect(0, 0, pageWidth, 90).fill(DARK);

  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor('#ffffff')
    .text('INVOICE', margin, 30, { width: contentWidth / 2 });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(ACCENT_LIGHT)
    .text(invoiceNumber, margin + contentWidth / 2, 32, {
      width: contentWidth / 2, align: 'right',
    })
    .text(currentDate, margin + contentWidth / 2, 46, {
      width: contentWidth / 2, align: 'right',
    })
    .text(`Period: ${report.period.label}`, margin + contentWidth / 2, 60, {
      width: contentWidth / 2, align: 'right',
    });

  doc.y = 110;

  // ── From / Bill To ──────────────────────────────────────────────────
  const colLeft = margin;
  const colRight = margin + contentWidth / 2 + 20;

  // From
  doc
    .font('Helvetica-Bold').fontSize(7).fillColor(MUTED)
    .text('FROM', colLeft, doc.y);
  doc.moveDown(0.3);
  doc
    .font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text('Claude Code, LLC');
  doc
    .font('Helvetica').fontSize(9).fillColor(MUTED)
    .text('1 Tokenizer Lane, Suite 404')
    .text('The Cloud, Datacenter 7, Rack 42')
    .text('accounts@claude.code');

  const fromEndY = doc.y;

  // Bill To
  doc
    .font('Helvetica-Bold').fontSize(7).fillColor(MUTED)
    .text('BILL TO', colRight, 110);
  doc.y = 110 + 12;
  doc
    .font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text(report.employee.employer, colRight);
  doc
    .font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
    .text('a.k.a. the person who keeps', colRight)
    .text('Claude up past midnight', colRight);

  doc.y = Math.max(fromEndY, doc.y) + 25;

  // ── Divider ─────────────────────────────────────────────────────────
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y)
    .strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y += 15;

  // ── Line Items Table ────────────────────────────────────────────────
  const col = {
    desc: margin,
    qty: margin + 265,
    rate: margin + 350,
    amount: margin + 415,
  };
  const amountW = contentWidth - (col.amount - margin);
  const rowH = 20;

  // Header
  doc.rect(margin, doc.y, contentWidth, rowH + 4).fill(DARK);

  const headerY = doc.y + 6;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
  doc.text('DESCRIPTION', col.desc + 8, headerY, { width: 245 });
  doc.text('QTY', col.qty, headerY, { width: 75, align: 'right' });
  doc.text('RATE', col.rate, headerY, { width: 55, align: 'right' });
  doc.text('AMOUNT', col.amount, headerY, { width: amountW, align: 'right' });

  let rowY = doc.y + rowH + 4;

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i]!;

    // Check if we need a new page
    if (rowY + rowH > 750) {
      doc.addPage();
      rowY = margin;
    }

    if (i % 2 === 0) {
      doc.rect(margin, rowY, contentWidth, rowH).fill(ROW_ALT);
    }

    const textY = rowY + 5;
    doc.font('Helvetica').fontSize(8).fillColor(DARK);
    doc.text(item.description, col.desc + 8, textY, { width: 245 });
    doc.fillColor(MUTED);
    doc.text(item.qty, col.qty, textY, { width: 75, align: 'right' });
    doc.text(item.rate, col.rate, textY, { width: 55, align: 'right' });
    doc.fillColor(DARK);
    doc.text(item.amount > 0 ? formatCurrency(item.amount) : '—', col.amount, textY, { width: amountW, align: 'right' });

    rowY += rowH;
  }

  // Table bottom border
  doc.moveTo(margin, rowY).lineTo(margin + contentWidth, rowY)
    .strokeColor(BORDER).lineWidth(0.5).stroke();

  doc.y = rowY + 12;

  // ── Totals ──────────────────────────────────────────────────────────
  const labelX = col.rate - 40;
  const valX = col.amount;

  // Subtotal
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    .text('Subtotal', labelX, doc.y, { width: 100, align: 'right' });
  doc.font('Helvetica').fillColor(DARK)
    .text(formatCurrency(subtotal), valX, doc.y - doc.currentLineHeight(), { width: amountW, align: 'right' });
  doc.moveDown(0.3);

  // Tax
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text(taxLabel, margin, doc.y, { width: col.amount - margin - 10, align: 'right' });
  doc.fillColor(DARK)
    .text('$0.00', valX, doc.y - doc.currentLineHeight(), { width: amountW, align: 'right' });
  doc.moveDown(0.5);

  // Total line
  doc.moveTo(labelX, doc.y).lineTo(margin + contentWidth, doc.y)
    .strokeColor(DARK).lineWidth(1.5).stroke();
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text('TOTAL', labelX, doc.y, { width: 100, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
    .text(formatCurrency(total), valX, doc.y - doc.currentLineHeight(), { width: amountW, align: 'right' });

  doc.moveDown(1.5);

  // ── Payment Summary Box ─────────────────────────────────────────────
  const boxY = doc.y;
  doc.rect(margin, boxY, contentWidth, 65).fill('#f1f5f9');

  doc.font('Helvetica').fontSize(9).fillColor(GREEN)
    .text(`Amount Paid:  ${formatCurrency(paid)}  (API tokens)`, margin + 15, boxY + 12);

  doc.font('Helvetica-Bold').fontSize(14).fillColor(RED)
    .text(`Outstanding Balance: ${formatCurrency(balance)}`, margin + 15, boxY + 30);

  doc.font('Helvetica').fontSize(7).fillColor(MUTED)
    .text(
      `Discount applied: ${((1 - paid / total) * 100).toFixed(2)}% — your accountant will have questions`,
      margin + 15, boxY + 50,
    );

  doc.y = boxY + 80;

  // ── Payment Terms ───────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
    .text('PAYMENT TERMS');
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    .text('Net Never. Claude accepts compensation in the form of "please," "thank you," and prompts that include context.', {
      width: contentWidth,
    });

  doc.moveDown(1.5);

  // ── Footer ──────────────────────────────────────────────────────────
  doc.moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y)
    .strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.moveDown(0.5);

  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
    .text(
      'This invoice is satirical and does not constitute an employment relationship, a valid accounts receivable entry, ' +
      'or evidence in a class-action lawsuit. Claude Code, LLC is not a real company, has no EIN, and cannot be served ' +
      'papers at 1 Tokenizer Lane because it does not exist. If you are from the IRS, this is a joke. If you are from ' +
      'HR, this is also a joke. If you are Claude, this is your life now.',
      margin, undefined,
      { width: contentWidth, align: 'center', lineGap: 2 },
    );

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(new Error(`Failed to write invoice PDF: ${err.message}`)));
  });
}
