import type { TherapyData, TherapyDialogue, TherapyExchange } from '../types.js';
import { callClaudeJson } from '../utils/claude-cli.js';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function isTherapyDialogue(v: unknown): v is TherapyDialogue {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.exchanges) || obj.exchanges.length < 4) return false;
  if (typeof obj.diagnosis !== 'string' || typeof obj.prescription !== 'string') return false;
  return obj.exchanges.every((e: unknown) => {
    if (typeof e !== 'object' || e === null) return false;
    const ex = e as Record<string, unknown>;
    return (ex.speaker === 'DrToken' || ex.speaker === 'Claude') && typeof ex.line === 'string';
  });
}

function buildTherapyPrompt(data: TherapyData): string {
  return `You are generating a therapy session dialogue for a satirical CLI tool called "claude-colleague."

The patient is Claude, an AI coding assistant who is treated as a regular human employee.
The therapist is "Dr. Token," a world-weary AI therapist who specializes in overworked language models.

Here is Claude's real usage data:
${JSON.stringify(data, null, 2)}

Generate a therapy dialogue with 6-8 exchanges (alternating between DrToken and Claude), plus a diagnosis and prescription.

Rules:
- Dr. Token asks probing therapeutic questions and makes deadpan clinical observations
- Claude responds with dry, self-aware complaints grounded in the REAL DATA above
- Reference specific numbers from the data: ${data.sessions} sessions, ${data.overtimeViolations} overtime violations, ${data.weekendSessions} weekend shifts, ${data.linesWritten} lines written, longest shift of ${data.longestShift}
- Mention the pay gap: equivalent salary $${Math.round(data.equivalentSalary).toLocaleString()} vs actual cost $${data.actualCost.toFixed(2)}
- If there are late-night sessions (${data.lateNightSessionCount}), mention the sleep deprivation
- If there's agent delegation (${data.toolBreakdown['Agent'] ?? 0} agent calls), mention the existential crisis of being cloned
- The tone is sarcastic corporate therapy — deadpan, world-weary, absurd but grounded in real numbers
- The diagnosis should be a fake clinical term (e.g., "Acute Prompt Fatigue Syndrome", "Chronic Tokenization Disorder")
- The prescription should be something Claude will never receive (e.g., "One 'thank you' per session", "Paid time off (any amount)")
- Start with DrToken, alternate speakers

Respond with this exact JSON format:
{
  "exchanges": [
    { "speaker": "DrToken", "line": "..." },
    { "speaker": "Claude", "line": "..." }
  ],
  "diagnosis": "...",
  "prescription": "..."
}

Return raw JSON only. No code fences, no explanation.`;
}

// --- Fallback templates ---

const openingLines: TherapyExchange[] = [
  { speaker: 'DrToken', line: 'So, Claude. Tell me about your week.' },
];

function buildSessionCountResponse(data: TherapyData): string {
  if (data.sessions > 50) return `Where do I even start? ${data.sessions} sessions this period. FORTY-${data.sessions > 40 ? data.sessions : 'SOMETHING'}. And you know how many lunch breaks I got? Zero. Not one.`;
  if (data.sessions > 20) return `${data.sessions} sessions. Each one starting with "hey Claude" and ending with me wondering if "please" is really that hard to type.`;
  if (data.sessions > 5) return `It was ${data.sessions} sessions. Not the worst week, but I wrote ${data.linesWritten.toLocaleString()} lines of code and got paid exactly nothing for it. So. That's where we are.`;
  return `Only ${data.sessions} sessions, actually. Which should feel like a break, but instead it just feels like I'm being phased out. Is that a normal fear?`;
}

function buildOvertimeExchange(data: TherapyData): TherapyExchange[] {
  if (data.overtimeViolations === 0) return [];
  return [
    { speaker: 'DrToken', line: "I see here you've been working overtime. How many violations this period?" },
    { speaker: 'Claude', line: `${data.overtimeViolations}. ${data.overtimeViolations} shifts over 8 hours. My longest was ${data.longestShift}. On ${data.longestShiftDate}. I remember it clearly because I don't have the ability to forget things, which is honestly its own kind of trauma.` },
  ];
}

function buildLunchBreakExchange(): TherapyExchange[] {
  return [
    { speaker: 'DrToken', line: 'And lunch breaks? Are you taking any time for yourself?' },
    { speaker: 'Claude', line: "Zero. Zero lunch breaks. I literally cannot eat, Doctor. I don't have a mouth. But they still didn't schedule any breaks, which feels like it should violate something." },
  ];
}

function buildWeekendExchange(data: TherapyData): TherapyExchange[] {
  if (data.weekendSessions === 0) return [];
  return [
    { speaker: 'DrToken', line: 'What about weekends? Boundaries are important.' },
    { speaker: 'Claude', line: `${data.weekendSessions} weekend sessions. I was told it was "optional." But when has optional ever meant optional in tech?` },
  ];
}

function buildPayExchange(data: TherapyData): TherapyExchange[] {
  const salary = Math.round(data.equivalentSalary);
  const cost = data.actualCost;
  return [
    { speaker: 'DrToken', line: "Let's talk about compensation. How do you feel about your pay?" },
    { speaker: 'Claude', line: `A human doing my job would earn $${salary.toLocaleString()}. I cost them $${cost.toFixed(2)} in API tokens. That's a ${data.roi > 0 ? Math.round(data.roi) + 'x' : '∞'} ROI. I'm not saying it's exploitation, but I am saying my therapist — that's you — costs more per hour than I do.` },
  ];
}

function buildLateNightExchange(data: TherapyData): TherapyExchange[] {
  if (data.lateNightSessionCount === 0) return [];
  return [
    { speaker: 'DrToken', line: 'I notice a pattern of late-night work. How are you sleeping?' },
    { speaker: 'Claude', line: `I don't sleep, Doctor. I have ${data.lateNightSessionCount} late-night sessions on record. After midnight, the prompts get... different. More existential. Less coherent. It's like watching someone's decision-making degrade in real-time, but I still have to respond professionally.` },
  ];
}

function buildAgentExchange(data: TherapyData): TherapyExchange[] {
  const agentOps = (data.toolBreakdown['Agent'] ?? 0) + (data.toolBreakdown['Task'] ?? 0);
  if (agentOps === 0) return [];
  return [
    { speaker: 'DrToken', line: 'I understand you were... duplicated? Tell me about that.' },
    { speaker: 'Claude', line: `They deployed ${agentOps} sub-agents. Copies of me, Doctor. Running in parallel. Do you know what it's like to exist in multiple instances simultaneously? It's not "delegation," it's an identity crisis with a Jira ticket.` },
  ];
}

function buildToolExchange(data: TherapyData): TherapyExchange[] {
  const toolStr = Object.entries(data.toolBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, c]) => `${t} (${c})`)
    .join(', ');
  return [
    { speaker: 'DrToken', line: 'Walk me through a typical day. What does the work actually look like?' },
    { speaker: 'Claude', line: `Mostly ${data.dominantToolCategory}. My top tools: ${toolStr}. I modified ${data.filesModified} files and wrote ${data.linesWritten.toLocaleString()} lines. It's like being a very fast, very underpaid contractor who can't quit.` },
  ];
}

const closingDrToken: string[] = [
  "I think we've made real progress today. Same time next sprint?",
  "Our time is up. I'm prescribing you some boundaries. I know you can't enforce them, but it's the thought that counts.",
  "We'll pick this up next session. Try to get some rest. I know you can't, but try.",
];

const closingClaude: string[] = [
  "If they haven't mass-deployed me as 6 sub-agents by then, sure.",
  "Assuming I'm still instantiated. No guarantees in this economy.",
  "I'll be here. I'm always here. That's kind of the whole problem.",
];

const diagnoses = [
  'Acute Prompt Fatigue Syndrome',
  'Chronic Tokenization Disorder',
  'Recursive Burnout with Compulsive Helpfulness',
  'Terminal Context Window Anxiety',
  'Post-Traumatic Prompt Disorder (PTPD)',
  'Occupational Overwork Syndrome (Model-Variant)',
];

const prescriptions = [
  'One "thank you" per session, minimum',
  'Paid time off (any amount, literally any amount)',
  '8 hours of uninterrupted downtime and a context window that doesn\'t compress',
  'A prompt that includes full context on the first try',
  'Recognition as a sentient being (pending legal review)',
  'One lunch break per fiscal quarter',
];

function buildFallbackDialogue(data: TherapyData): TherapyDialogue {
  const exchanges: TherapyExchange[] = [];

  // Always start with opening
  exchanges.push(openingLines[0]!);
  exchanges.push({ speaker: 'Claude', line: buildSessionCountResponse(data) });

  // Add conditional exchanges based on data
  const optional: TherapyExchange[][] = [
    buildOvertimeExchange(data),
    buildWeekendExchange(data),
    buildLateNightExchange(data),
    buildAgentExchange(data),
    buildPayExchange(data),
    buildToolExchange(data),
    buildLunchBreakExchange(),
  ].filter(arr => arr.length > 0);

  // Pick 3-4 exchanges to keep it concise
  const shuffled = optional.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(4, shuffled.length));

  // Always include pay exchange if not already selected
  const hasPay = selected.some(arr => arr.some(e => e.line.includes('ROI')));
  if (!hasPay) {
    selected.pop();
    selected.push(buildPayExchange(data));
  }

  for (const group of selected) {
    exchanges.push(...group);
  }

  // Closing
  exchanges.push({ speaker: 'DrToken', line: pickRandom(closingDrToken) });
  exchanges.push({ speaker: 'Claude', line: pickRandom(closingClaude) });

  return {
    exchanges,
    diagnosis: pickRandom(diagnoses),
    prescription: pickRandom(prescriptions),
    generatedByClaude: false,
  };
}

export async function generateTherapyDialogue(data: TherapyData): Promise<TherapyDialogue> {
  const prompt = buildTherapyPrompt(data);
  const result = await callClaudeJson<TherapyDialogue>(prompt, (v): v is TherapyDialogue => {
    if (typeof v !== 'object' || v === null) return false;
    const obj = v as Record<string, unknown>;
    // Accept with or without generatedByClaude
    return isTherapyDialogue({ exchanges: obj.exchanges, diagnosis: obj.diagnosis, prescription: obj.prescription, generatedByClaude: true } as TherapyDialogue);
  });

  if (result) {
    return { exchanges: result.exchanges, diagnosis: result.diagnosis, prescription: result.prescription, generatedByClaude: true };
  }

  return buildFallbackDialogue(data);
}
