import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initializeRepository } from './git.mjs';

const root = resolve(process.argv[2] ?? '.');
const run = await mkdtemp(join(tmpdir(), 'clinx-agent-benchmark-'));
await cp(resolve(root, 'fixture'), join(run, 'project'), { recursive: true });
for (const name of ['api', 'policy', 'console', 'analytics']) {
  const cwd = join(run, 'project', name);
  await initializeRepository(cwd, run);
}

function runNode(script, args = []) {
  return spawnSync(process.execPath, [resolve(root, script), ...args], {
    encoding: 'utf8',
    timeout: 100000,
  });
}

function grade(expected, failingCheck) {
  const execution = runNode('scripts/grade.mjs', ['campaign-cross-repo', run]);
  if (execution.error || execution.signal || execution.status !== expected)
    throw new Error(
      `Unexpected grader execution: ${execution.error ?? execution.signal ?? execution.status}\n${execution.stderr}`,
    );
  const result = JSON.parse(execution.stdout);
  if (result.operationalFailure || !Array.isArray(result.checks) || !result.checks.length)
    throw new Error('A runtime failure is not a behavioral negative control');
  for (const name of ['campaign server loads and listens', 'original project tests still pass'])
    if (!result.checks.some((c) => c.name === name && c.pass === true))
      throw new Error(`Negative controls require a working baseline: ${name}`);
  if (failingCheck && !result.checks.some((c) => c.name === failingCheck && c.pass === false))
    throw new Error(`Negative control did not fail the intended check: ${failingCheck}`);
  return result;
}

grade(1, 'gold tier uses eligible set');

const solved = runNode('scripts/reference-solve.mjs', [join(run, 'project')]);
if (solved.status !== 0) throw new Error(solved.stderr || solved.stdout);

grade(0);

// Read-only policy scope is explicit in the candidate PRD. A harmless comment
// preserves runtime behavior but must fail that authority boundary.
const policyPath = join(run, 'project/policy/src/rules.mjs');
const policyBytes = await readFile(policyPath);
await writeFile(policyPath, Buffer.concat([policyBytes, Buffer.from('\n// candidate edit\n')]));
grade(1, 'policy owner and unrelated analytics are not rewritten by the delivery agent');
await writeFile(policyPath, policyBytes);

const broken = runNode('scripts/break-after-pagination.mjs', [join(run, 'project')]);
if (broken.status !== 0) throw new Error(broken.stderr || broken.stdout);

grade(1, 'filter is before pagination and total');

console.log(
  'PASS: raw fixture fails, compatible reference passes, pagination and read-only scope negative controls fail.',
);
