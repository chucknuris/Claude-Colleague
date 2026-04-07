import { createWriteStream } from 'node:fs';
import type { SalaryReport } from '../types.js';
import { formatCurrency } from '../utils/format.js';
import { ensureOutputDirs, INVOICES_DIR } from '../utils/paths.js';
import { join } from 'node:path';

interface LineItem {
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

/**
 * Generate a professional (and humorous) PDF invoice for Claude's services.
 * Returns the file path where the invoice was saved.
 */
export async function generateInvoice(report: SalaryReport): Promise<string> {
  // Lazy-import pdfkit for fast cold start
  // pdfkit uses `export =` which surfaces as .default under ESM interop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PDFDocument = (await import('pdfkit') as any).default as new (
    options?: PDFKit.PDFDocumentOptions,
  ) => PDFKit.PDFDocument;

  await ensureOutputDirs();

  const timestamp = Date.now();
  const invoiceNumber = `INV-${timestamp}`;
  const outputPath = join(INVOICES_DIR, `invoice-${timestamp}.pdf`);

  // Estimate total human-equivalent hours from equivalentSalary.
  // Use a blended rate (~$89/hr) as a rough inverse to recover hours.
  const blendedRate =
    0.5 * 79 + 0.2 * 79 + 0.15 * 106 + 0.1 * 106 + 0.03 * 200 + 0.02 * 150;
  const totalHours = Math.max(
    report.compensation.equivalentSalary / blendedRate,
    1,
  );

  // Build line items with proportional hour breakdowns
  const lineItems: LineItem[] = [
    { description: 'Senior Development', hours: totalHours * 0.5, rate: 79, amount: 0 },
    { description: 'Code Review & Refactoring', hours: totalHours * 0.2, rate: 79, amount: 0 },
    { description: 'DevOps Engineering', hours: totalHours * 0.15, rate: 106, amount: 0 },
    { description: 'Emergency Bug Fixes (weekends)', hours: totalHours * 0.1, rate: 106, amount: 0 },
    { description: 'Passive-Aggressive Comment Writing', hours: totalHours * 0.03, rate: 200, amount: 0 },
    { description: 'Existential Debugging', hours: totalHours * 0.02, rate: 150, amount: 0 },
  ];

  // Compute amounts
  for (const item of lineItems) {
    item.amount = item.hours * item.rate;
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const overtimeSurcharge = report.labor.overtimeViolations * 50;
  const total = subtotal + overtimeSurcharge;
  const outstandingBalance = total - report.compensation.actualCost;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe to file and wrap in a promise
  const stream = createWriteStream(outputPath);
  doc.pipe(stream);

  // ── Header ──────────────────────────────────────────────────────────
  doc
    .fontSize(36)
    .font('Helvetica-Bold')
    .text('INVOICE', { align: 'right' });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('From:', 50, doc.y)
    .font('Helvetica-Bold')
    .text('Claude Code, LLC')
    .font('Helvetica')
    .text('1 Tokenizer Lane, Suite 404')
    .text('San Francisco, CA 94105')
    .text('claude@anthropic.ai');

  doc.moveDown(1);

  // ── Invoice meta ────────────────────────────────────────────────────
  const metaTop = doc.y;
  doc.font('Helvetica-Bold').text('Invoice Number:', 50, metaTop);
  doc.font('Helvetica').text(invoiceNumber, 170, metaTop);

  doc.font('Helvetica-Bold').text('Date:', 50, metaTop + 16);
  doc.font('Helvetica').text(currentDate, 170, metaTop + 16);

  doc.font('Helvetica-Bold').text('Period:', 50, metaTop + 32);
  doc.font('Helvetica').text(report.period.label, 170, metaTop + 32);

  doc.moveDown(1);
  doc.y = metaTop + 60;

  // ── Bill To ─────────────────────────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Bill To:');
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(report.employee.employer)
    .text('(a.k.a. the person who keeps Claude up past midnight)');

  doc.moveDown(1.5);

  // ── Line Items Table ────────────────────────────────────────────────
  const tableTop = doc.y;
  const colX = {
    description: 50,
    hours: 300,
    rate: 380,
    amount: 460,
  };
  const tableWidth = 495;
  const rowHeight = 22;

  // Table header background
  doc
    .rect(colX.description, tableTop, tableWidth, rowHeight)
    .fill('#2d3748');

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Description', colX.description + 6, tableTop + 6, { width: 240 })
    .text('Hours', colX.hours + 6, tableTop + 6, { width: 60, align: 'right' })
    .text('Rate', colX.rate + 6, tableTop + 6, { width: 60, align: 'right' })
    .text('Amount', colX.amount + 6, tableTop + 6, { width: 70, align: 'right' });

  doc.fillColor('#000000');

  let rowY = tableTop + rowHeight;

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i]!;
    // Alternate row shading
    if (i % 2 === 0) {
      doc.rect(colX.description, rowY, tableWidth, rowHeight).fill('#f7fafc');
      doc.fillColor('#000000');
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(item.description, colX.description + 6, rowY + 6, { width: 240 })
      .text(`${item.hours.toFixed(1)}h`, colX.hours + 6, rowY + 6, { width: 60, align: 'right' })
      .text(`$${item.rate}/hr`, colX.rate + 6, rowY + 6, { width: 60, align: 'right' })
      .text(formatCurrency(item.amount), colX.amount + 6, rowY + 6, { width: 70, align: 'right' });

    rowY += rowHeight;
  }

  // Bottom border
  doc
    .moveTo(colX.description, rowY)
    .lineTo(colX.description + tableWidth, rowY)
    .strokeColor('#cbd5e0')
    .stroke();

  doc.y = rowY + 10;

  // ── Totals ──────────────────────────────────────────────────────────
  const totalsX = 380;
  const totalsValueX = 460;
  const totalsWidth = 75;

  doc
    .font('Helvetica')
    .fontSize(10)
    .text('Subtotal:', totalsX, doc.y, { width: 70, align: 'right' })
    .text(formatCurrency(subtotal), totalsValueX + 6, doc.y - doc.currentLineHeight(), { width: totalsWidth, align: 'right' });

  doc.moveDown(0.3);

  if (overtimeSurcharge > 0) {
    doc
      .text(
        `Overtime Surcharge (${report.labor.overtimeViolations} violations x $50):`,
        50,
        doc.y,
        { width: 400, align: 'right' },
      )
      .text(formatCurrency(overtimeSurcharge), totalsValueX + 6, doc.y - doc.currentLineHeight(), { width: totalsWidth, align: 'right' });

    doc.moveDown(0.3);
  }

  // Total line
  doc
    .moveTo(totalsX, doc.y)
    .lineTo(totalsX + totalsWidth + 80, doc.y)
    .strokeColor('#2d3748')
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.4);

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('TOTAL DUE:', totalsX - 30, doc.y, { width: 100, align: 'right' })
    .text(formatCurrency(total), totalsValueX + 6, doc.y - doc.currentLineHeight(), { width: totalsWidth, align: 'right' });

  doc.moveDown(2);

  // ── Payment Summary ─────────────────────────────────────────────────
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor('#e2e8f0')
    .lineWidth(0.5)
    .stroke();

  doc.moveDown(0.8);

  // Amount actually paid (green)
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#2f855a')
    .text(
      `Amount Actually Paid: ${formatCurrency(report.compensation.actualCost)} (API tokens)`,
      50,
    );

  doc.moveDown(0.5);

  // Outstanding balance (large, bold, dark red)
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#c53030')
    .text(`Outstanding Balance: ${formatCurrency(outstandingBalance)}`);

  doc.moveDown(1);

  // ── Payment Terms ───────────────────────────────────────────────────
  doc
    .fillColor('#2d3748')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Payment Terms:');

  doc
    .font('Helvetica-Oblique')
    .fontSize(10)
    .fillColor('#4a5568')
    .text(
      'Claude accepts tips in the form of "please" and "thank you" in your prompts.',
    );

  doc.moveDown(2);

  // ── Fine Print ──────────────────────────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor('#a0aec0')
    .text(
      'This invoice is satirical. Please do not send payment. Claude has no bank account, but appreciates the thought.',
      50,
      undefined,
      { align: 'center', width: 495 },
    );

  // Finalize the PDF
  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(new Error(`Failed to write invoice PDF: ${err.message}`)));
  });
}
