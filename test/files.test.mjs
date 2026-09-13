import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, readFile, rm, symlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import {
  MAX_FILE_BYTES,
  writeNew,
  fingerprint,
  boundedPath,
  readBounded,
  readJson,
  canonical,
  findExecutable,
} from '../dist/files.js';
import { openWorkspace } from '../dist/workspace.js';
import { context } from '../dist/task.js';
import { checkpoint } from '../dist/task.js';
import { execute } from '../dist/runner.js';
import { verify, reconcile } from '../dist/verify.js';
import { fixture, put, json, cli } from './helpers.mjs';

test('fingerprint is independent of overlapping input ordering, but binds mode and content', async () => {
  const dir = await fixture();
  const base = { id: 'main', path: '.', inputs: ['src'], exclude: [] };
  const first = await fingerprint(dir, base);
  assert.deepEqual(await fingerprint(dir, { ...base, inputs: ['src/input.txt', 'src'] }), first);
  await chmod(join(dir, 'src/input.txt'), 0o700);
  assert.notEqual((await fingerprint(dir, base)).digest, first.digest);
});

test('canonical keys and source paths use locale-independent ordering without Unicode ties', async () => {
  const first = 'a.txt';
  const second = 'a\u200b.txt';
  const left = { [first]: 1, [second]: 2 };
  const right = { [second]: 2, [first]: 1 };
  assert.equal(canonical(left), canonical(right));
  assert.equal(canonical({ a: 1, Z: 2 }), '{"Z":2,"a":1}');
  const dir = await fixture();
  await put(join(dir, first), 'first');
  await put(join(dir, second), 'second');
  const source = { id: 'main', path: '.', inputs: [first, second], exclude: [] };
  assert.deepEqual(
    await fingerprint(dir, source),
    await fingerprint(dir, { ...source, inputs: [second, first] }),
  );
});
test('only declared exclusions are skipped; directory names have no implicit meaning', async () => {
  const dir = await fixture();
  const source = { id: 'main', path: '.', inputs: ['src'], exclude: ['src/cache'] };
  const first = await fingerprint(dir, source);
  await put(join(dir, 'src/cache/generated.txt'), 'cache');
  assert.equal((await fingerprint(dir, source)).digest, first.digest);
  for (const name of [
    'build',
    'target',
    'dist',
    'node_modules',
    '.next',
    'coverage',
    '.git',
    '.clinx',
  ]) {
    const before = await fingerprint(dir, source);
    await put(join(dir, `src/${name}/input.txt`), 'project-owned input');
    assert.notEqual((await fingerprint(dir, source)).digest, before.digest, name);
  }
  await put(join(dir, 'src/other.txt'), 'new');
  const second = await fingerprint(dir, source);
  assert.notEqual(second.digest, first.digest);
  await rm(join(dir, 'src/input.txt'));
  assert.notEqual((await fingerprint(dir, source)).digest, second.digest);
});
test('empty sources and overbroad exclusions are rejected', async () => {
  const dir = await fixture();
  await mkdir(join(dir, 'empty'));
  await assert.rejects(fingerprint(dir, { id: 'main', path: '.', inputs: ['empty'], exclude: [] }));
  await assert.rejects(
    fingerprint(dir, { id: 'main', path: '.', inputs: ['src'], exclude: ['.'] }),
  );
  await assert.rejects(
    fingerprint(dir, { id: 'main', path: '.', inputs: ['src'], exclude: ['../'] }),
  );
  await assert.rejects(
    fingerprint(dir, {
      id: 'main',
      path: '.',
      inputs: ['src', 'src/input.txt'],
      exclude: ['src/input.txt'],
    }),
    /Explicit input is excluded/,
  );
});
test('source entry limits count empty directories as well as files', async (t) => {
  const dir = await fixture();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await put(join(dir, 'scope/000-input'), 'bound input before empty directories');
  for (let offset = 0; offset < 50000; offset += 256) {
    await Promise.all(
      Array.from({ length: Math.min(256, 50000 - offset) }, (_, index) =>
        mkdir(join(dir, 'scope', `empty-${offset + index}`)),
      ),
    );
  }
  await assert.rejects(
    fingerprint(dir, { id: 'main', path: '.', inputs: ['scope'], exclude: [] }),
    /Input scope too large/,
  );
});
test('bounded reads reject large files and traversal', async () => {
  const dir = await fixture();
  await assert.rejects(boundedPath(dir, '../elsewhere', true));
  await assert.rejects(readBounded(join(dir, 'src/input.txt'), 2));
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
});

test('JSON diagnostics identify the file without echoing its potentially private contents', async () => {
  const dir = await fixture();
  const path = join(dir, 'clinx.config.json');
  await put(path, 'do-not-print-me');
  await assert.rejects(readJson(path), (error) => {
    assert.ok(error instanceof SyntaxError);
    assert.match(error.message, /clinx.config.json/);
    assert.doesNotMatch(error.message, /do-not-print-me/);
    return true;
  });
  const result = cli(dir, 'validate');
  assert.equal(result.status, 3);
  assert.match(result.err, /clinx.config.json/);
  assert.doesNotMatch(result.err, /do-not-print-me/);
});
test('bounded reads reject a FIFO without waiting for a writer', async () => {
  const dir = await fixture();
  const file = join(dir, 'pipe');
  assert.equal(spawnSync('mkfifo', [file]).status, 0);
  const module = new URL('../dist/files.js', import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { readBounded } from ${JSON.stringify(module)};
     import assert from 'node:assert/strict';
     await assert.rejects(readBounded(${JSON.stringify(file)}), /Not a regular bounded file/);`,
    ],
    { timeout: 3000, encoding: 'utf8' },
  );
  assert.equal(child.status, 0, String(child.error ?? child.stderr));
});
test('bounded reads allocate by file size and preserve exact-limit and empty-file behavior', async () => {
  const dir = await fixture();
  const file = join(dir, 'small');
  for (const content of ['', 'small source\n']) {
    await put(file, content);
    const result = await readBounded(file);
    assert.equal(result.toString(), content);
    assert.ok(result.buffer.byteLength <= Buffer.byteLength(content) + 1);
    assert.equal((await readBounded(file, Buffer.byteLength(content))).toString(), content);
  }
  await assert.rejects(readBounded(file, -1), /Invalid read limit/);
});
test('execution preserves symlink invocation identity and child-relative PATH', async () => {
  const dir = await fixture();
  const entry = join(dir, 'tools/selected');
  await put(join(dir, 'tools/program'), '#!/bin/sh\nprintf "%s" "$0"\n');
  await chmod(join(dir, 'tools/program'), 0o700);
  await symlink('program', entry);
  const controller = new AbortController();
  const result = await execute(['./tools/selected'], dir, 3000, controller.signal);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.toString(), `${dir}/./tools/selected`);
  assert.equal(await findExecutable(entry, dir), entry);
  const previous = process.env.PATH;
  try {
    process.env.PATH = 'tools';
    assert.equal(await findExecutable('selected', dir), `${dir}/tools/selected`);
    process.env.PATH = '';
    assert.equal(await findExecutable('tools', dir), null);
    await symlink('tools/program', join(dir, 'selected'));
    const local = await execute(['selected'], dir, 3000, controller.signal);
    assert.equal(local.exitCode, 0);
    assert.equal(local.stdout.toString(), `${dir}//selected`);
  } finally {
    if (previous === undefined) delete process.env.PATH;
    else process.env.PATH = previous;
  }
});
test('a change to an explicitly declared build directory invalidates old evidence', async () => {
  const dir = await fixture((c) => {
    c.sources[0].inputs.push('build');
    c.checks[0].command = [process.execPath, 'src/check.mjs'];
    c.checks[0].result = { format: 'exit-code' };
  });
  await json(join(dir, 'build/policy.json'), { enabled: true });
  await put(
    join(dir, 'src/check.mjs'),
    "import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; assert.equal(JSON.parse(readFileSync('build/policy.json')).enabled,true);\n",
  );
  const run = await verify(await openWorkspace(dir), 'change');
  assert.equal(run.verdict.decision, 'supported');
  await json(join(dir, 'build/policy.json'), { enabled: false });
  assert.equal(
    (await reconcile(await openWorkspace(dir), 'change', run.receipt)).applicability,
    'stale',
  );
  assert.equal((await verify(await openWorkspace(dir), 'change')).verdict.decision, 'failed');
});
test('context and checkpoints refresh retained configuration instead of restoring an old index', async () => {
  const dir = await fixture((c) => {
    c.sources[0].inputs = ['src'];
    c.context = [{ path: 'old.md', description: 'Old index', when: ['always'] }];
  });
  await put(join(dir, 'old.md'), 'old');
  await put(join(dir, 'new.md'), 'new');
  const p = await openWorkspace(dir);
  const note = { focus: 'build', state: 'active', summary: 'Observed', next: 'Continue' };
  await checkpoint(p, 'change', note);
  const config = JSON.parse(await readFile(join(dir, 'clinx.config.json'), 'utf8'));
  config.context[0].path = 'new.md';
  await json(join(dir, 'clinx.config.json'), config);
  const current = await context(p, 'change');
  assert.equal(current.continuity, 'inputs-match');
  assert.equal(current.index[0].path, 'new.md');
  await checkpoint(p, 'change', note);
  assert.equal((await context(p, 'change')).continuity, 'inputs-match');
});
test('product version and reader runtime do not redefine historical execution', async () => {
  const dir = await fixture();
  const p = await openWorkspace(dir);
  const run = await verify(p, 'change');
  const receipt = JSON.parse(await readFile(join(dir, run.receipt), 'utf8'));
  receipt.clinxVersion += '-different-implementation';
  receipt.runtime = {
    node: 'historical-runtime',
    platform: 'historical-platform',
    arch: 'historical-arch',
  };
  await json(join(dir, run.receipt), receipt);
  const result = await reconcile(p, 'change', run.receipt);
  assert.equal(result.applicability, 'current');
  assert.equal(result.decision, 'supported');
  receipt.protocolVersion += 1;
  await json(join(dir, run.receipt), receipt);
  const unsupported = await reconcile(p, 'change', run.receipt);
  assert.equal(unsupported.applicability, 'unknown');
  assert.equal(unsupported.decision, 'unresolved');
});
test('reconcile refreshes check definitions even when the caller retains a Workspace object', async () => {
  const dir = await fixture();
  const p = await openWorkspace(dir);
  const run = await verify(p, 'change');
  const config = JSON.parse(await readFile(join(dir, 'clinx.config.json'), 'utf8'));
  config.checks[0].timeoutMs = 1000;
  await json(join(dir, 'clinx.config.json'), config);
  const result = await reconcile(p, 'change', run.receipt);
  assert.equal(result.applicability, 'stale');
  assert.ok(
    result.reasons.includes('Task source or selected check definitions differ from this run'),
  );
});

test('new-file publication is bounded, exclusive and leaves no temporary files on success or collision', async () => {
  const dir = await fixture();
  const file = join(dir, 'record.json');
  const values = ['a'.repeat(100000), 'b'.repeat(100000)];
  const results = await Promise.allSettled(values.map((value) => writeNew(file, value)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'EEXIST');
  assert.ok(values.includes((await readBounded(file)).toString()));
  const oversized = join(dir, 'oversized');
  await assert.rejects(writeNew(oversized, Buffer.alloc(MAX_FILE_BYTES + 1)), /exceeds/);
  const names = await readdir(dir);
  assert.ok(!names.includes('oversized'));
  assert.ok(!names.some((name) => name.endsWith('.tmp')));
});

test('a write interrupted before publication never exposes partial bytes as a final record', async (t) => {
  const dir = await fixture();
  const file = join(dir, 'record.json');
  const open = fs.open;
  const mocked = t.mock.method(fs, 'open', async (...args) => {
    const handle = await open(...args);
    if (args[1] === 'wx') {
      const write = handle.writeFile.bind(handle);
      handle.writeFile = async (value) => {
        await write(value.slice(0, 3));
        await assert.rejects(readBounded(file), { code: 'ENOENT' });
        throw new Error('Injected storage failure');
      };
    }
    return handle;
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(writeNew(file, '{"complete":true}'), /Injected storage failure/);
    await assert.rejects(readBounded(file), { code: 'ENOENT' });
    assert.ok(!(await readdir(dir)).some((name) => name.endsWith('.tmp')));
  } finally {
    mocked.mock.restore();
    syncBuiltinESMExports();
  }
});
