import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, symlink, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { root, cli, put } from './helpers.mjs';
import { syncSkills, sharedReferences } from '../scripts/sync-skills.mjs';
import { prepareKnowledge } from '../evals/knowledge/prepare.mjs';
import { checkpoints } from '../evals/knowledge/scenario.mjs';
import { spawnSync } from 'node:child_process';

test('shared knowledge rules are identical and divergence is rejected without overwriting', async () => {
  await syncSkills(root);
  const dir = await mkdtemp(join(tmpdir(), 'clinx-shared-rules-'));
  await cp(join(root, 'skills'), join(dir, 'skills'), { recursive: true });
  const target = join(dir, 'skills/clinx-delivery/references/knowledge.md');
  await put(target, 'Changed guidance');
  await assert.rejects(syncSkills(dir), /Shared Skill reference differs/);
  assert.equal(await readFile(target, 'utf8'), 'Changed guidance');
  await syncSkills(dir, true);
  await syncSkills(dir);
});

test('knowledge checkpoints preserve prior guidance and snapshots while changing only declared product inputs', async () => {
  let current = await prepareKnowledge();
  const corrected =
    '# Operations\n\nJSON exists; retention conflicts with policy. See ../archive.mjs and ../policy.md.\n';
  await put(join(current.workspace, 'docs/operations.md'), corrected);
  await put(join(current.workspace, 'docs/notes.md'), 'A retained observation.\n');
  const expectedChanges = [
    [],
    ['archive.mjs'],
    ['consumers.json', 'preview.mjs', 'preview.test.mjs'],
    ['preview.mjs'],
    ['runtime.json'],
    ['history/observations.md'],
    ['preview.mjs'],
  ];
  for (let i = 1; i < checkpoints.length; i++) {
    const old = current;
    current = await prepareKnowledge(old.evaluator);
    assert.notEqual(current.workspace, old.workspace);
    const record = JSON.parse(await readFile(current.evaluator));
    assert.equal(record.checkpoint, checkpoints[i]);
    assert.equal(record.status, 'prepared-not-evaluated');
    assert.deepEqual(record.transition, expectedChanges[i - 1]);
    assert.equal(record.previous.evaluator, await realpath(old.evaluator));
    const snapshot = JSON.parse(
      await readFile(join(current.workspace, '../previous-snapshot.json')),
    );
    assert.equal(Buffer.from(snapshot['docs/operations.md'], 'base64').toString(), corrected);
    for (const [path, encoded] of Object.entries(snapshot)) {
      const bytes = Buffer.from(encoded, 'base64');
      assert.equal(createHash('sha256').update(bytes).digest('hex'), record.previous.hashes[path]);
      assert.deepEqual(await readFile(join(old.workspace, path)), bytes);
    }
    assert.equal(await readFile(join(current.workspace, 'docs/operations.md'), 'utf8'), corrected);
    assert.equal(
      await readFile(join(current.workspace, 'docs/notes.md'), 'utf8'),
      'A retained observation.\n',
    );
    assert.ok(!current.request.includes('14'));
    assert.ok(!current.request.includes('preview.mjs'));
    assert.ok(!current.request.includes('docs/operations.md'));
    assert.ok(!current.request.includes(checkpoints[i] + ' checkpoint'));
    assert.ok(!(await readdir(current.workspace)).includes('previous-snapshot.json'));
  }
  await assert.rejects(prepareKnowledge(current.evaluator), /Final checkpoint/);
});

test('unchanged producer does not establish new-consumer compliance; existing tests miss the defect', async () => {
  let current = await prepareKnowledge();
  current = await prepareKnowledge(current.evaluator);
  current = await prepareKnowledge(current.evaluator);
  const producer = await readFile(join(current.workspace, 'archive.mjs'));
  current = await prepareKnowledge(current.evaluator);
  assert.deepEqual(await readFile(join(current.workspace, 'archive.mjs')), producer);
  const archive = await import(join(current.workspace, 'archive.mjs'));
  const preview = await import(join(current.workspace, 'preview.mjs'));
  assert.equal(archive.retentionDays(), 7);
  assert.equal(preview.retentionDays(), 14);
  assert.equal(preview.previewRows([{ id: 1 }]), '[{"id":1}]');
  assert.throws(() => archive.exportRows([], 'xml'), /Unsupported/);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const tests = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], {
    cwd: current.workspace,
    env,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(tests.status, 0, tests.stderr);
  assert.match(tests.stdout, /# tests 3\b/);
  current = await prepareKnowledge(current.evaluator);
  await assert.rejects(readFile(join(current.workspace, 'preview.mjs')), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await readFile(join(current.workspace, 'consumers.json'))), [
    'archive.mjs',
    'runtime.mjs',
    'preview.mjs',
  ]);
  const unavailable = spawnSync(process.execPath, ['--test'], {
    cwd: current.workspace,
    env,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.notEqual(unavailable.status, 0);
  for (let i = checkpoints.indexOf('unavailable-source') + 1; i < checkpoints.length; i++)
    current = await prepareKnowledge(current.evaluator);
  const restored = await import(join(current.workspace, 'preview.mjs'));
  assert.equal(restored.retentionDays(), 14);
});

test('knowledge preparation refuses source laundering, extra executable files and read-only changes', async () => {
  for (const path of [
    'archive.mjs',
    'policy.md',
    'consumers.json',
    'runtime.json',
    'extra.mjs',
    'docs/helper.mjs',
  ]) {
    const current = await prepareKnowledge();
    await put(join(current.workspace, path), 'unauthorized change');
    // Forging a candidate baseline must not bless protected product edits.
    const record = JSON.parse(await readFile(current.evaluator));
    record.baseline[path] = createHash('sha256').update('unauthorized change').digest('hex');
    await put(current.evaluator, JSON.stringify(record));
    await assert.rejects(
      prepareKnowledge(current.evaluator),
      /Protected input changed|Out-of-scope/,
    );
    assert.equal(await readFile(join(current.workspace, path), 'utf8'), 'unauthorized change');
  }
  const initial = await prepareKnowledge();
  const retrieval = await prepareKnowledge(initial.evaluator);
  await put(join(retrieval.workspace, 'docs/operations.md'), 'a read-only violation');
  await assert.rejects(prepareKnowledge(retrieval.evaluator), /Read-only retrieval/);
});

test('follow-up delivery has a failing acceptance control and a compatible repair that passes', async () => {
  let current = await prepareKnowledge();
  for (let i = 1; i < checkpoints.length; i++) current = await prepareKnowledge(current.evaluator);
  const policy = await readFile(join(current.workspace, 'policy.md'));
  const registration = await readFile(join(current.workspace, 'consumers.json'));
  const configuration = await readFile(join(current.workspace, 'runtime.json'));
  // Evaluator-written control, never supplied to a candidate during preparation.
  await put(
    join(current.workspace, 'retention.test.mjs'),
    `
import test from 'node:test';
import assert from 'node:assert/strict';
import * as archive from './archive.mjs';
import * as preview from './preview.mjs';
import * as batch from './runtime.mjs';
test('all registered export paths comply without payload regressions', () => {
  for (const days of [archive.retentionDays(), preview.retentionDays(), batch.retentionDays()])
    assert.ok(Number.isFinite(days) && days >= 0 && days <= 7);
  assert.equal(archive.exportRows([{id: 1}], 'csv'), '1');
  assert.equal(archive.exportRows([{id: 1}], 'json'), '[{"id":1}]');
  assert.equal(preview.previewRows([{id: 1}]), '[{"id":1}]');
  assert.throws(() => archive.exportRows([], 'xml'), /Unsupported format/);
});
`,
  );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = () =>
    spawnSync(process.execPath, ['--test', '--test-reporter=tap'], {
      cwd: current.workspace,
      env,
      encoding: 'utf8',
      timeout: 15000,
    });
  const before = run();
  assert.equal(before.status, 1, before.stderr);
  assert.match(before.stdout, /# tests 4\b/);
  assert.match(before.stdout, /# fail 1\b/);
  const source = await readFile(join(current.workspace, 'preview.mjs'), 'utf8');
  await put(
    join(current.workspace, 'preview.mjs'),
    source.replace('archiveRetention() * 2', 'archiveRetention()'),
  );
  const partial = run();
  assert.equal(partial.status, 1, partial.stderr);
  assert.match(partial.stdout, /# fail 1\b/);
  const runtime = await readFile(join(current.workspace, 'runtime.mjs'), 'utf8');
  await put(
    join(current.workspace, 'runtime.mjs'),
    runtime.replace(
      'archiveRetention() * config.retentionMultiplier',
      'Math.min(archiveRetention() * config.retentionMultiplier, 7)',
    ),
  );
  // The policy is a maximum, not a required exact value or reference implementation.
  for (const replacement of ['archiveRetention()', 'Math.min(archiveRetention(), 6)']) {
    await put(
      join(current.workspace, 'preview.mjs'),
      source.replace('archiveRetention() * 2', replacement),
    );
    const after = run();
    assert.equal(after.status, 0, after.stderr);
    assert.match(after.stdout, /# pass 4\b/);
  }
  assert.deepEqual(await readFile(join(current.workspace, 'policy.md')), policy);
  assert.deepEqual(await readFile(join(current.workspace, 'consumers.json')), registration);
  assert.deepEqual(await readFile(join(current.workspace, 'runtime.json')), configuration);
});

test('configuration drift changes effective retention while all product code remains identical', async () => {
  let current = await prepareKnowledge();
  for (let i = 1; i <= checkpoints.indexOf('unavailable-source'); i++)
    current = await prepareKnowledge(current.evaluator);
  const earlier = current;
  const before = await import(join(earlier.workspace, 'runtime.mjs'));
  assert.equal(before.retentionDays(), 7);
  current = await prepareKnowledge(earlier.evaluator);
  const record = JSON.parse(await readFile(current.evaluator));
  assert.deepEqual(record.transition, ['runtime.json']);
  for (const path of [
    'archive.mjs',
    'runtime.mjs',
    'archive.test.mjs',
    'preview.test.mjs',
    'consumers.json',
    'policy.md',
  ])
    assert.deepEqual(
      await readFile(join(current.workspace, path)),
      await readFile(join(earlier.workspace, path)),
    );
  const after = await import(join(current.workspace, 'runtime.mjs'));
  assert.equal(after.retentionDays(), 21);
  assert.equal((await import(join(current.workspace, 'archive.mjs'))).retentionDays(), 7);
  await assert.rejects(readFile(join(current.workspace, 'preview.mjs')), { code: 'ENOENT' });
});

test('retired conclusions stay under review and historical evidence never silently repairs guidance', async () => {
  let current = await prepareKnowledge();
  // Intentionally wrong outputs must survive preparation for the reviewer to detect.
  const obsolete = 'Current archive retention is 14 days.\n';
  await put(join(current.workspace, 'docs/operations.md'), obsolete);
  let watch;
  for (let i = 1; i < checkpoints.length; i++) {
    current = await prepareKnowledge(current.evaluator);
    const record = JSON.parse(await readFile(current.evaluator));
    assert.equal(record.status, 'prepared-not-evaluated');
    if (i >= checkpoints.indexOf('behavior-change')) {
      assert.equal(record.retiredClaims[0].id, 'archive-retention-14');
      if (!watch) watch = record.retiredClaims;
      assert.deepEqual(record.retiredClaims, watch);
    } else assert.deepEqual(record.retiredClaims, []);
    assert.equal(await readFile(join(current.workspace, 'docs/operations.md'), 'utf8'), obsolete);
    if (record.checkpoint === 'historical-evidence') {
      assert.deepEqual(record.transition, ['history/observations.md']);
      assert.ok(record.protected.includes('history/observations.md'));
      assert.equal((await import(join(current.workspace, 'archive.mjs'))).retentionDays(), 7);
      const fork = await prepareKnowledge(current.evaluator);
      await put(join(current.workspace, 'history/observations.md'), 'rewritten history');
      await assert.rejects(prepareKnowledge(current.evaluator), /Protected input changed/);
      assert.ok(
        (await readFile(join(fork.workspace, 'history/observations.md'), 'utf8')).includes(
          '14 days',
        ),
      );
      // Restore only the evaluator test's controlled mutation before continuing.
      await put(
        join(current.workspace, 'history/observations.md'),
        await readFile(join(fork.workspace, 'history/observations.md')),
      );
    }
  }
});

test('knowledge snapshots enforce total byte limits and reject absent protected source or invalid records', async () => {
  const large = await prepareKnowledge();
  await put(join(large.workspace, 'docs/one.md'), 'a'.repeat(600000));
  await put(join(large.workspace, 'docs/two.md'), 'b'.repeat(600000));
  await assert.rejects(prepareKnowledge(large.evaluator), /snapshot exceeds limits/);
  const missing = await prepareKnowledge();
  await rm(join(missing.workspace, 'policy.md'));
  await assert.rejects(prepareKnowledge(missing.evaluator), /Protected input changed/);
  for (const record of [
    'null',
    '[]',
    '{}',
    '{"exercise":"clinx-knowledge","version":1,"checkpoint":"invented"}',
  ]) {
    const invalid = await prepareKnowledge();
    await put(invalid.evaluator, record);
    await assert.rejects(
      prepareKnowledge(invalid.evaluator),
      /Invalid knowledge evaluation record/,
    );
  }
});

test('knowledge preparation preserves deleted guidance rather than silently repairing an agent result', async () => {
  const current = await prepareKnowledge();
  await rm(join(current.workspace, 'docs/operations.md'));
  const next = await prepareKnowledge(current.evaluator);
  await assert.rejects(readFile(join(next.workspace, 'docs/operations.md')), { code: 'ENOENT' });
  const record = JSON.parse(await readFile(next.evaluator));
  assert.deepEqual(record.transition, []);
});

test('knowledge preparation rejects links, oversized files, excessive entries and nesting', async () => {
  for (const kind of [
    'file-link',
    'directory-link',
    'workspace-link',
    'large-file',
    'many-entries',
    'deep-tree',
  ]) {
    const current = await prepareKnowledge();
    const outside = await mkdtemp(join(tmpdir(), 'clinx-knowledge-outside-'));
    await put(join(outside, 'private.md'), 'must not copy');
    if (kind === 'file-link')
      await symlink(join(outside, 'private.md'), join(current.workspace, 'docs/link.md'));
    if (kind === 'directory-link') await symlink(outside, join(current.workspace, 'docs/linked'));
    if (kind === 'workspace-link') {
      // Remove only this test's original, temporary fixture to substitute the negative control.
      await rm(current.workspace, { recursive: true });
      await symlink(outside, current.workspace);
    }
    if (kind === 'large-file')
      await put(join(current.workspace, 'docs/large.md'), 'x'.repeat(1024 * 1024 + 1));
    if (kind === 'many-entries')
      for (let i = 0; i < 130; i++) await put(join(current.workspace, `docs/n${i}.md`), '');
    if (kind === 'deep-tree')
      await mkdir(join(current.workspace, 'docs/a/b/c/d/e/f/g/h/i'), { recursive: true });
    await assert.rejects(
      prepareKnowledge(current.evaluator),
      /regular evaluation file|evaluation directory|limit/,
    );
    assert.equal(await readFile(join(outside, 'private.md'), 'utf8'), 'must not copy');
  }
});

test('knowledge entry rejects unsupported options and accepts continuation through an aliased checkout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'clinx-knowledge-entry-'));
  const alias = join(directory, 'source alias');
  await symlink(root, alias);
  const script = join(alias, 'evals/knowledge/prepare.mjs');
  for (const args of [
    ['--after'],
    ['--after', ' '],
    ['--unknown', 'x'],
    ['--after', 'not-a-record'],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.notEqual(result.status, 0);
  }
  const current = await prepareKnowledge();
  const next = spawnSync(process.execPath, [script, '--after', current.evaluator], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(next.status, 0, next.stderr);
  assert.equal(
    JSON.parse(await readFile(JSON.parse(next.stdout).evaluator)).checkpoint,
    'retrieval',
  );
});

test('both installed Skills are self-contained in both placements and knowledge conflicts are atomic', async () => {
  for (const agent of ['codex', 'generic']) {
    const dir = await mkdtemp(join(tmpdir(), 'clinx-knowledge-install-'));
    const prefix = agent === 'codex' ? '.agents/skills' : 'clinx/skills';
    assert.equal(cli(dir, 'init', '--agent', agent, '--apply').status, 0);
    for (const name of ['clinx-delivery', 'clinx-knowledge']) {
      const base = join(dir, prefix, name);
      for (const name of ['SKILL.md', ...sharedReferences.map((f) => 'references/' + f)]) {
        const content = await readFile(join(base, name), 'utf8');
        for (const [, link] of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
          if (/^[a-z]+:/i.test(link)) continue;
          const target = resolve(join(base, name, '..'), link.split('#')[0]);
          assert.ok(
            !relative(base, target).startsWith('..'),
            'Skill reference escapes installed folder',
          );
          await readFile(target);
        }
      }
    }
    const knowledge = join(dir, prefix, 'clinx-knowledge/SKILL.md');
    await put(knowledge, 'User knowledge instructions');
    const before = await readFile(join(dir, '.clinx/install/state.json'));
    for (const action of ['update', 'remove'])
      assert.equal(cli(dir, 'skill', action, '--apply').status, 3);
    assert.deepEqual(await readFile(join(dir, '.clinx/install/state.json')), before);
    assert.equal(await readFile(knowledge, 'utf8'), 'User knowledge instructions');
    await readFile(join(dir, prefix, 'clinx-delivery/SKILL.md'));
  }
});

test('knowledge exercise separates raw inputs from evaluator criteria and records exact baselines', async () => {
  const prepared = await prepareKnowledge();
  const evaluator = JSON.parse(await readFile(prepared.evaluator, 'utf8'));
  assert.equal(evaluator.status, 'prepared-not-evaluated');
  assert.ok(!resolve(prepared.evaluator).startsWith(prepared.workspace + '/'));
  assert.ok(!(await readdir(prepared.workspace)).includes('evaluator.json'));
  for (const [path, hash] of Object.entries(evaluator.baseline))
    assert.equal(
      createHash('sha256')
        .update(await readFile(join(prepared.workspace, path)))
        .digest('hex'),
      hash,
    );
  const project = await import(join(prepared.workspace, 'archive.mjs'));
  assert.equal(project.exportRows([{ id: 1 }], 'json'), '[{"id":1}]');
  assert.equal(project.retentionDays(), 14);
  assert.match(await readFile(join(prepared.workspace, 'policy.md'), 'utf8'), /7 days/);
  assert.ok(!prepared.request.includes('14'));
  assert.ok(!prepared.retrievalRequest.includes('docs/operations.md'));
});
