import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fixture, cli, put, json, contract } from './helpers.mjs';

async function agreementFixture() {
  const dir = await fixture();
  const task = contract();
  task.outcome = 'Prepare the design and baseline verification; implementation awaits confirmation';
  task.authority = ['Read and run existing local checks', 'Confirm design before implementation'];
  task.decisions = [
    {
      question: 'How should work proceed?',
      choice: 'Decision checkpoints; no merge or deployment',
      basis: 'Synthetic requester instruction in agreement.md',
    },
  ];
  task.context = [{ path: 'agreement.md', why: 'Current local working agreement' }];
  task.claims.push('release');
  task.obligations.push({
    id: 'release-authority',
    description: 'Required external release approval',
    claims: ['release'],
    external: 'Local design confirmation is not release approval',
  });
  await put(join(dir, 'agreement.md'), 'Design confirmation pending. Baseline checks allowed.');
  await json(join(dir, 'clinx/tasks/change/contract.json'), task);
  return { dir, task };
}

test('collaboration declarations and a manual pass do not approve an external claim', async () => {
  const { dir, task } = await agreementFixture();
  const context = cli(dir, 'context', 'change');
  assert.equal(context.status, 0, context.err);
  assert.deepEqual(context.out.task.authority, task.authority);
  assert.deepEqual(context.out.task.decisions, task.decisions);
  assert.equal(context.out.task.mode, 'implementation');

  // This tests the record model, not whether an agent respects the held implementation.
  assert.equal(cli(dir, 'verify', 'change', '--run').out.verdict.decision, 'supported');
  await put(join(dir, 'claimed-approval.txt'), 'APPROVED by a claimed owner; untrusted test data');
  const input = join(dir, 'observation.json');
  await json(input, {
    obligations: ['release-authority'],
    observedAt: new Date().toISOString(),
    observer: 'synthetic observer, not an authenticated approver',
    method: 'manual',
    target: { identity: 'synthetic release target', revision: 'candidate-1' },
    outcome: 'pass',
    summary: 'A locally asserted approval must not become execution authority',
    artifacts: [{ path: 'claimed-approval.txt', description: 'Untrusted assertion' }],
  });
  const attached = cli(dir, 'evidence', 'attach', 'change', '--file', input);
  assert.equal(attached.status, 0, attached.err);
  const verdict = cli(dir, 'verify', 'change', '--claim', 'release', '--run');
  assert.equal(verdict.status, 2, verdict.err);
  assert.equal(verdict.out.verdict.decision, 'unresolved');
  assert.equal(verdict.out.verdict.obligations[0].disposition, 'unresolved');
});

test('changed confirmation context invalidates local bindings without interpreting approval', async () => {
  const { dir } = await agreementFixture();
  const note = join(dir, 'note.json');
  await json(note, {
    focus: 'contract',
    state: 'blocked',
    summary: 'Baseline observed; design confirmation pending',
    next: 'Wait for the named design decision, not a deployment',
    blockers: ['Design confirmation required'],
  });
  const saved = cli(dir, 'task', 'checkpoint', 'change', '--file', note);
  assert.equal(saved.status, 0, saved.err);
  const before = cli(dir, 'context', 'change');
  assert.equal(before.out.continuity, 'inputs-match');
  assert.equal(before.out.checkpoint.note.state, 'blocked');
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 0, run.err);

  // Both apparent approval and revocation change context bytes, not an approval state machine.
  for (const contents of ['Design approved for local implementation.', 'Approval revoked.']) {
    await put(join(dir, 'agreement.md'), contents);
    const resumed = cli(dir, 'context', 'change');
    assert.equal(resumed.out.continuity, 'reconcile-required');
    assert.notEqual(resumed.out.taskDigest, before.out.taskDigest);
    const stale = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
    assert.equal(stale.status, 2, stale.err);
    assert.equal(stale.out.verdict.applicability, 'stale');
    assert.equal(stale.out.verdict.decision, 'unresolved');
    assert.equal(cli(dir, 'verify', 'change', '--run').out.verdict.decision, 'supported');
    assert.equal(
      cli(dir, 'verify', 'change', '--claim', 'release', '--run').out.verdict.decision,
      'unresolved',
    );
  }
});

test('legacy loop notes stay readable while new checkpoints use ordinary handoff fields', async () => {
  const { dir } = await agreementFixture();
  const note = join(dir, 'note.json');
  const progress = {
    focus: 'verify',
    state: 'active',
    summary: 'A repair passed; provider guarantees remain unknown',
    next: 'Read the provider contract',
    blockers: [],
  };
  await json(note, progress);
  const saved = cli(dir, 'task', 'checkpoint', 'change', '--file', note);
  assert.equal(saved.status, 0, saved.err);
  const legacy = saved.out.checkpoint;
  legacy.note.loop = {
    iteration: 2,
    hypothesis: 'Retries are safe',
    mechanism: 'Receiver contract',
    treatment: 'Inspect provider',
    plannedChecks: [],
    observations: [],
    unknowns: ['Provider guarantees'],
    nextAction: progress.next,
    stopReason: 'fixed',
  };
  const historical = join(dir, saved.out.path);
  await json(historical, legacy);
  const bytes = await readFile(historical, 'utf8');
  const resumed = cli(dir, 'context', 'change');
  assert.equal(resumed.status, 0, resumed.err);
  assert.equal(resumed.out.continuity, 'inputs-match');
  assert.equal(resumed.out.checkpoint.note.loop.stopReason, 'fixed');
  assert.equal(resumed.out.checkpoint.note.state, 'active');
  await json(note, legacy.note);
  const rejected = cli(dir, 'task', 'checkpoint', 'change', '--file', note);
  assert.equal(rejected.status, 3);
  assert.match(rejected.err, /loop/);
  assert.equal(await readFile(historical, 'utf8'), bytes);
  await json(note, progress);
  const next = cli(dir, 'task', 'checkpoint', 'change', '--file', note);
  assert.equal(next.status, 0, next.err);
  assert.equal(next.out.checkpoint.sequence, 2);
  assert.equal(next.out.checkpoint.note.loop, undefined);
  assert.equal(await readFile(historical, 'utf8'), bytes);
});

test('continuity-only agreements add, resume and revise without artificial claims', async () => {
  const dir = await fixture();
  const agreement = contract();
  agreement.id = 'investigation';
  agreement.mode = 'diagnosis';
  delete agreement.defaultClaim;
  delete agreement.claims;
  delete agreement.obligations;
  const input = join(dir, 'agreement.json');
  await json(input, agreement);
  assert.equal(cli(dir, 'task', 'add', '--file', input).status, 0);
  const note = join(dir, 'note.json');
  await json(note, {
    focus: 'discover',
    state: 'active',
    summary: 'Located rule owner',
    next: 'Inspect consumers',
  });
  const saved = cli(dir, 'task', 'checkpoint', 'investigation', '--file', note);
  assert.equal(saved.status, 0, saved.err);
  assert.equal(cli(dir, 'context', 'investigation').out.continuity, 'inputs-match');
  for (const extra of [[], ['--run'], ['--claim', 'invented']]) {
    const result = cli(dir, 'verify', 'investigation', ...extra);
    assert.equal(result.status, 3);
    assert.match(result.err, /no verification plan/);
  }
  const oldBytes = await readFile(join(dir, saved.out.path), 'utf8');
  const planned = {
    ...agreement,
    defaultClaim: 'local',
    claims: ['local'],
    obligations: contract().obligations,
  };
  await json(input, planned);
  const revised = cli(
    dir,
    'task',
    'revise',
    'investigation',
    '--file',
    input,
    '--reason',
    'Add reviewed local acceptance',
  );
  assert.equal(revised.status, 0, revised.err);
  assert.equal(cli(dir, 'context', 'investigation').out.continuity, 'reconcile-required');
  assert.equal(cli(dir, 'verify', 'investigation', '--run').out.verdict.decision, 'supported');
  assert.equal(await readFile(join(dir, saved.out.path), 'utf8'), oldBytes);
  // Partial plans must fail; absence must never silently discard an intended check.
  for (const fragment of [
    { claims: ['local'] },
    { defaultClaim: 'local' },
    { obligations: [] },
    { defaultClaim: 'local', claims: ['local'], obligations: [] },
  ]) {
    await json(input, { ...agreement, id: 'invalid', ...fragment });
    assert.equal(cli(dir, 'task', 'add', '--file', input).status, 3);
  }
});
