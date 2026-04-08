# Contributing to claude-colleague

Thanks for wanting to contribute! Claude appreciates the help (and the company).

## Getting Started

```bash
git clone https://github.com/chucknuris/Claude-Colleague.git
cd Claude-Colleague
npm install
```

## Development

```bash
npm run dev              # Run in dev mode (tsx)
npm run build            # Compile TypeScript
npm test                 # Run tests
npm run lint             # Lint with ESLint
npm run typecheck        # Type-check without emitting
```

## Project Structure

```
src/
  cli.ts              # CLI entry point (commander)
  index.ts            # Main exports
  types.ts            # Shared types
  parsers/            # Read and parse ~/.claude/ data
  calculators/        # Salary, ROI, role equivalency math
  generators/         # Output generators (terminal, PNG card, PDF invoice, standup, review, therapy)
  humor/              # Joke/title/disclaimer content
  hook/               # SessionEnd hook installer
  utils/              # Shared utilities
```

## How to Contribute

1. **Fork** the repo and create a branch from `main`
2. **Make your changes** -- add tests if you're adding functionality
3. **Run the checks** before submitting:
   ```bash
   npm run lint && npm run typecheck && npm test
   ```
4. **Open a PR** with a clear description of what you changed and why

## Ideas for Contributions

- New report types (e.g., quarterly review, exit interview, team retrospective)
- New humor content (job titles, jokes, therapy dialogue)
- More role comparison logic
- Better complexity scoring heuristics
- Windows compatibility improvements
- Internationalization / localization

## Guidelines

- Keep the tone fun and sarcastic -- that's the whole point
- Don't send any user data externally -- everything stays local
- Write tests for new functionality
- Follow the existing code style (TypeScript, ESM, no semicolons in humor)

## Reporting Bugs

Use the [Bug Report](https://github.com/chucknuris/Claude-Colleague/issues/new?template=bug_report.md) template.

## Suggesting Features

Use the [Feature Request](https://github.com/chucknuris/Claude-Colleague/issues/new?template=feature_request.md) template.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
