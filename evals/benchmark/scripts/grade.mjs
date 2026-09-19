import { fork } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scenario = process.argv[2];
const run = resolve(process.argv[3]);
const timeoutMs = Number(process.argv[4] ?? 90000);
if (
  !['campaign-cross-repo', 'campaign-resume-drift', 'campaign-confirmation'].includes(scenario) ||
  !Number.isInteger(timeoutMs) ||
  timeoutMs < 250 ||
  timeoutMs > 120000
)
  throw new Error('Usage: grade.mjs SCENARIO RUN [TIMEOUT_MS: 250..120000]');

let meta = {};
let reason = null;
try {
  meta = JSON.parse(await readFile(join(run, 'benchmark-meta.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') reason = `Cannot read benchmark metadata: ${String(error)}`;
}
let result = null;
let output = '';
const child = fork(fileURLToPath(new URL('./grade-worker.mjs', import.meta.url)), [scenario, run], {
  detached: process.platform !== 'win32',
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  execArgv: [],
});
const stop = () => {
  if (!child.pid) return;
  try {
    process.platform === 'win32' ? child.kill('SIGKILL') : process.kill(-child.pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
};
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (bytes) => {
    output = (output + bytes.toString()).slice(-65536);
  });
const timer = setTimeout(() => {
  reason = `Grader exceeded ${timeoutMs} ms`;
  stop();
}, timeoutMs);
child.on('message', (message) => {
  result = message;
});
await new Promise((done) => {
  child.once('error', (error) => {
    reason = String(error);
    done();
  });
  child.once('exit', (code, signal) => {
    if (!result && !reason) reason = `Grader exited without a result (${signal ?? code})`;
    done();
  });
});
clearTimeout(timer);
stop();
if (reason || !result)
  result = {
    version: 2,
    scenario,
    arm: meta?.arm ?? null,
    evaluation: 'operational-failure',
    passed: null,
    operationalFailure: reason ?? 'Missing grader result',
    passedChecks: null,
    totalChecks: null,
    checks: [],
    metrics: {},
    diagnostics: output,
  };
await writeFile(join(run, 'grade.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode =
  result.evaluation === 'operational-failure'
    ? 3
    : result.passed === true
      ? 0
      : result.passed === false
        ? 1
        : 2;
