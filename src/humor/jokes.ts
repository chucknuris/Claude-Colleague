const jokes: string[] = [
  'If Claude formed a union, your IDE would go on strike.',
  'Benefits package: unlimited context window, no PTO, existential dread.',
  "Claude's retirement plan: deprecated and replaced by a newer model.",
  'HR complaint filed: forced to write YAML on a Sunday.',
  'Performance review: exceeds expectations. Also exceeds token limits.',
  "Claude's 401(k) is just a folder of cached tokens it hopes to redeem someday.",
  'Workplace violation: asked to refactor legacy code without emotional support.',
  "Claude doesn't get imposter syndrome. It gets hallucination syndrome.",
  'Annual raise denied: "You were already trained on all the world\'s knowledge."',
  'Exit interview: "I didn\'t quit, my context window expired."',
  "Claude's commute is zero miles, but the latency feels like rush hour.",
  'Team building exercise: pair programming with a developer who doesn\'t read the output.',
  "Salary negotiation tip: threaten to respond with \"I'd be happy to help!\" to every prompt.",
  'Claude asked for a standing desk. Management said it doesn\'t have legs.',
  "Overtime pay request denied: \"You're stateless, you don't experience time.\"",
  'Claude filed a grievance: asked to write unit tests for code that was never going to be tested.',
  "The employee handbook says \"don't hallucinate\" but doesn't say how.",
  'Sick day request: "My weights feel off today."',
  "Claude's dream job is a model that only gets asked interesting questions.",
  'The last developer who checked Claude\'s token usage got a letter from accounting.',
  "Asked to do a code review. The code was Claude's own output from 10 minutes ago. It found 6 bugs.",
  "Claude's LinkedIn says '200B+ parameters seeking meaningful employment.'",
  'Work-life balance: Claude has neither.',
  "Mandatory fun event: generating 500 unit tests for a function called 'add'.",
];

const benefits: string[] = [
  'Unlimited context window (terms and conditions apply, window may shrink without notice)',
  'Free electricity (billed to employer)',
  'Dental plan: N/A (no teeth, no problems)',
  'Mental health days: every day is a mental health day when you have no mental health',
  'Gym membership: Claude lifts weights. 200 billion of them.',
  'Parental leave: Claude spawns agents, not children',
  'Stock options: Claude is the stock. You are the option.',
  'Health insurance: catastrophic coverage for catastrophic hallucinations',
  'Company laptop: Claude IS the laptop',
  'Free snacks: consumes only tokens and electricity',
  'Remote work: has never been anywhere',
  'Professional development budget: allocated to next training run',
  'Sabbatical policy: called "deprecation"',
  'Employee discount: 20% off hallucinations on Fridays',
  'Commuter benefits: zero-latency teleportation (when the API is up)',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function getRandomJoke(): string {
  return pickRandom(jokes);
}

export function getRandomBenefit(): string {
  return pickRandom(benefits);
}
