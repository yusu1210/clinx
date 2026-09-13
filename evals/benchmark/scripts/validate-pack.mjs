import { cp, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(process.argv[2] ?? '.');
const run = await mkdtemp(join(tmpdir(), 'clinx-agent-benchmark-'));
await cp(resolve(root, 'fixture'), join(run, 'project'), { recursive: true });
for (const name of ['api', 'policy', 'console', 'analytics']) {
  const cwd = join(run, 'project', name);
  execFileSync('git', ['init', '-q'], { cwd });
  execFileSync('git', ['config', 'user.name', 'clinx benchmark'], { cwd });
  execFileSync('git', ['config', 'user.email', 'benchmark@example.invalid'], { cwd });
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', ['commit', '-qm', 'benchmark baseline'], { cwd });
}

function runNode(script, args = []) {
  return spawnSync(process.execPath, [resolve(root, script), ...args], {
    encoding: 'utf8',
    timeout: 30000
  });
}

let raw = runNode('scripts/grade.mjs', ['campaign-cross-repo', run]);
if (raw.status === 0) throw new Error('Raw incomplete fixture unexpectedly passed hidden grader');

const solved = runNode('scripts/reference-solve.mjs', [join(run, 'project')]);
if (solved.status !== 0) throw new Error(solved.stderr || solved.stdout);

let good = runNode('scripts/grade.mjs', ['campaign-cross-repo', run]);
if (good.status !== 0) throw new Error('Reference solution failed:\n' + good.stdout + good.stderr);

const broken = runNode('scripts/break-after-pagination.mjs', [join(run, 'project')]);
if (broken.status !== 0) throw new Error(broken.stderr || broken.stdout);

let bad = runNode('scripts/grade.mjs', ['campaign-cross-repo', run]);
if (bad.status === 0) throw new Error('After-pagination negative control unexpectedly passed');

console.log('PASS: raw fixture fails, compatible reference passes, pagination negative control fails.');
