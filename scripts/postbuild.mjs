import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/index.js';
const content = readFileSync(file, 'utf8');
if (!content.startsWith('#!')) {
  writeFileSync(file, `#!/usr/bin/env node\n${content}`);
}
