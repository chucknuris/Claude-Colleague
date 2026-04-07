import { Command } from 'commander';

export function run(argv: string[]) {
  const program = new Command();

  program
    .name('claude-salary')
    .description('Calculate what Claude Code would earn as a human employee')
    .version('0.1.0');

  program.parse(argv);
}
