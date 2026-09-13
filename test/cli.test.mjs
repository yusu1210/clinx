import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readdir, copyFile, mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bin, root, fixture, contract, json, put } from './helpers.mjs';
import { commands } from '../dist/commands.js';
import { terminalText } from '../dist/output.js';

const run = (cwd, args, input) =>
  spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: 'utf8',
    input,
    timeout: 15000,
    maxBuffer: 12 * 1024 * 1024,
  });
test('an incomplete installation reports a recovery hint without an import stack', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-incomplete-'));
  await mkdir(join(dir, 'bin'));
  await copyFile(bin, join(dir, 'bin/clinx.mjs'));
  const failed = spawnSync(process.execPath, [join(dir, 'bin/clinx.mjs'), '--json'], {
    encoding: 'utf8',
  });
  assert.equal(failed.status, 3);
  const error = JSON.parse(failed.stderr);
  assert.equal(error.code, 'INSTALLATION_INCOMPLETE');
  assert.match(error.hint, /Reinstall/);
  assert.doesNotMatch(failed.stderr, /ERR_MODULE_NOT_FOUND/);
});
test('a closed output consumer does not produce an unhandled broken-pipe error', async () => {
  const child = spawn(process.execPath, [bin, '--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk;
  });
  child.stdout.destroy();
  const [code, signal] = await once(child, 'close');
  assert.equal(signal, null);
  assert.equal(code, 0, stderr);
  assert.equal(stderr, '');
});
test('every command has focused human and machine help without touching the workspace', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-help-'));
  for (const [name, command] of Object.entries(commands)) {
    const args = name.split(' ');
    const human = run(dir, [...args, '--help']);
    assert.equal(human.status, 0, human.stderr);
    assert.ok(human.stdout.includes(`Usage: clinx ${command.usage}`));
    assert.ok(human.stdout.includes(command.examples[0]));
    const machine = run(dir, ['help', ...args, '--json']);
    assert.deepEqual(Object.keys(JSON.parse(machine.stdout).commands), [name]);
  }
  assert.deepEqual(await readdir(dir), []);
  assert.equal(run(dir, ['task', '--help']).status, 0);
  assert.equal(run(dir, ['help', 'unknown']).status, 3);
  assert.equal(run(dir, ['help', 'constructor']).status, 3);
  assert.equal(
    run(dir, ['--version']).stdout.trim(),
    JSON.parse(run(dir, ['--version', '--json']).stdout).version,
  );
  assert.equal(run(dir, ['-v']).status, 0);
  assert.equal(run(dir, ['-h']).status, 0);
});
test('default output is readable and JSON is explicit, including errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx human space '));
  const human = run(dir, ['init', '--agent', 'codex']);
  assert.equal(human.status, 0, human.stderr);
  assert.match(human.stdout, /Workspace:/);
  assert.match(human.stdout, /PREVIEW — no files written/);
  const machine = run(dir, ['init', '--agent', 'codex', '--json']);
  assert.equal(JSON.parse(machine.stdout).applied, false);
  assert.deepEqual(await readdir(dir), []);
  for (const args of [
    ['unknown'],
    ['verify'],
    ['task', 'add'],
    ['init', '--run'],
    ['init', '--agent', 'unknown'],
    ['verify', 'change', '--allow-external'],
    ['inspect', '--root', ''],
    ['inspect', '--mispelled'],
  ]) {
    const result = run(dir, args);
    assert.equal(result.status, 3, result.stdout);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Error \[USAGE\]/);
    assert.equal(JSON.parse(run(dir, [...args, '--json']).stderr).code, 'USAGE');
  }
});
test('piped contracts work from another cwd and malformed input is not disclosed', async () => {
  const dir = await fixture();
  const task = { ...contract(), id: 'piped' };
  const result = run(
    root,
    ['task', 'add', '--root', dir, '--file', '-', '--json'],
    JSON.stringify(task),
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).task, 'piped');
  const invalid = run(
    root,
    ['task', 'add', '--root', dir, '--file', '-', '--json'],
    '{"secret":"do-not-print-me"',
  );
  assert.equal(invalid.status, 3);
  assert.equal(JSON.parse(invalid.stderr).code, 'INVALID_JSON');
  assert.doesNotMatch(invalid.stderr, /do-not-print-me/);
  const large = run(
    root,
    ['task', 'add', '--root', dir, '--file', '-', '--json'],
    ' '.repeat(8 * 1024 * 1024 + 1),
  );
  assert.equal(large.status, 3, String(large.error));
  assert.equal(JSON.parse(large.stderr).code, 'INVALID_INPUT');
});
test('human verdicts distinguish preview, supported, failed and unresolved', async () => {
  const dir = await fixture();
  const preview = run(dir, ['verify', 'change']);
  assert.match(preview.stdout, /^PREVIEW — no checks executed; no claim established/);
  const passed = run(dir, ['verify', 'change', '--run']);
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /^SUPPORTED/);
  const failing = await fixture((config) => {
    config.checks[0].command = [process.execPath, '-e', 'process.exit(1)'];
  });
  const failed = run(failing, ['verify', 'change', '--run']);
  assert.equal(failed.status, 1, failed.stderr);
  assert.match(failed.stdout, /^FAILED/);
  const task = contract();
  task.obligations.push({
    id: 'external',
    description: 'Real target',
    claims: ['local'],
    external: 'Authorized observation required',
  });
  await json(join(dir, 'clinx/tasks/change/contract.json'), task);
  const unresolved = run(dir, ['verify', 'change', '--run']);
  assert.equal(unresolved.status, 2, unresolved.stderr);
  assert.match(unresolved.stdout, /^UNRESOLVED/);
});
test('terminal control characters are escaped without altering machine data', async () => {
  assert.equal(terminalText('name\x1b[2J\n\u202e'), 'name\\u001b[2J\\u000a\\u202e');
  const dir = await fixture();
  await json(join(dir, 'clinx/tasks/change/contract.json'), {
    ...contract(),
    title: 'title\x1b[2J',
  });
  const human = run(dir, ['task', 'list']);
  assert.doesNotMatch(human.stdout, /\x1b/);
  assert.match(human.stdout, /\\u001b/);
  assert.equal(JSON.parse(run(dir, ['task', 'list', '--json']).stdout)[0].title, 'title\x1b[2J');
});
test('resources locate installed assets and roots never silently select a parent', async () => {
  const dir = await fixture();
  await put(join(dir, 'nested/file.txt'), 'child');
  const result = run(join(dir, 'nested'), ['validate', '--json']);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /No clinx.config.json/);
  const resources = JSON.parse(run(dir, ['resources', '--json']).stdout);
  assert.equal(resources.skill, join(root, 'skills/clinx-delivery'));
  assert.equal(run(join(dir, 'nested'), ['validate', '--root', '..']).status, 0);
});

test('human inspection keeps candidates and diagnostics readable without printing script bodies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-inspection-text-'));
  await json(join(dir, 'package.json'), { scripts: { test: 'do-not-execute-or-disclose' } });
  await put(join(dir, 'AGENTS.md'), 'Project guidance');
  const result = run(dir, ['inspect']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /INSPECTION — 1 unreviewed command candidate/);
  assert.match(result.stdout, /reference: AGENTS.md/);
  assert.match(result.stdout, /diagnostic: package.json/);
  assert.match(result.stdout, /argv \["npm","run","test"\]/);
  assert.match(result.stdout, /scripts.test/);
  assert.doesNotMatch(result.stdout, /do-not-execute-or-disclose/);
  assert.deepEqual((await readdir(dir)).sort(), ['AGENTS.md', 'package.json']);
});

test('example copy preserves raw inputs, refuses existing destinations and never executes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx examples space '));
  const result = run(dir, ['example', 'copy', 'noticeboard', '--to', 'practice', '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).executed, false);
  assert.deepEqual((await readdir(join(dir, 'practice'))).sort(), ['PRD.md', 'service', 'viewer']);
  const { readFile, symlink } = await import('node:fs/promises');
  assert.deepEqual(
    await readFile(join(dir, 'practice/PRD.md')),
    await readFile(join(root, 'evals/fixtures/noticeboard/PRD.md')),
  );
  const repeated = run(dir, ['example', 'copy', 'noticeboard', '--to', 'practice', '--json']);
  assert.equal(JSON.parse(repeated.stderr).code, 'DESTINATION_EXISTS');
  await symlink(join(dir, 'practice'), join(dir, 'link'));
  assert.equal(run(dir, ['example', 'copy', 'noticeboard', '--to', 'link']).status, 3);
  assert.equal(run(dir, ['example', 'copy', 'not-real', '--to', 'absent']).status, 3);
  assert.equal(run(dir, ['example', 'copy', 'noticeboard', '--to', '']).status, 3);
  assert.equal(run(dir, ['example', 'copy', 'noticeboard', '--to', 'missing/child']).status, 3);
  const cases = JSON.parse(run(dir, ['example', 'list', '--json']).stdout);
  for (const item of cases)
    assert.equal(run(dir, ['example', 'copy', item.name, '--to', item.name]).status, 0, item.name);
});
