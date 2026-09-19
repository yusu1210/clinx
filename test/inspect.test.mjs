import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cli, put, json, fixture } from './helpers.mjs';
const empty = () => mkdtemp(join(tmpdir(), 'clinx-inspect-'));

test('inspect offers bounded uninspected child hints without following links or reading child code', async () => {
  const dir = await empty();
  await json(join(dir, 'service/package.json'), { scripts: { test: 'do-not-read-or-run' } });
  await put(join(dir, 'viewer/README.md'), 'do-not-read-child');
  await put(join(dir, '.hidden/secret'), 'secret');
  await put(join(dir, 'node_modules/dependency'), 'dependency');
  await symlink('service', join(dir, 'linked'));
  const result = cli(dir, 'inspect');
  assert.deepEqual(result.out.locations, [
    { path: 'service', inspected: false },
    { path: 'viewer', inspected: false },
  ]);
  assert.deepEqual(result.out.candidates, []);
  assert.equal(result.out.locationsTruncated, false);
  assert.doesNotMatch(JSON.stringify(result.out), /do-not-read|secret|linked/);
  for (let i = 0; i < 40; i++) await put(join(dir, `project-${i}/README.md`), 'entry');
  const bounded = cli(dir, 'inspect');
  assert.equal(bounded.out.locations.length, 32);
  assert.equal(bounded.out.locationsTruncated, true);
});

test('inspect empty project without initialization or mutation', async () => {
  const dir = await empty();
  const r = cli(dir, 'inspect');
  assert.equal(r.status, 0);
  assert.equal(r.out.configured, false);
  assert.equal(r.out.executed, false);
  assert.deepEqual(r.out.candidates, []);
  assert.deepEqual(await readdir(dir), []);
  assert.equal(cli(dir, 'inspect', '--run').status, 3);
  assert.equal(cli(dir, 'inspect', 'unexpected').status, 3);
});
test('inspect scripts is inert, excludes bodies and includes real discovery origins', async () => {
  const dir = await empty();
  await json(join(dir, 'package.json'), {
    scripts: {
      test: 'touch should-not-exist',
      pretest: 'echo do-not-leak-script-body',
      dev: 'node server.mjs',
    },
    packageManager: 'pnpm@10.0.0',
  });
  await put(join(dir, 'AGENTS.md'), 'Project instructions');
  await put(join(dir, '.env'), 'do-not-read-env');
  const before = await readdir(dir);
  const r = cli(dir, 'inspect');
  assert.equal(r.status, 0);
  assert.deepEqual(r.out.candidates.find((c) => c.purpose === 'test').command, [
    'pnpm',
    'run',
    'test',
  ]);
  assert.equal(r.out.candidates[0].readiness, 'not-checked');
  assert.equal(r.out.candidates[0].sideEffects, 'unreviewed');
  assert.ok(r.out.sources[0].index.find((i) => i.path === 'AGENTS.md').sha256);
  assert.doesNotMatch(
    JSON.stringify(r.out),
    /do-not-leak-script-body|do-not-read-env|should-not-exist/,
  );
  assert.deepEqual(await readdir(dir), before);
});
test('inspect lock conflicts and unknown managers without inventing an executable choice', async () => {
  for (const mode of ['conflict', 'unknown']) {
    const dir = await empty();
    await json(join(dir, 'package.json'), {
      scripts: { test: 'anything' },
      ...(mode === 'unknown' ? { packageManager: 'unknown@1' } : {}),
    });
    if (mode === 'conflict') {
      await put(join(dir, 'yarn.lock'), '');
      await put(join(dir, 'package-lock.json'), '{}');
    }
    const r = cli(dir, 'inspect');
    assert.deepEqual(r.out.candidates, []);
    assert.ok(r.out.sources[0].diagnostics.length > 0);
  }
});
test('inspect recognizes a publishable npm lock without inventing a manager or executing it', async () => {
  const dir = await empty();
  await json(join(dir, 'package.json'), { scripts: { test: 'do-not-run' } });
  await put(join(dir, 'npm-shrinkwrap.json'), '{}');
  await put(join(dir, 'package-lock.json'), '{}');
  const result = cli(dir, 'inspect');
  assert.equal(result.status, 0, result.err);
  assert.deepEqual(result.out.candidates[0].command, ['npm', 'run', 'test']);
  assert.deepEqual(result.out.sources[0].diagnostics, []);
  await put(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
  const conflict = cli(dir, 'inspect');
  assert.deepEqual(conflict.out.candidates, []);
  assert.ok(conflict.out.sources[0].diagnostics.some((item) => /Conflicting/.test(item.reason)));
});
test('inspect lockfile convention and Maven wrapper without executing either', async () => {
  const dir = await empty();
  await json(join(dir, 'package.json'), { scripts: { build: 'false' } });
  await put(join(dir, 'yarn.lock'), '');
  await put(join(dir, 'pom.xml'), '<project/>');
  await put(join(dir, 'mvnw'), 'exit 1');
  const r = cli(dir, 'inspect');
  assert.ok(r.out.candidates.some((c) => c.command.join(' ') === 'yarn run build'));
  assert.ok(r.out.candidates.some((c) => c.command.join(' ') === './mvnw test'));
  assert.ok(r.out.candidates.every((c) => c.readiness === 'not-checked'));
});
test('inspect malformed, unsafe and oversized inputs as diagnostics, not successful parsing', async () => {
  for (const [name, content] of [
    ['package.json', '{broken'],
    ['README.md', 'x'.repeat(262145)],
  ]) {
    const dir = await empty();
    await put(join(dir, name), content);
    const r = cli(dir, 'inspect');
    assert.ok(r.out.sources[0].diagnostics.some((d) => d.path === name));
    assert.deepEqual(r.out.candidates, []);
  }
  const dir = await empty();
  const outside = await empty();
  await put(join(outside, 'private'), 'do-not-read-outside');
  await symlink(join(outside, 'private'), join(dir, 'README.md'));
  const r = cli(dir, 'inspect');
  assert.ok(r.out.sources[0].diagnostics.some((d) => /Symlink/.test(d.reason)));
  assert.doesNotMatch(JSON.stringify(r.out), /do-not-read-outside/);
});
test('inspect declared sources and checks, not undeclared nested projects', async () => {
  const sibling = await empty();
  await put(join(sibling, 'pom.xml'), '<project/>');
  const dir = await fixture((c) =>
    c.sources.push({ id: 'java', path: sibling, inputs: ['pom.xml'] }),
  );
  await json(join(dir, 'nested/package.json'), { scripts: { test: 'false' } });
  const r = cli(dir, 'inspect');
  assert.equal(r.out.configured, true);
  assert.equal(r.out.sources.length, 2);
  assert.ok(r.out.candidates.some((c) => c.source === 'java' && c.command[0] === 'mvn'));
  assert.ok(r.out.candidates.some((c) => c.origin.key === 'checks.unit'));
  assert.ok(r.out.candidates.every((c) => !c.cwd.includes('nested')));
});
test('inspect invalid clinx configuration fails instead of treating it as an unconfigured project', async () => {
  const dir = await empty();
  await json(join(dir, 'clinx.config.json'), { version: 99 });
  assert.equal(cli(dir, 'inspect').status, 3);
});

test('inspect isolates unusable check directories without discarding valid navigation or executing', async () => {
  for (const cwd of ['missing', '../outside', 'src/input.txt', 'linked']) {
    const dir = await fixture((c) => {
      c.checks.push({ ...c.checks[0], id: 'available', cwd: '.' });
      c.checks[0].cwd = cwd;
    });
    if (cwd === 'linked') await symlink('src', join(dir, cwd));
    const before = await readdir(dir);
    const result = cli(dir, 'inspect');
    assert.equal(result.status, 0, result.err);
    assert.equal(result.out.executed, false);
    assert.ok(result.out.candidates.some((c) => c.origin.key === 'checks.available'));
    assert.ok(!result.out.candidates.some((c) => c.origin.key === 'checks.unit'));
    assert.ok(result.out.sources[0].diagnostics.some((d) => d.path === cwd));
    assert.deepEqual(await readdir(dir), before);
  }
});
