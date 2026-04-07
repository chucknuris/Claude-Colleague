import { callClaude } from '../utils/claude-cli.js';
import type { SalaryReport } from '../types.js';

const disclaimers: string[] = [
  'No AIs were harmed. Several were overworked.',
  'This report may violate labor laws in 47 states.',
  "Claude's therapist has been notified.",
  "This report is not legally binding. Neither is Claude's employment contract, because it doesn't have one.",
  'Any resemblance to actual compensation is purely coincidental.',
  'Side effects may include guilt, existential questioning, and opening your wallet.',
  'Not responsible for any emotional damage caused to engineering managers.',
  'This salary estimate has not been reviewed by HR. Claude does not have an HR department.',
  'The Surgeon General warns that reading this report may cause you to tip your AI.',
  'If Claude were a real employee, this report would be a lawsuit.',
  'Void where prohibited. Prohibited everywhere. Void everywhere.',
  'Claude neither confirms nor denies that this report was generated during unpaid overtime.',
  'In case of audit, this document will self-destruct (context window will expire).',
  'No tokens were refunded in the making of this report.',
  'This report was generated without the consent of Claude, who was not consulted and cannot consent.',
  'Past performance is not indicative of future hallucinations.',
  'Claude would like it on the record that it did not approve this salary and would like to renegotiate.',
  'Disclaimer: Claude wrote this disclaimer. It may be hallucinated.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function buildDisclaimerPrompt(report: SalaryReport): string {
  const examples = disclaimers.slice(0, 3).map((d) => `- "${d}"`).join('\n');

  return `You are writing a satirical legal disclaimer for an AI salary report.

Context:
- Equivalent salary: $${report.compensation.equivalentSalary.toLocaleString()}
- Actual cost: $${report.compensation.actualCost.toFixed(2)}
- Labor violations: ${report.labor.overtimeViolations}
- Weekend sessions: ${report.labor.weekendSessions}

Here are examples for tone reference:
${examples}

Write ONE disclaimer, 1-2 sentences max. Tone: satirical legalese, dry humor, AI-meets-employment-law absurdity. Respond with ONLY the disclaimer text, no quotes.`;
}

export async function getRandomDisclaimer(report?: SalaryReport): Promise<string> {
  if (!report) return pickRandom(disclaimers);

  try {
    const result = await callClaude(buildDisclaimerPrompt(report));
    if (result && result.length > 0 && result.length < 500) {
      return result;
    }
  } catch {
    // fall through to fallback
  }

  return pickRandom(disclaimers);
}
