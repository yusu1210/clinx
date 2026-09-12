import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, cli, json, put, config, contract } from './helpers.mjs';

test('verification failure exposes the check, actual failure and readable log locations', async () => {
  const dir = await fixture(
    (c) =>
      (c.checks[0].command = [
        process.execPath,
        '-e',
        'console.error("failure detail");process.exit(7)',
      ]),
  );
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 1);
  const detail = run.out.verdict.checks[0];
  assert.equal(detail.id, 'unit');
  assert.equal(detail.execution, 'completed');
  assert.equal(detail.observation, 'fail');
  assert.match(detail.reason, /exited 7/);
  const log = detail.artifacts.find((p) => p.endsWith('.stderr'));
  assert.match(await readFile(join(dir, log), 'utf8'), /failure detail/);
});
test('missing executable and expected test identity are actionable inconclusive diagnostics', async () => {
  const absent = await fixture((c) => (c.checks[0].command = ['clinx-no-such-executable-4af731']));
  const unavailable = cli(absent, 'verify', 'change', '--run');
  assert.equal(unavailable.status, 2);
  assert.equal(unavailable.out.verdict.checks[0].execution, 'failed-to-run');
  const wrong = await fixture((c) => (c.checks[0].result.expectedTests = ['Other#missing']));
  const r = cli(wrong, 'verify', 'change', '--run');
  assert.equal(r.status, 2);
  assert.match(r.out.verdict.checks[0].reason, /Expected passing testcase IDs/);
});
test('diagnostic observation is recomputed and never promotes edited receipt prose', async () => {
  const dir = await fixture(
    (c) => (c.checks[0].command = [process.execPath, '-e', 'console.log("not xml")']),
  );
  const run = cli(dir, 'verify', 'change', '--run');
  const path = join(dir, run.out.receipt);
  const receipt = JSON.parse(await readFile(path, 'utf8'));
  receipt.checks[0].observation = 'pass';
  receipt.checks[0].reason = 'Everything passed';
  await json(path, receipt);
  const result = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
  assert.equal(result.status, 2);
  assert.equal(result.out.verdict.checks[0].observation, 'inconclusive');
  assert.match(result.out.verdict.checks[0].reason, /Cannot interpret/);
});
test('old local observations remain visible but cannot satisfy stale obligations', async () => {
  const dir = await fixture();
  const run = cli(dir, 'verify', 'change', '--run');
  await put(join(dir, 'src/input.txt'), 'new source');
  const stale = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
  assert.equal(stale.status, 2);
  assert.equal(stale.out.verdict.applicability, 'stale');
  assert.equal(stale.out.verdict.checks[0].observation, 'pass');
  assert.equal(stale.out.verdict.obligations[0].disposition, 'unresolved');
});
test('receipt applicability includes every declared source and the complete configuration', async () => {
  const c = config();
  c.sources.push({ id: 'other', path: 'other', inputs: ['state.txt'] });
  const dir = await fixture((value) => Object.assign(value, c));
  await put(join(dir, 'other/state.txt'), 'unchanged');
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 0);
  await put(join(dir, 'other/state.txt'), 'changed outside the selected check');
  const drift = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
  assert.equal(drift.status, 2);
  assert.equal(drift.out.verdict.applicability, 'stale');
  assert.equal(drift.out.verdict.checks[0].observation, 'pass');
  await put(join(dir, 'other/state.txt'), 'unchanged');
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt).status, 0);
  c.context = [{ path: 'navigation.md', description: 'Optional navigation', when: ['discover'] }];
  await json(join(dir, 'clinx.config.json'), c);
  const changedConfig = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
  assert.equal(changedConfig.status, 2);
  assert.equal(changedConfig.out.verdict.applicability, 'stale');
});
test('separate passing receipts are not implicitly merged into a broader claim', async () => {
  const dir = await fixture((c) => c.checks.push({ ...c.checks[0], id: 'second' }));
  const task = contract();
  task.claims = ['first', 'second', 'both'];
  task.defaultClaim = 'both';
  task.obligations = [
    { id: 'first', description: 'First assertion', claims: ['first', 'both'], checks: ['unit'] },
    {
      id: 'second',
      description: 'Second assertion',
      claims: ['second', 'both'],
      checks: ['second'],
    },
  ];
  await json(join(dir, 'clinx/tasks/change/contract.json'), task);
  const first = cli(dir, 'verify', 'change', '--claim', 'first', '--run');
  const second = cli(dir, 'verify', 'change', '--claim', 'second', '--run');
  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  for (const run of [first, second]) {
    const combined = cli(
      dir,
      'reconcile',
      'change',
      '--claim',
      'both',
      '--receipt',
      run.out.receipt,
    );
    assert.equal(combined.status, 2);
    assert.equal(combined.out.verdict.applicability, 'stale');
    assert.ok(combined.out.verdict.reasons.includes('Receipt was produced for a different claim'));
    assert.equal(
      combined.out.verdict.checks.filter((c) => c.execution === 'not-recorded').length,
      1,
    );
  }
  assert.equal(cli(dir, 'verify', 'change', '--claim', 'both', '--run').status, 0);
});
