import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, symlink, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture, cli, put, json, contract, bin } from './helpers.mjs';
import { listTasks } from '../dist/task.js';
import { withFdBudget } from './fd-budget.mjs';

test('missing contracts stay visible without classifying notes as recorded tasks or hiding lost records', async () => {
  const dir = await fixture();
  const prose = '# Proposal\nNo CLI contract was adopted; this is not an acceptance verdict.\n';
  await put(join(dir, 'clinx/tasks/notes-only/plan.md'), prose);
  await json(join(dir, 'handoff.json'), {
    focus: 'contract',
    state: 'handoff',
    summary: 'Recorded task before contract loss',
    next: 'Review current inputs',
  });
  assert.equal(
    cli(dir, 'task', 'checkpoint', 'change', '--file', join(dir, 'handoff.json')).status,
    0,
  );
  const checkpoints = await readdir(join(dir, 'clinx/tasks/change/checkpoints'));
  await unlink(join(dir, 'clinx/tasks/change/contract.json'));
  await json(join(dir, 'clinx/tasks/healthy/contract.json'), { ...contract(), id: 'healthy' });
  await put(join(dir, 'clinx/tasks/malformed/contract.json'), '{');

  for (const args of [['task', 'list'], ['status']]) {
    const result = cli(dir, ...args);
    assert.equal(result.status, 0, result.err);
    for (const id of ['notes-only', 'change']) {
      const summary = result.out.tasks.find((item) => item.id === id);
      assert.equal(summary.title, null);
      assert.equal(summary.checkpoint, null);
      assert.equal(summary.issues.length, 1);
      assert.match(summary.issues[0].error, /No CLI contract is available/);
      assert.match(summary.issues[0].error, /notes-only task or a missing record/);
    }
    assert.deepEqual(result.out.tasks.find((item) => item.id === 'healthy').issues, []);
    const malformed = result.out.tasks.find((item) => item.id === 'malformed');
    assert.equal(malformed.issues.length, 1);
    assert.doesNotMatch(malformed.issues[0].error, /notes-only/);
  }
  assert.deepEqual(await readdir(join(dir, 'clinx/tasks/notes-only')), ['plan.md']);
  assert.equal(await readFile(join(dir, 'clinx/tasks/notes-only/plan.md'), 'utf8'), prose);
  assert.deepEqual(await readdir(join(dir, 'clinx/tasks/change/checkpoints')), checkpoints);
  assert.ok(!(await readdir(join(dir, 'clinx/tasks/change'))).includes('contract.json'));
});

test('empty supplied options fail rather than widening or defaulting the request', async () => {
  const dir = await fixture();
  for (const args of [
    ['context', 'change', '--focus', ''],
    ['evidence', 'list', 'change', '--record', ''],
    ['verify', 'change', '--claim', ' '],
    ['task', 'list', '--after', ''],
    ['task', 'list', '--limit', '0'],
    ['task', 'list', '--limit', '201'],
    ['task', 'list', '--limit', '1e2'],
    ['task', 'list', '--after', '../escape'],
    ['task', 'show', 'change', '--after', '../escape'],
    ['status', '--after', '../escape'],
    ['status', 'change', '--limit', '1'],
  ])
    assert.equal(cli(dir, ...args).status, 3, args.join(' '));
  assert.equal(cli(dir, 'context', 'change').out.focus, 'discover');
  assert.equal(
    cli(dir, 'evidence', 'list', 'change', '--record', '00000000-0000-4000-8000-000000000000').out
      .records[0].integrity,
    'invalid',
  );
});

test('unreadable names cannot trap a task listing on an unusable cursor', async () => {
  const dir = await fixture();
  await put(join(dir, 'clinx/tasks/bad\nname/contract.json'), '{}');
  const first = cli(dir, 'task', 'list', '--limit', '1');
  assert.equal(first.out.tasks[0].issues.length, 1);
  assert.match(first.out.nextAfter, /^~/);
  const next = cli(dir, 'task', 'list', '--after', first.out.nextAfter);
  assert.equal(next.status, 0, next.err);
  assert.equal(next.out.tasks[0].id, 'change');
  assert.equal(next.out.nextAfter, null);
});

test('case-colliding check IDs fail before executing commands or writing receipts', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = [
      process.execPath,
      '-e',
      "require('fs').writeFileSync('executed', 'yes')",
    ];
    c.checks.push({ ...c.checks[0], id: 'UNIT' });
  });
  const result = cli(dir, 'verify', 'change', '--run');
  assert.equal(result.status, 3);
  assert.match(result.err, /case-insensitive/);
  assert.ok(!(await readdir(dir)).includes('executed'));
  assert.ok(!(await readdir(dir)).includes('.clinx'));
});

test('status retains actionable field diagnostics in JSON and text', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = [];
  });
  const result = cli(dir, 'status');
  assert.equal(result.out.configuration.state, 'invalid');
  const fields = result.out.issues.find((i) => i.component === 'configuration').fields;
  assert.ok(fields.some((i) => i.path === 'checks.0.command'));
  const human = spawnSync(process.execPath, [bin, '--root', dir, 'status'], { encoding: 'utf8' });
  assert.equal(human.status, 0);
  assert.match(human.stdout, /checks\.0\.command/);
});

test('task pages are compact, resumable and bound application file descriptors', async (t) => {
  const dir = await fixture();
  for (let i = 0; i < 180; i++) {
    const id = `task-${String(i).padStart(3, '0')}`;
    await json(join(dir, `clinx/tasks/${id}/contract.json`), { ...contract(), id });
  }
  const all = [];
  let after;
  do {
    const result = cli(dir, 'task', 'list', '--limit', '37', ...(after ? ['--after', after] : []));
    assert.equal(result.status, 0, result.err);
    assert.ok(result.out.tasks.length <= 37);
    assert.ok(result.out.tasks.every((t) => t.issues.length === 0));
    all.push(...result.out.tasks.map((t) => t.id));
    after = result.out.nextAfter;
  } while (after);
  assert.equal(all.length, 181);
  assert.equal(new Set(all).size, 181);
  assert.deepEqual(all, [...all].sort());
  const { result: bounded, peak } = await withFdBudget(t, 8, () => listTasks(dir, { limit: 200 }));
  assert.ok(peak > 0 && peak <= 8);
  assert.equal(bounded.tasks.length, 181);
  assert.ok(bounded.tasks.every((task) => task.issues.length === 0));
  await symlink('task-001', join(dir, 'clinx/tasks/broken-link'));
  const selected = cli(dir, 'status', 'change');
  assert.deepEqual(
    selected.out.tasks.map((t) => t.id),
    ['change'],
  );
  assert.equal(selected.out.nextAfter, null);
});

test('task listing respects its byte budget and leaves full handoffs to selected reads', async () => {
  const dir = await fixture();
  for (let i = 0; i < 25; i++) {
    const id = `large-${i}`;
    await json(join(dir, `clinx/tasks/${id}/contract.json`), {
      ...contract(),
      id,
      title: 'x'.repeat(16000),
    });
  }
  await json(join(dir, 'note.json'), {
    focus: 'build',
    state: 'handoff',
    summary: 'Details for the selected task',
    next: 'Inspect current inputs',
  });
  assert.equal(
    cli(dir, 'task', 'checkpoint', 'change', '--file', join(dir, 'note.json')).status,
    0,
  );
  const first = cli(dir, 'task', 'list');
  assert.ok(Buffer.byteLength(JSON.stringify(first.out.tasks)) <= 256 * 1024);
  assert.ok(first.out.nextAfter);
  assert.equal(first.out.tasks[0].checkpoint.focus, 'build');
  assert.equal(first.out.tasks[0].checkpoint.note, undefined);
  assert.equal(
    cli(dir, 'task', 'show', 'change').out.checkpoint.note.summary,
    'Details for the selected task',
  );
});

test('a damaged or oversized revision never hides readable history or blocks the next page', async () => {
  const dir = await fixture();
  const base = join(dir, 'clinx/tasks/change/revisions');
  await put(join(base, '01.json'), '{bad');
  await json(join(base, '02.json'), { reason: 'retained' });
  await json(join(base, '03.json'), { reason: 'x'.repeat(300000) });
  await json(join(base, '04.json'), { reason: 'also retained' });
  const first = cli(dir, 'task', 'show', 'change', '--limit', '2');
  assert.deepEqual(first.out.revisions, [{ reason: 'retained' }]);
  assert.equal(first.out.nextAfter, '02.json');
  assert.match(first.out.issues[0].path, /01\.json$/);
  const second = cli(dir, 'task', 'show', 'change', '--after', first.out.nextAfter);
  assert.deepEqual(second.out.revisions, [{ reason: 'also retained' }]);
  assert.equal(second.out.nextAfter, null);
  assert.match(second.out.issues[0].error, /256 KiB/);
  assert.equal(await readFile(join(base, '01.json'), 'utf8'), '{bad');
});
