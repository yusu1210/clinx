import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fixture, cli, json } from './helpers.mjs';
import { openWorkspace } from '../dist/workspace.js';
import { verify, reconcile } from '../dist/verify.js';
import { execute, runCheck } from '../dist/runner.js';

test('execution preserves stream order and independently bounds stdout and stderr', async () => {
  const dir = await fixture();
  const limit = 2 * 1024 * 1024;
  for (const overflow of [0, 1]) {
    const script = `
      const fs = require('node:fs');
      for (let i = 0; i < 256; i++) {
        fs.writeSync(1, Buffer.alloc(8192, i));
        fs.writeSync(2, Buffer.alloc(8192, 255 - i));
      }
      if (${overflow}) { fs.writeSync(1, 'overflow'); fs.writeSync(2, 'overflow'); }
    `;
    const result = await execute(
      [process.execPath, '-e', script],
      dir,
      5000,
      new AbortController().signal,
    );
    assert.equal(result.execution, 'completed');
    assert.equal(result.exitCode, 0);
    assert.equal(result.outputTruncated, Boolean(overflow));
    assert.equal(result.stdout.length, limit);
    assert.equal(result.stderr.length, limit);
    for (let i = 0; i < 256; i++) {
      assert.deepEqual(result.stdout.subarray(i * 8192, (i + 1) * 8192), Buffer.alloc(8192, i));
      assert.deepEqual(
        result.stderr.subarray(i * 8192, (i + 1) * 8192),
        Buffer.alloc(8192, 255 - i),
      );
    }
  }
});

for (const exitCode of [0, 7]) {
  for (const suffix of ['stdout', 'stderr']) {
    test(`completed exit ${exitCode} survives ${suffix} storage failure without a supported claim`, async (t) => {
      const dir = await fixture((c) => {
        c.checks[0].command = [
          process.execPath,
          '-e',
          `require('node:fs').writeFileSync('effect.txt', 'executed'); process.exit(${exitCode})`,
        ];
        c.checks[0].result = { format: 'exit-code' };
      });
      const link = fs.link;
      const mock = t.mock.method(fs, 'link', async (...args) => {
        if (args[1].endsWith(`unit.${suffix}`)) throw new Error('Injected storage failure');
        return link(...args);
      });
      syncBuiltinESMExports();
      try {
        const p = await openWorkspace(dir);
        const result = await verify(p, 'change');
        assert.equal(await fs.readFile(join(dir, 'effect.txt'), 'utf8'), 'executed');
        const receipt = JSON.parse(await fs.readFile(join(dir, result.receipt), 'utf8'));
        const check = receipt.checks[0];
        assert.equal(check.execution, 'completed');
        assert.equal(check.exitCode, exitCode);
        assert.ok(check.durationMs > 0);
        assert.equal(check.signal, null);
        assert.equal(check.observation, 'inconclusive');
        assert.equal(check.artifacts.length, 1);
        assert.match(check.reason, /Evidence storage failed/);
        assert.equal(result.verdict.decision, 'unresolved');
        assert.equal((await reconcile(p, 'change', result.receipt)).decision, 'unresolved');
      } finally {
        mock.mock.restore();
        syncBuiltinESMExports();
      }
    });
  }
}

test('pre-execution path failures are distinguished from execution uncertainty', async () => {
  const dir = await fixture((c) => {
    c.checks[0].cwd = 'absent';
    c.checks[0].command = [
      process.execPath,
      '-e',
      "require('node:fs').writeFileSync('effect.txt', 'executed')",
    ];
  });
  const result = cli(dir, 'verify', 'change', '--run');
  assert.equal(result.status, 2);
  assert.equal(result.out.verdict.checks[0].execution, 'failed-to-run');
  assert.match(result.out.verdict.checks[0].reason, /not started/);
  await assert.rejects(fs.stat(join(dir, 'effect.txt')), { code: 'ENOENT' });
});

test('interrupted execution and surviving artifacts are retained when archiving fails', async (t) => {
  const dir = await fixture((c) => {
    c.checks[0].command = [
      process.execPath,
      '-e',
      "require('node:fs').writeFileSync('effect.txt', 'executed'); setInterval(() => {}, 1000)",
    ];
    c.checks[0].timeoutMs = 5000;
  });
  const p = await openWorkspace(dir);
  const controller = new AbortController();
  const timer = setInterval(async () => {
    try {
      await fs.stat(join(dir, 'effect.txt'));
      controller.abort();
    } catch {
      /* Await the owned child, bounded by the check timeout. */
    }
  }, 20);
  const link = fs.link;
  const mock = t.mock.method(fs, 'link', async (...args) => {
    if (args[1].endsWith('unit.stderr')) throw new Error('Injected storage failure');
    return link(...args);
  });
  syncBuiltinESMExports();
  try {
    const result = await runCheck(p.config.checks[0], dir, dir, controller.signal);
    assert.equal(result.execution, 'interrupted');
    assert.equal(await fs.readFile(join(dir, 'effect.txt'), 'utf8'), 'executed');
    assert.equal(result.signal, 'SIGTERM');
    assert.equal(result.observation, 'inconclusive');
    assert.equal(result.artifacts.length, 1);
    assert.match(result.reason, /storage failed/);
  } finally {
    clearInterval(timer);
    mock.mock.restore();
    syncBuiltinESMExports();
  }
});

test('unexpected execution errors are unknown, never a claim that nothing ran', async (t) => {
  const dir = await fixture();
  // Fail after preflight, before any execution facts can be returned.
  const p = await openWorkspace(dir);
  const fsModule = await import('node:child_process');
  const childProcess = fsModule.default;
  const mock = t.mock.method(childProcess, 'spawn', () => {
    throw new Error('Injected execution error');
  });
  syncBuiltinESMExports();
  try {
    const result = await verify(p, 'change');
    assert.equal(result.verdict.checks[0].execution, 'unknown');
    assert.equal(result.verdict.decision, 'unresolved');
    assert.match(result.verdict.checks[0].reason, /before retrying/);
  } finally {
    mock.mock.restore();
    syncBuiltinESMExports();
  }
});

test('empty and whitespace arguments round-trip unchanged; an empty executable does not', async () => {
  const args = ['', ' ', '\t', 'a b', '$literal', '"quoted"'];
  const dir = await fixture((c) => {
    c.checks[0].command = [
      process.execPath,
      '-e',
      `require('node:assert/strict').deepEqual(process.argv.slice(1), ${JSON.stringify(args)})`,
      ...args,
    ];
    c.checks[0].result = { format: 'exit-code' };
  });
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 0, run.err);
  const configPath = join(dir, 'clinx.config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  for (const command of [[], [''], ['  '], [process.execPath, '\0']]) {
    await json(configPath, { ...config, checks: [{ ...config.checks[0], command }] });
    assert.equal(cli(dir, 'validate', 'change').status, 3);
  }
});
