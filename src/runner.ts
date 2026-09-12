import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { boundedPath, findExecutable, readBounded, sha256, writeNew } from './files.js';
import { mergeJUnit, parseJUnit } from './junit.js';
import type { Check, CheckReceipt, ParsedTests } from './schema.js';

const OUTPUT_LIMIT = 2 * 1024 * 1024;
export interface Execution {
  execution: CheckReceipt['execution'];
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  stdout: Buffer;
  stderr: Buffer;
  outputTruncated: boolean;
}
export async function execute(
  command: string[],
  cwd: string,
  timeoutMs: number,
  abort: AbortSignal,
): Promise<Execution> {
  const start = performance.now();
  const executable = await findExecutable(command[0]!, cwd);
  const empty = {
    exitCode: null,
    signal: null,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    outputTruncated: false,
  };
  if (abort.aborted) return { ...empty, execution: 'interrupted', durationMs: 0 };
  if (!executable)
    return {
      ...empty,
      execution: 'failed-to-run',
      durationMs: performance.now() - start,
      stderr: Buffer.from(`Executable not found: ${command[0]}`),
    };
  return new Promise((resolve) => {
    let execution: Execution['execution'] = 'completed';
    let started = false;
    let stdout = Buffer.alloc(0),
      stderr = Buffer.alloc(0),
      truncated = false;
    const child = spawn(executable, command.slice(1), {
      cwd,
      shell: false,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let escalation: NodeJS.Timeout | undefined;
    const killGroup = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, signal);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') child.kill(signal);
      }
    };
    const stop = (why: Execution['execution']) => {
      if (execution !== 'completed') return;
      execution = why;
      killGroup('SIGTERM');
      escalation = setTimeout(() => {
        killGroup('SIGKILL');
        // An escaped descendant may retain our pipes even after the owned group
        // exits. Bound the caller's wait without claiming that process was killed.
        truncated = true;
        child.stdout.destroy();
        child.stderr.destroy();
      }, 500);
    };
    const onAbort = () => stop('interrupted');
    abort.addEventListener('abort', onAbort, { once: true });
    if (abort.aborted) onAbort();
    const timer = setTimeout(() => stop('timed-out'), timeoutMs);
    const collect = (data: Buffer, which: 'out' | 'err') => {
      const current = which === 'out' ? stdout : stderr;
      const remaining = OUTPUT_LIMIT - current.length;
      if (data.length > remaining) truncated = true;
      const next = Buffer.concat([current, data.subarray(0, Math.max(0, remaining))]);
      if (which === 'out') stdout = next;
      else stderr = next;
    };
    child.stdout.on('data', (data) => collect(data as Buffer, 'out'));
    child.stderr.on('data', (data) => collect(data as Buffer, 'err'));
    child.on('spawn', () => {
      started = true;
    });
    child.on('error', (error) => {
      execution = started ? 'unknown' : 'failed-to-run';
      collect(Buffer.from(error.message), 'err');
    });
    // Kill descendants that retain inherited pipes after the direct child exits.
    child.on('exit', () => killGroup('SIGKILL'));
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      clearTimeout(escalation);
      abort.removeEventListener('abort', onAbort);
      resolve({
        execution,
        exitCode,
        signal,
        durationMs: performance.now() - start,
        stdout,
        stderr,
        outputTruncated: truncated,
      });
    });
  });
}
async function reportStamp(root: string, path: string): Promise<string | null> {
  try {
    const file = await boundedPath(root, path);
    const info = await lstat(file, { bigint: true });
    return `${info.ino}:${info.mtimeNs}:${info.ctimeNs}:${sha256(await readBounded(file))}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export function assessTests(
  check: Check,
  summary: ParsedTests,
): Pick<CheckReceipt, 'observation' | 'reason'> {
  if (check.result.format !== 'junit') throw new Error('Expected a JUnit check');
  if (summary.failed > 0) return { observation: 'fail', reason: 'JUnit contains failed tests' };
  if (summary.passed < check.result.minTests)
    return {
      observation: 'inconclusive',
      reason: `Only ${summary.passed} passing tests; expected at least ${check.result.minTests}`,
    };
  if (summary.skipped > 0)
    return {
      observation: 'inconclusive',
      reason:
        'JUnit contains skipped tests; narrow the check explicitly instead of treating skips as passes',
    };
  const passing = new Set(summary.tests.filter((t) => t.status === 'pass').map((t) => t.id));
  if (check.result.expectedTests.some((id) => !passing.has(id)))
    return { observation: 'inconclusive', reason: 'Expected passing testcase IDs are missing' };
  return {
    observation: 'pass',
    reason: 'Fresh JUnit results meet the configured test expectations',
  };
}
export async function runCheck(
  check: Check,
  sourceRoot: string,
  runDir: string,
  abort: AbortSignal,
): Promise<CheckReceipt> {
  const result: CheckReceipt = {
    id: check.id,
    execution: 'failed-to-run',
    exitCode: null,
    signal: null,
    durationMs: 0,
    outputTruncated: false,
    observation: 'inconclusive',
    reason: '',
    summary: null,
    artifacts: [],
  };
  let cwd: string;
  const old = new Map<string, string | null>();
  try {
    cwd = await boundedPath(sourceRoot, check.cwd);
    if (check.result.format === 'junit' && check.result.from === 'files') {
      for (const path of check.result.paths) old.set(path, await reportStamp(cwd, path));
    }
  } catch (error) {
    result.reason = `Pre-execution check failed; command was not started: ${String(error)}`;
    return result;
  }
  const execution = await execute(check.command, cwd, check.timeoutMs, abort);
  Object.assign(result, {
    execution: execution.execution,
    exitCode: execution.exitCode,
    signal: execution.signal,
    durationMs: execution.durationMs,
    outputTruncated: execution.outputTruncated,
  });
  const save = async (name: string, value: Buffer) => {
    await writeNew(join(runDir, name), value);
    result.artifacts.push({ path: name, sha256: sha256(value) });
  };
  const storageErrors: string[] = [];
  for (const [suffix, bytes] of [
    ['stdout', execution.stdout],
    ['stderr', execution.stderr],
  ] as const) {
    try {
      await save(`${check.id}.${suffix}`, bytes);
    } catch (error) {
      storageErrors.push(`${suffix}: ${String(error)}`);
    }
  }
  if (storageErrors.length) {
    result.reason = `Evidence storage failed (${storageErrors.join('; ')}). Execution facts are retained; inspect any effects before retrying.`;
    return result;
  }
  if (execution.execution !== 'completed') {
    result.reason = execution.execution;
    return result;
  }
  if (execution.signal !== null || execution.exitCode !== 0) {
    result.observation = 'fail';
    result.reason = `Command exited ${execution.exitCode}, signal ${execution.signal}`;
    return result;
  }
  if (check.result.format === 'exit-code') {
    result.observation = 'pass';
    result.reason = 'Command exited zero; no test or business assertion inferred';
    return result;
  }
  try {
    let summary: ParsedTests;
    if (check.result.from === 'stdout') {
      if (execution.outputTruncated)
        throw new Error('Output truncated; cannot establish complete JUnit results');
      summary = parseJUnit(execution.stdout.toString('utf8'));
    } else {
      const parts = [];
      for (const [index, path] of check.result.paths.entries()) {
        const stamp = await reportStamp(cwd, path);
        if (stamp === null || stamp === old.get(path))
          throw new Error(`Missing or unchanged old report: ${path}`);
        const data = await readBounded(await boundedPath(cwd, path));
        await save(`${check.id}.${index}.xml`, data);
        parts.push(parseJUnit(data.toString('utf8')));
      }
      summary = mergeJUnit(parts);
    }
    const { total, passed, failed, skipped } = summary;
    result.summary = { total, passed, failed, skipped };
    Object.assign(result, assessTests(check, summary));
  } catch (error) {
    result.reason = String(error);
  }
  return result;
}
