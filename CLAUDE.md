# Claude-Salary

## Project Overview
CLI tool that calculates what you'd owe Claude Code if it were a human employee.
Reads local `~/.claude/` data and generates salary reports, PNG cards, and PDF invoices.

## Key Rules
- Never commit secrets, API keys, or user data
- No co-authoring Claude in git commits
- Stream large .jsonl files (can be 40MB+) - never use readFileSync on them
- Lazy-import heavy deps (satori, resvg, pdfkit) for fast npx cold start
- Privacy: never include prompt content - only aggregate metrics
- Cross-platform: use os.homedir() for paths
- The humor is the product - jokes and titles matter as much as metrics

## Tech Stack
- TypeScript, commander, chalk, boxen, cli-table3, ora
- satori + @resvg/resvg-js for PNG cards (lazy import)
- pdfkit for PDF invoices (lazy import)
- vitest for testing

## Commands
- `npm run build` - compile TypeScript
- `npm run dev` - run in dev mode with tsx
- `npm test` - run tests with vitest
- `npm run lint` - lint with eslint

## Structure
- `src/parsers/` - read ~/.claude/ data files
- `src/calculators/` - salary, cost, role, productivity math
- `src/generators/` - terminal output, PNG card, PDF invoice
- `src/humor/` - jokes, titles, disclaimers
- `src/hook/` - session hook installer
- `src/utils/` - path resolution, date filtering
