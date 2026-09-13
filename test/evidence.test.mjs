import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, symlink, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fixture, cli, put, json, contract } from './helpers.mjs';

const observation = () => ({
  obligations: ['browser'],
  observedAt: '2026-01-01T00:00:00.000Z',
  observer: 'local evaluator',
  method: 'manual',
  target: { identity: 'loopback test instance / desktop browser', revision: 'fixture-revision-1' },
  outcome: 'pass',
  summary: 'Submitted a real form and observed the saved value after reload',
  artifacts: [{ path: '.clinx/inbox/browser.txt', description: 'Sanitized interaction record' }],
  limitations: ['One local browser; not a deployed environment'],
});
async function setup() {
  const dir = await fixture();
  const task = contract();
  task.obligations.push({
    id: 'browser',
    description: 'Actual browser behavior',
    claims: ['local'],
    external: 'Browser evidence required',
  });
  await json(join(dir, 'clinx/tasks/change/contract.json'), task);
  await put(join(dir, '.clinx/inbox/browser.txt'), 'observed real interaction');
  const file = join(dir, 'observation.json');
  await json(file, observation());
  return { dir, file };
}
const add = ({ dir, file }) => cli(dir, 'evidence', 'attach', 'change', '--file', file);
const list = ({ dir }) => cli(dir, 'evidence', 'list', 'change');

test('attachments preserve artifacts and never satisfy an external obligation', async () => {
  const f = await setup();
  const added = add(f);
  assert.equal(added.status, 0, added.err);
  assert.equal(added.out.record.trust, 'local-attachment-not-attested');
  const stored = join(f.dir, dirname(added.out.path), added.out.record.artifacts[0].path);
  assert.equal(await readFile(stored, 'utf8'), 'observed real interaction');
  await unlink(join(f.dir, '.clinx/inbox/browser.txt'));
  const listed = list(f);
  assert.equal(listed.status, 0, listed.err);
  assert.equal(listed.out.records[0].integrity, 'intact');
  assert.equal(listed.out.records[0].localBinding, 'matches');
  assert.equal(listed.out.records[0].remoteState, 'not-checked');
  assert.equal(cli(f.dir, 'verify', 'change', '--run').out.verdict.decision, 'unresolved');
});

test('attachment source and contract drift is distinct from intact historical bytes', async () => {
  const f = await setup();
  assert.equal(add(f).status, 0);
  await put(join(f.dir, 'src/input.txt'), 'changed');
  let r = list(f).out.records[0];
  assert.equal(r.integrity, 'intact');
  assert.equal(r.localBinding, 'changed');
  await put(join(f.dir, 'src/input.txt'), 'baseline');
  const task = JSON.parse(await readFile(join(f.dir, 'clinx/tasks/change/contract.json'), 'utf8'));
  task.outcome = 'Revised outcome';
  await json(join(f.dir, 'clinx/tasks/change/contract.json'), task);
  r = list(f).out.records[0];
  assert.equal(r.localBinding, 'changed');
});

test('tampered or missing attachment bytes are reported invalid, not observed pass', async () => {
  const f = await setup();
  const r = add(f).out;
  const stored = join(f.dir, dirname(r.path), r.record.artifacts[0].path);
  await put(stored, 'edited evidence');
  const tampered = list(f).out.records[0];
  assert.equal(tampered.integrity, 'invalid');
  assert.equal(tampered.record.id, r.record.id);
  assert.equal(tampered.localBinding, 'matches');
  await put(stored, 'larger than the recorded byte limit'.repeat(100));
  assert.match(list(f).out.records[0].reasons.join(' '), /bounded file/);
  await unlink(stored);
  assert.equal(list(f).out.records[0].integrity, 'invalid');
});

test('an unreadable current input makes attachment applicability unknown', async () => {
  const f = await setup();
  assert.equal(add(f).status, 0);
  await unlink(join(f.dir, 'src/input.txt'));
  // The declared src directory then contains no files.
  const c = JSON.parse(await readFile(join(f.dir, 'clinx.config.json'), 'utf8'));
  c.sources[0].inputs = ['src/input.txt'];
  await json(join(f.dir, 'clinx.config.json'), c);
  const r = list(f);
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out.records[0].localBinding, 'unknown');
  assert.equal(r.out.records[0].integrity, 'intact');
});

test('attachments reject unknown obligations, unsupported metadata and future observations', async () => {
  const f = await setup();
  for (const change of [
    { obligations: ['unknown'] },
    { obligations: ['browser', 'browser'] },
    { observedAt: '2999-01-01T00:00:00.000Z' },
    { outcome: 'approved' },
    { target: { identity: 'target' } },
    { approved: true },
    { artifacts: [] },
  ]) {
    await json(f.file, { ...observation(), ...change });
    assert.equal(add(f).status, 3, JSON.stringify(change));
  }
  assert.deepEqual(list(f).out.records, []);
});

test('attachment paths cannot escape or traverse symlinks and inputs are size bounded', async () => {
  const f = await setup();
  const other = await fixture();
  await symlink(join(other, 'src/input.txt'), join(f.dir, '.clinx/inbox/link.txt'));
  await put(join(f.dir, '.clinx/inbox/large.txt'), Buffer.alloc(8 * 1024 * 1024 + 1));
  for (const path of [
    '../outside',
    join(other, 'src/input.txt'),
    '.clinx/inbox/link.txt',
    '.clinx/inbox/large.txt',
  ]) {
    await json(f.file, { ...observation(), artifacts: [{ path, description: 'bad input' }] });
    assert.equal(add(f).status, 3, path);
  }
  assert.deepEqual(list(f).out.records, []);
});

test('attachment listing isolates corrupt records and rejects stored path traversal', async () => {
  const f = await setup();
  const a = add(f).out;
  const b = add(f).out;
  await put(join(f.dir, a.path), '{not json');
  const record = JSON.parse(await readFile(join(f.dir, b.path), 'utf8'));
  record.artifacts[0].path = '../outside.txt';
  await json(join(f.dir, b.path), record);
  const r = list(f);
  assert.equal(r.status, 0, r.err);
  assert.equal(r.out.records.length, 2);
  assert.ok(r.out.records.every((x) => x.integrity === 'invalid'));
});

test('attachment failure assertions remain visible and records are append-only', async () => {
  const f = await setup();
  await json(f.file, {
    ...observation(),
    outcome: 'fail',
    summary: 'Observed stale display after reload',
  });
  const failed = add(f);
  await json(f.file, observation());
  const passed = add(f);
  assert.equal(failed.status, 0, failed.err);
  assert.equal(passed.status, 0, passed.err);
  assert.notEqual(failed.out.path, passed.out.path);
  const r = list(f).out;
  assert.deepEqual(
    new Set(r.records.map((x) => x.record.observation.outcome)),
    new Set(['pass', 'fail']),
  );
  assert.equal(cli(f.dir, 'verify', 'change', '--run').out.verdict.decision, 'unresolved');
});

test('evidence CLI rejects extra arguments and listing does not create a store', async () => {
  const f = await setup();
  const before = await readdir(join(f.dir, '.clinx'));
  assert.deepEqual(list(f).out.records, []);
  assert.deepEqual(await readdir(join(f.dir, '.clinx')), before);
  for (const args of [
    ['evidence', 'list'],
    ['evidence', 'list', 'change', '--run'],
    ['evidence', 'attach', 'change'],
    ['evidence', 'list', '../escape'],
    ['evidence', 'attach', 'change', 'extra', '--file', f.file],
  ])
    assert.equal(cli(f.dir, ...args).status, 3, args.join(' '));
});

test('attachment aggregate limits and empty files fail before publishing a record', async () => {
  const f = await setup();
  await put(join(f.dir, '.clinx/inbox/empty.txt'), '');
  await json(f.file, {
    ...observation(),
    artifacts: [{ path: '.clinx/inbox/empty.txt', description: 'empty' }],
  });
  assert.equal(add(f).status, 3);
  const artifacts = [];
  for (let i = 0; i < 3; i++) {
    const path = `.clinx/inbox/part${i}.bin`;
    await put(join(f.dir, path), Buffer.alloc(6 * 1024 * 1024));
    artifacts.push({ path, description: 'bounded individually, too large together' });
  }
  await json(f.file, { ...observation(), artifacts });
  assert.equal(add(f).status, 3);
  assert.deepEqual(list(f).out.records, []);
  assert.ok(!(await readdir(join(f.dir, '.clinx'))).includes('write.lock'));
});

test('attachment store cannot write through a symlink or steal a writer lock', async () => {
  const f = await setup();
  const other = await fixture();
  await symlink(other, join(f.dir, '.clinx/evidence'));
  assert.equal(add(f).status, 3);
  assert.ok(!(await readdir(other)).includes('change'));
  await unlink(join(f.dir, '.clinx/evidence'));
  await put(join(f.dir, '.clinx/write.lock'), 'owned by another writer');
  assert.equal(add(f).status, 3);
  assert.equal(await readFile(join(f.dir, '.clinx/write.lock'), 'utf8'), 'owned by another writer');
});

test('attachment APIs refresh a retained Workspace instead of trusting its old check definitions', async () => {
  const f = await setup();
  const { openWorkspace } = await import('../dist/workspace.js');
  const { addEvidence, listEvidence } = await import('../dist/evidence.js');
  const cached = await openWorkspace(f.dir);
  const first = await addEvidence(cached, 'change', observation());
  const config = JSON.parse(await readFile(join(f.dir, 'clinx.config.json'), 'utf8'));
  config.checks[0].timeoutMs = 1000;
  await json(join(f.dir, 'clinx.config.json'), config);
  assert.equal((await listEvidence(cached, 'change')).records[0].localBinding, 'changed');
  const second = await addEvidence(cached, 'change', observation());
  assert.notEqual(
    second.record.capturedInputs.definitionDigest,
    first.record.capturedInputs.definitionDigest,
  );
});

test('attachment selection inspects only the explicit UUID and rejects unsafe selectors', async () => {
  const f = await setup();
  const a = add(f).out;
  const b = add(f).out;
  await put(join(f.dir, a.path), 'broken');
  const selected = cli(f.dir, 'evidence', 'list', 'change', '--record', b.record.id);
  assert.equal(selected.status, 0, selected.err);
  assert.equal(selected.out.records.length, 1);
  assert.equal(selected.out.records[0].integrity, 'intact');
  assert.equal(cli(f.dir, 'evidence', 'list', 'change', '--record', '../escape').status, 3);
});

test('stored artifact origins must remain unique and inside captured source identity', async () => {
  const f = await setup();
  const saved = add(f).out;
  const path = join(f.dir, saved.path);
  const original = JSON.parse(await readFile(path, 'utf8'));
  for (const mutate of [
    (r) => {
      r.artifacts[0].original.source = 'missing';
    },
    (r) => {
      r.artifacts.push({ ...r.artifacts[0], path: 'artifacts/1.txt' });
    },
  ]) {
    const record = structuredClone(original);
    mutate(record);
    await json(path, record);
    const result = list(f).out.records[0];
    assert.equal(result.integrity, 'invalid');
    assert.equal(result.record, null);
    assert.match(result.reasons.join(' '), /Artifact origin|Duplicate stored artifact references/);
  }
});
