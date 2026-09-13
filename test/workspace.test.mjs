import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, symlink, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, cli, put, json, contract, config } from './helpers.mjs';
import { canonical } from '../dist/files.js';

const revise = (dir, file) =>
  cli(dir, 'task', 'revise', 'change', '--file', file, '--reason', 'Authorized contract update');
const savedRevisions = async (dir) => {
  const path = join(dir, 'clinx/tasks/change/revisions');
  return Promise.all(
    (await readdir(path)).map(async (name) => JSON.parse(await readFile(join(path, name), 'utf8'))),
  );
};

test('unavailable source roots preserve history while current execution remains blocked', async () => {
  const dir = await fixture((c) =>
    c.sources.push({ id: 'service', path: 'service', inputs: ['state.txt'] }),
  );
  await put(join(dir, 'service/state.txt'), 'current');
  const note = join(dir, 'note.json');
  await json(note, {
    focus: 'verify',
    state: 'active',
    summary: 'Saved before source was moved',
    next: 'Inspect bindings',
  });
  assert.equal(cli(dir, 'task', 'checkpoint', 'change', '--file', note).status, 0);
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 0);
  const observation = join(dir, 'observation.json');
  await json(observation, {
    obligations: ['behavior'],
    observedAt: new Date().toISOString(),
    observer: 'test observer',
    method: 'tool',
    target: { identity: 'local fixture', revision: 'initial' },
    outcome: 'inconclusive',
    summary: 'Captured local record',
    artifacts: [{ path: run.out.receipt, description: 'Local execution' }],
    limitations: [],
  });
  assert.equal(cli(dir, 'evidence', 'attach', 'change', '--file', observation).status, 0);
  await rename(join(dir, 'service'), join(dir, 'service-moved'));
  assert.equal(cli(dir, 'task', 'list').status, 0);
  const resumed = cli(dir, 'context', 'change');
  assert.equal(resumed.status, 0, resumed.err);
  assert.equal(resumed.out.checkpoint.sequence, 1);
  assert.equal(resumed.out.continuity, 'reconcile-required');
  assert.match(resumed.out.changes.join(' '), /Cannot establish current source inputs/);
  const history = cli(dir, 'evidence', 'list', 'change');
  assert.equal(history.status, 0, history.err);
  assert.equal(history.out.records[0].integrity, 'intact');
  assert.equal(history.out.records[0].localBinding, 'unknown');
  const verdict = cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt);
  assert.equal(verdict.status, 2, verdict.err);
  assert.equal(verdict.out.verdict.applicability, 'unknown');
  assert.equal(verdict.out.verdict.checks[0].observation, 'pass');
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 3);
  assert.equal(cli(dir, 'validate', 'change').status, 3);
  assert.equal(cli(dir, 'task', 'checkpoint', 'change', '--file', note).status, 3);
  assert.equal(cli(dir, 'evidence', 'attach', 'change', '--file', observation).status, 3);
  await put(join(dir, 'clinx.config.json'), '{');
  const tasks = cli(dir, 'task', 'list');
  assert.equal(tasks.status, 0, tasks.err);
  assert.equal(tasks.out[0].id, 'change');
  assert.equal(cli(join(dir, 'missing-project'), 'task', 'list').status, 3);
});

test('init preview does not mutate, apply is idempotent and preserves host instructions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-init-'));
  await put(join(dir, 'AGENTS.md'), 'user-owned');
  assert.equal(cli(dir, 'init', '--agent', 'codex').status, 0);
  assert.deepEqual(await readdir(dir), ['AGENTS.md']);
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  assert.equal(await readFile(join(dir, 'AGENTS.md'), 'utf8'), 'user-owned');
  assert.match(
    await readFile(join(dir, '.agents/skills/clinx-delivery/SKILL.md'), 'utf8'),
    /name: clinx-delivery/,
  );
  assert.ok(!(await readdir(dir)).includes('clinx.config.json'));
  assert.deepEqual((await readdir(join(dir, 'clinx'))).sort(), ['agent-entry.md']);
  assert.ok((await readdir(join(dir, '.clinx/install'))).includes('state.json'));
  assert.match(
    await readFile(join(dir, '.agents/skills/clinx-delivery/LICENSE'), 'utf8'),
    /MIT License/,
  );
});
test('init rejects collisions before writing other files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-conflict-'));
  await put(join(dir, 'clinx/agent-entry.md'), 'user-owned');
  const r = cli(dir, 'init', '--apply');
  assert.equal(r.status, 3);
  assert.deepEqual(await readdir(dir), ['clinx']);
  assert.deepEqual(await readdir(join(dir, 'clinx')), ['agent-entry.md']);
});
test('Skill onboarding preserves existing configuration and does not scan generated environments', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-onboarding-'));
  await put(join(dir, 'generated-cache/unrelated.txt'), 'not task input');
  await symlink('unrelated.txt', join(dir, 'generated-cache/link'));
  await put(join(dir, '.gitignore'), 'generated-cache/\n');
  const original = JSON.stringify(config());
  await put(join(dir, 'clinx.config.json'), original);
  await put(join(dir, 'src/input.txt'), 'source');
  assert.equal(cli(dir, 'init', '--apply').status, 0);
  assert.equal(await readFile(join(dir, 'clinx.config.json'), 'utf8'), original);
  await json(join(dir, 'proposal.json'), contract());
  assert.equal(cli(dir, 'task', 'add', '--file', join(dir, 'proposal.json')).status, 0);
  assert.equal(cli(dir, 'context', 'change').status, 0);
  assert.equal(cli(dir, 'verify', 'change', '--run').out.verdict.decision, 'supported');
});
test('unconfigured CLI records explain the missing declaration without generating a guess', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-no-config-'));
  cli(dir, 'init', '--apply');
  const result = cli(dir, 'context', 'change');
  assert.equal(result.status, 3);
  assert.match(result.err, /declare reviewed source inputs and checks/);
  assert.ok(!(await readdir(dir)).includes('clinx.config.json'));
});
test('a new project can record a real requirement without placeholder code or fabricated checks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-new-project-'));
  await put(join(dir, 'requirement.md'), 'An authorized user can submit and read back a request.');
  await json(join(dir, 'clinx.config.json'), {
    version: 1,
    name: 'new-project',
    sources: [{ id: 'requirement', path: '.', inputs: ['requirement.md'] }],
    checks: [],
  });
  const task = {
    ...contract(),
    mode: 'design',
    context: [{ path: 'requirement.md', why: 'Original requested behavior' }],
    obligations: [
      {
        id: 'design-review',
        description: 'Design addresses the original request',
        claims: ['local'],
        external: 'Inspect the proposed semantics and validation plan',
      },
    ],
  };
  const file = join(dir, 'proposal.json');
  await json(file, task);
  assert.equal(cli(dir, 'task', 'add', '--file', file).status, 0);
  assert.equal(cli(dir, 'context', 'change').status, 0);
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 2);
  assert.deepEqual(run.out.verdict.checks, []);
  assert.equal(run.out.verdict.obligations[0].disposition, 'unresolved');
  assert.ok(!(await readdir(dir)).includes('src'));
});
test('init refuses a symlinked destination', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-symlink-'));
  const target = await mkdtemp(join(tmpdir(), 'clinx-target-'));
  await symlink(target, join(dir, 'clinx'));
  assert.equal(cli(dir, 'init', '--apply').status, 3);
  assert.deepEqual(await readdir(target), []);
});
test('task addition is validated, not an overwrite', async () => {
  const dir = await fixture();
  const input = join(dir, 'proposal.json');
  await json(input, contract());
  assert.equal(cli(dir, 'task', 'add', '--file', input).status, 3);
  const t = contract();
  t.id = 'second';
  await json(input, t);
  assert.equal(cli(dir, 'task', 'add', '--file', input).status, 0);
  assert.equal(cli(dir, 'task', 'list').out.length, 2);
});
test('checkpoint resumes input-bound context and flags code changes', async () => {
  const dir = await fixture();
  const input = join(dir, 'note.json');
  await json(input, {
    focus: 'build',
    state: 'active',
    summary: 'Observed current flow',
    next: 'Implement the scoped change',
  });
  assert.equal(cli(dir, 'context', 'change').out.continuity, 'no-checkpoint');
  assert.equal(cli(dir, 'task', 'checkpoint', 'change', '--file', input).status, 0);
  assert.equal(cli(dir, 'context', 'change').out.continuity, 'inputs-match');
  await put(join(dir, 'src/input.txt'), 'changed');
  assert.equal(cli(dir, 'context', 'change').out.continuity, 'reconcile-required');
  assert.equal(
    cli(dir, 'task', 'checkpoint', 'change', '--file', input).out.checkpoint.sequence,
    2,
  );
});
test('context selects only relevant references and reports missing ones without pretending to read them', async () => {
  const dir = await fixture((c) => {
    c.context = [
      { path: 'map.md', description: 'Map', when: ['discover'] },
      { path: 'guide.md', description: 'Procedure', when: ['build'] },
      { path: 'missing.md', description: 'Unavailable reference', when: ['always'] },
    ];
  });
  await put(join(dir, 'map.md'), 'Source-backed map');
  await put(join(dir, 'guide.md'), 'Local procedure');
  const result = cli(dir, 'context', 'change', '--focus', 'build');
  assert.equal(result.status, 0);
  assert.deepEqual(
    result.out.index.map((i) => i.path),
    ['guide.md', 'missing.md'],
  );
  assert.equal(result.out.index[0].available, true);
  assert.equal(result.out.index[1].available, false);
  assert.equal(result.out.focus, 'build');
});
test('revision preserves old contract and invalidates prior handoff', async () => {
  const dir = await fixture();
  const input = join(dir, 'input.json');
  await json(input, { focus: 'contract', state: 'active', summary: 'Original', next: 'Build' });
  cli(dir, 'task', 'checkpoint', 'change', '--file', input);
  const changed = contract();
  changed.outcome = 'A revised outcome';
  await json(input, changed);
  const result = cli(
    dir,
    'task',
    'revise',
    'change',
    '--file',
    input,
    '--reason',
    'User clarified semantics',
  );
  assert.equal(result.status, 0);
  const revisions = await readdir(join(dir, 'clinx/tasks/change/revisions'));
  assert.equal(
    JSON.parse(await readFile(join(dir, 'clinx/tasks/change/revisions', revisions[0]), 'utf8'))
      .previous.outcome,
    contract().outcome,
  );
  assert.equal(cli(dir, 'context', 'change').out.continuity, 'reconcile-required');
});
test('task show reads contract history without requiring current configuration', async () => {
  const dir = await fixture();
  const proposal = join(dir, 'proposal.json');
  const changed = contract();
  changed.outcome = 'A revised outcome';
  await json(proposal, changed);
  assert.equal(revise(dir, proposal).status, 0);
  await put(join(dir, 'clinx.config.json'), '{broken');
  const shown = cli(dir, 'task', 'show', 'change');
  assert.equal(shown.status, 0, shown.err);
  assert.equal(shown.out.task.id, 'change');
  assert.equal(shown.out.revisions.length, 1);
  assert.equal(shown.out.checkpoint, null);
});
test('revision repairs a moved design without reconstructing lost historical input bytes', async () => {
  const dir = await fixture();
  const original = { ...contract(), context: [{ path: 'design.md', why: 'Agreed behavior' }] };
  await json(join(dir, 'clinx/tasks/change/contract.json'), original);
  await put(join(dir, 'design.md'), 'Original design');
  const before = cli(dir, 'verify', 'change', '--run');
  assert.equal(before.status, 0);
  await rename(join(dir, 'design.md'), join(dir, 'updated-design.md'));
  await put(join(dir, 'updated-design.md'), 'Revised design');
  assert.equal(cli(dir, 'validate', 'change').status, 3);
  const next = { ...original, context: [{ path: 'updated-design.md', why: 'Revised behavior' }] };
  const file = join(dir, 'proposal.json');
  await json(file, next);
  const result = revise(dir, file);
  assert.equal(result.status, 0, result.err);
  const [record] = await savedRevisions(dir);
  assert.deepEqual(record.previous, original);
  assert.equal(
    record.previousContractDigest,
    createHash('sha256').update(canonical(original)).digest('hex'),
  );
  assert.equal(Object.hasOwn(record, 'previousDigest'), false);
  const current = cli(dir, 'context', 'change');
  assert.equal(current.status, 0);
  assert.equal(record.nextDigest, current.out.taskDigest);
  const historical = cli(dir, 'reconcile', 'change', '--receipt', before.out.receipt);
  assert.equal(historical.status, 2);
  assert.equal(historical.out.verdict.applicability, 'stale');
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 0);
});
test('obsolete check references remain discoverable and can be revised against current configuration', async () => {
  const dir = await fixture();
  const original = contract();
  const current = config();
  current.checks[0].id = 'replacement';
  await json(join(dir, 'clinx.config.json'), current);
  assert.equal(cli(dir, 'validate', 'change').status, 3);
  const listed = cli(dir, 'task', 'list');
  assert.equal(listed.status, 0, listed.err);
  assert.equal(listed.out[0].id, 'change');
  const next = contract();
  next.obligations[0].checks = ['replacement'];
  const file = join(dir, 'proposal.json');
  await json(file, next);
  const result = revise(dir, file);
  assert.equal(result.status, 0, result.err);
  assert.deepEqual((await savedRevisions(dir))[0].previous, original);
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 0);
});
test('revision rejects invalid replacements without altering the old contract or creating history', async () => {
  const dir = await fixture();
  const path = join(dir, 'clinx/tasks/change/contract.json');
  const original = await readFile(path, 'utf8');
  const file = join(dir, 'proposal.json');
  const missingCheck = contract();
  missingCheck.obligations[0].checks = ['missing'];
  for (const next of [
    { ...contract(), id: 'another' },
    { ...contract(), context: [{ path: 'missing.md', why: 'Required design' }] },
    { ...contract(), context: [{ path: '../outside.md', why: 'Unsafe reference' }] },
    missingCheck,
  ]) {
    await json(file, next);
    assert.equal(revise(dir, file).status, 3);
    assert.equal(await readFile(path, 'utf8'), original);
    assert.deepEqual(await readdir(join(dir, 'clinx/tasks/change')), ['contract.json']);
  }
});
test('revision rejects malformed, inconsistent or misidentified old contracts without guessing a recovery', async () => {
  const dir = await fixture();
  const path = join(dir, 'clinx/tasks/change/contract.json');
  const file = join(dir, 'proposal.json');
  await json(file, contract());
  for (const original of [
    '{broken',
    JSON.stringify({ ...contract(), id: 'another' }),
    JSON.stringify({ ...contract(), claims: ['local', 'local'] }),
    JSON.stringify({ ...contract(), defaultClaim: 'undeclared' }),
  ]) {
    await put(path, original);
    assert.equal(revise(dir, file).status, 3);
    assert.equal(await readFile(path, 'utf8'), original);
    assert.deepEqual(await readdir(join(dir, 'clinx/tasks/change')), ['contract.json']);
  }
});
test('revision keeps a symlinked old contract and another writer lock untouched', async () => {
  const dir = await fixture();
  const path = join(dir, 'clinx/tasks/change/contract.json');
  const original = await readFile(path, 'utf8');
  const file = join(dir, 'proposal.json');
  await json(file, { ...contract(), outcome: 'Changed' });
  await mkdir(join(dir, '.clinx'));
  await put(join(dir, '.clinx/write.lock'), 'existing writer');
  assert.equal(revise(dir, file).status, 3);
  assert.equal(await readFile(path, 'utf8'), original);
  assert.equal(await readFile(join(dir, '.clinx/write.lock'), 'utf8'), 'existing writer');
  const other = await fixture();
  const stored = join(other, 'clinx/tasks/change/contract.json');
  const target = join(other, 'original.json');
  await rename(stored, target);
  await symlink(target, stored);
  assert.equal(revise(other, file).status, 3);
  assert.equal(await readFile(target, 'utf8'), original);
  assert.deepEqual(await readdir(join(other, 'clinx/tasks/change')), ['contract.json']);
});
test('checkpoint state cannot masquerade as verified completion', async () => {
  const dir = await fixture();
  const input = join(dir, 'note.json');
  for (const note of [
    { focus: 'learn', state: 'completed', summary: 'done', next: 'none' },
    { focus: 'build', state: 'blocked', summary: 'blocked', next: 'wait', blockers: [] },
  ]) {
    await json(input, note);
    assert.equal(cli(dir, 'task', 'checkpoint', 'change', '--file', input).status, 3);
  }
});
test('lock contention never steals or removes another writer lock', async () => {
  const dir = await fixture();
  await mkdir(join(dir, '.clinx'));
  await put(join(dir, '.clinx/write.lock'), 'existing');
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 3);
  assert.equal(await readFile(join(dir, '.clinx/write.lock'), 'utf8'), 'existing');
});
test('CLI rejects unknown or misapplied flags and unsafe task IDs', async () => {
  const dir = await fixture();
  for (const args of [
    ['toString'],
    ['constructor'],
    ['validate', '--run'],
    ['check'],
    ['reconcile', 'change'],
    ['reconcile', 'change', '--receipt', 'x', '--run'],
    ['verify', 'change', '--receipt', 'x'],
    ['evidence', 'add', 'change', '--file', 'x'],
    ['verify', 'change', '--allow-external'],
    ['verify', 'change', '--run', '--receipt', 'x'],
    ['context', '../escape'],
    ['context', 'change', '--focus', 'ship'],
    ['task', 'list', 'unexpected'],
  ]) {
    assert.equal(cli(dir, ...args).status, 3, args.join(' '));
  }
});

test('a damaged checkpoint is visible without blocking discovery or an explicit new handoff', async () => {
  const dir = await fixture();
  const note = join(dir, 'note.json');
  await json(note, {
    focus: 'build',
    state: 'active',
    summary: 'Observed before interruption',
    next: 'Inspect current state',
  });
  assert.equal(cli(dir, 'task', 'checkpoint', 'change', '--file', note).status, 0);
  const damaged = join(dir, 'clinx/tasks/change/checkpoints/00000002.json');
  await put(damaged, '{');
  await json(join(dir, 'clinx/tasks/healthy/contract.json'), { ...contract(), id: 'healthy' });
  await put(join(dir, 'clinx/tasks/broken/contract.json'), '{');
  await put(join(dir, 'clinx/tasks/.DS_Store'), 'unrelated metadata');
  await symlink('healthy', join(dir, 'clinx/tasks/link'));
  const listing = cli(dir, 'task', 'list');
  assert.equal(listing.status, 0, listing.err);
  assert.deepEqual(
    listing.out.map((t) => t.id),
    ['broken', 'change', 'healthy', 'link'],
  );
  assert.equal(listing.out.find((t) => t.id === 'healthy').issues.length, 0);
  for (const id of ['broken', 'change', 'link'])
    assert.equal(listing.out.find((t) => t.id === id).issues.length, 1);
  const context = cli(dir, 'context', 'change');
  assert.equal(context.status, 0, context.err);
  assert.equal(context.out.continuity, 'reconcile-required');
  assert.equal(context.out.checkpoint, null);
  assert.match(context.out.changes.join('\n'), /00000002/);
  const next = cli(dir, 'task', 'checkpoint', 'change', '--file', note);
  assert.equal(next.status, 0, next.err);
  assert.equal(next.out.checkpoint.sequence, 3);
  assert.equal(next.out.previousCheckpointIssues.length, 1);
  assert.equal(await readFile(damaged, 'utf8'), '{');
  assert.equal(cli(dir, 'context', 'change').out.continuity, 'inputs-match');
});
