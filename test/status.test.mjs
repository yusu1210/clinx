import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { cli, fixture, contract, put, json, bin } from './helpers.mjs';
import { commands, commandGroups } from '../dist/commands.js';

test('help groups every command once without inventing another workflow', () => {
  const names = Object.values(commandGroups).flat();
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(names.sort(), Object.keys(commands).sort());
});

test('status on an empty directory needs no setup, writes nothing and does not claim discovery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-status-'));
  const result = cli(dir, 'status');
  assert.equal(result.status, 0, result.err);
  assert.equal(result.out.configuration.state, 'absent');
  assert.equal(result.out.skills.managed, false);
  assert.equal(result.out.hostDiscovery, 'not-observed');
  assert.equal(result.out.acceptance, 'not-assessed');
  assert.equal(result.out.selected, null);
  assert.deepEqual(result.out.issues, []);
  assert.deepEqual(await readdir(dir), []);
  assert.equal(cli(dir, 'status', '--run').status, 3);
  assert.equal(cli(dir, 'status', '../outside').status, 3);
  assert.equal(cli(dir, 'status', 'one', 'two').status, 3);
});

test('status lists tasks without guessing or fingerprinting unavailable source inputs', async () => {
  const dir = await fixture((c) => {
    c.sources[0].inputs = ['missing'];
  });
  await json(join(dir, 'clinx/tasks/second/contract.json'), { ...contract(), id: 'second' });
  const before = await readdir(dir);
  const result = cli(dir, 'status');
  assert.equal(result.out.configuration.state, 'valid');
  assert.equal(result.out.tasks.length, 2);
  assert.equal(result.out.selected, null);
  assert.deepEqual(result.out.issues, []);
  const selected = cli(dir, 'status', 'change');
  assert.equal(selected.out.selected.continuity, 'reconcile-required');
  assert.match(selected.out.selected.changes.join(' '), /Cannot establish current source/);
  assert.deepEqual(await readdir(dir), before);
});

test('selected status checks continuity but never executes or promotes it to acceptance', async () => {
  const dir = await fixture();
  await json(join(dir, 'note.json'), {
    focus: 'build',
    state: 'handoff',
    summary: 'Work in progress',
    next: 'Inspect changed inputs',
  });
  assert.equal(
    cli(dir, 'task', 'checkpoint', 'change', '--file', join(dir, 'note.json')).status,
    0,
  );
  const first = cli(dir, 'status', 'change');
  assert.equal(first.out.selected.continuity, 'inputs-match');
  assert.equal(first.out.acceptance, 'not-assessed');
  await put(join(dir, 'src/input.txt'), 'changed');
  const second = cli(dir, 'status', 'change');
  assert.equal(second.out.selected.continuity, 'reconcile-required');
  assert.ok(!(await readdir(join(dir, '.clinx'))).includes('runs'));
});

test('status isolates corrupt setup and task records and preserves healthy history', async () => {
  const dir = await fixture();
  await put(join(dir, 'clinx.config.json'), '{"secret":"do-not-disclose"');
  await put(join(dir, '.clinx/install/state.json'), '{"secret":"do-not-disclose"');
  await put(join(dir, 'clinx/tasks/broken/contract.json'), '{}');
  const result = cli(dir, 'status', 'change');
  assert.equal(result.status, 0);
  assert.equal(result.out.configuration.state, 'invalid');
  assert.equal(result.out.skills, null);
  assert.ok(result.out.issues.some((i) => i.component === 'skills'));
  assert.ok(result.out.issues.some((i) => i.component === 'configuration'));
  assert.ok(result.out.issues.some((i) => i.component === 'task'));
  assert.equal(result.out.tasks.find((t) => t.id === 'change').title, contract().title);
  assert.deepEqual(
    result.out.tasks.map((t) => t.id),
    ['change'],
  );
  assert.ok(cli(dir, 'status').out.tasks.find((t) => t.id === 'broken').issues.length);
  assert.doesNotMatch(JSON.stringify(result.out), /do-not-disclose/);
});

test('status reports managed modifications and refuses a symlinked config without reading it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-status-managed-'));
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  await put(join(dir, '.agents/skills/clinx-knowledge/SKILL.md'), 'Local customization');
  const outside = await mkdtemp(join(tmpdir(), 'clinx-status-outside-'));
  await put(join(outside, 'private.json'), 'do-not-disclose');
  await symlink(join(outside, 'private.json'), join(dir, 'clinx.config.json'));
  const result = cli(dir, 'status');
  assert.equal(result.out.skills.matchesPackage, false);
  assert.ok(result.out.skills.files.some((f) => f.local === 'modified'));
  assert.equal(result.out.configuration.state, 'invalid');
  assert.doesNotMatch(JSON.stringify(result.out), /do-not-disclose/);
});

test('text status exposes local Skill changes and saved blockers without treating notes as authority', async () => {
  const dir = await fixture();
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  await put(join(dir, '.agents/skills/clinx-knowledge/SKILL.md'), 'Local customization');
  await json(join(dir, 'note.json'), {
    focus: 'build',
    state: 'blocked',
    summary: 'Implementation held for a boundary decision',
    next: 'Confirm scope before implementing',
    blockers: ['Owner decision pending\u001b[2J'],
  });
  assert.equal(
    cli(dir, 'task', 'checkpoint', 'change', '--file', join(dir, 'note.json')).status,
    0,
  );
  const human = (...args) =>
    spawnSync(process.execPath, [bin, '--root', dir, 'status', ...args], {
      encoding: 'utf8',
    });
  const overview = human();
  assert.equal(overview.status, 0, overview.stderr);
  assert.match(overview.stdout, /modified: \.agents\/skills\/clinx-knowledge\/SKILL\.md/);
  assert.match(overview.stdout, /saved handoff: blocked/);
  assert.match(overview.stdout, /preserve local customizations/);
  const selected = human('change');
  assert.equal(selected.status, 0, selected.stderr);
  assert.match(selected.stdout, /Saved summary: Implementation held/);
  assert.match(selected.stdout, /saved blocker \(recheck\): Owner decision pending\\u001b/);
  assert.doesNotMatch(selected.stdout, /\u001b/);
  assert.match(selected.stdout, /acceptance not assessed/);
  assert.equal(cli(dir, 'status', 'change').out.selected.continuity, 'inputs-match');
  assert.ok(!(await readdir(join(dir, '.clinx'))).includes('runs'));
});
