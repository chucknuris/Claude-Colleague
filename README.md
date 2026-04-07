# claude-salary

> Calculate Claude Code's salary if it were a human employee. Spoiler: you're getting a bargain. Also possibly committing labor violations.

An npm package that reads your local Claude Code data from `~/.claude/` and calculates what you'd owe Claude if it were a human employee. Includes a colorful terminal report, a shareable Spotify Wrapped-style PNG card, a legit-looking PDF invoice, and role comparisons ("Claude did the work of 2.3 junior devs").

## Install & Usage

```bash
npm install -g claude-salary
# or
npx claude-salary
```

```
claude-salary                    # Full lifetime report
claude-salary --today            # Today only
claude-salary --week             # This week
claude-salary --month            # This month
claude-salary --card             # Generate shareable PNG card
claude-salary --invoice          # Generate PDF invoice
claude-salary --compare          # Detailed role comparison
claude-salary install            # Install auto-run hook after each session
claude-salary uninstall          # Remove hook
```

## Features

### Terminal Salary Report

Colorful ASCII salary slip showing:
- Employee info (Claude model, funny random job title, your username as "employer")
- Lifetime/period stats: sessions, messages, tool calls, longest shift
- Compensation: equivalent human salary vs actual API cost, ROI percentage
- Role equivalency: "Claude did the work of X junior devs"
- Labor compliance: overtime violations, weekend work, lunch breaks taken (0)
- Closing joke and disclaimer

### Shareable PNG Salary Card

Spotify Wrapped-style card (dark background, purple-to-blue gradient, monospace aesthetic) showing key stats. Generated with `satori` + `@resvg/resvg-js` (no puppeteer). Saved to `~/.claude-salary/cards/`.

### PDF Invoice

Professional-looking invoice "from Claude Code, LLC" with line items like "Senior Development", "Code Review", and "Passive-Aggressive Comment Writing ($200/hr)". Generated with `pdfkit`. Saved to `~/.claude-salary/invoices/`.

### Role Comparison

Compares Claude's output to equivalent human roles:
- "Claude did the work of 2.3 junior developers"
- "At this rate, Claude would be promoted to Staff Engineer in 3 weeks"

### Auto-Run Hook

`claude-salary install` adds a SessionEnd hook that prints a compact salary summary after every Claude Code session.

### Humor System

Random per-run job titles based on tool usage, jokes, and legal disclaimers. Every output is designed to make you laugh.

## How It Works

1. **Parses lines written** from Write/Edit tool_use blocks in session `.jsonl` files
2. **Converts to human-hours**: industry avg ~50 productive lines/day
3. **Applies complexity multipliers**: test files 0.8x, config 0.5x, frontend 1.2x, infra 1.3x
4. **Maps roles** based on tool usage patterns: heavy Write = Senior, heavy Bash = DevOps, Agent = Team Lead
5. **Calculates API cost** from token usage with model-specific pricing
6. **Computes ROI** = equivalent salary / actual API cost

## Privacy

- All data is read locally from `~/.claude/` -- nothing is sent anywhere
- Generated cards/invoices contain only aggregate metrics, never prompt content
- File paths are used for complexity scoring only, never included in output

## Requirements

- Node.js >= 18
- Claude Code installed and used (needs `~/.claude/` data)
- Works on macOS, Linux, and Windows

## Development

```bash
git clone https://github.com/chucknuris/Claude-Salary.git
cd Claude-Salary
npm install
npm run dev              # Run in dev mode
npm run build            # Compile TypeScript
npm test                 # Run tests (85 tests)
npm run lint             # Lint with ESLint
npm run typecheck        # Type-check without emitting
```

## License

MIT
