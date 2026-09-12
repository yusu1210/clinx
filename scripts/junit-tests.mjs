// Keep the check's stdout a single JUnit document. Build output goes to stderr.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const build = spawnSync('npm', ['run', 'build'], { stdio: ['ignore', 2, 2] });
if (build.status !== 0) process.exit(build.status ?? 1);
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const tests = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=junit',
    ...readdirSync('test')
      .filter((name) => name.endsWith('.test.mjs'))
      .sort()
      .map((name) => `test/${name}`),
  ],
  { stdio: 'inherit', env },
);
process.exit(tests.status ?? 1);
