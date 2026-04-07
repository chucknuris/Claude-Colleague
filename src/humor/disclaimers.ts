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

export function getRandomDisclaimer(): string {
  return pickRandom(disclaimers);
}
