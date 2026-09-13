import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, rename, symlink, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { copyExample, cli, put, json } from './helpers.mjs';

const id = 'visible-notices';
async function setup() {
  const base = await copyExample('multi-source');
  const root = join(base, 'workspace');
  const configPath = join(root, 'clinx.config.json');
  const taskPath = join(root, `clinx/tasks/${id}/contract.json`);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.checks[0].command[0] = process.execPath;
  await json(configPath, config);
  const task = JSON.parse(await readFile(taskPath, 'utf8'));
  return { base, root, configPath, taskPath, config, task };
}
const reconcile = (f, run) => cli(f.root, 'reconcile', id, '--receipt', run.out.receipt);
async function history(f) {
  const note = join(f.root, 'note.json');
  await json(note, {
    focus: 'verify',
    state: 'handoff',
    summary: 'Consumer observed',
    next: 'Review current bindings',
  });
  assert.equal(cli(f.root, 'task', 'checkpoint', id, '--file', note).status, 0);
  const run = cli(f.root, 'verify', id, '--run');
  assert.equal(run.status, 0, run.err);
  const observation = join(f.root, 'observation.json');
  await json(observation, {
    obligations: ['visible'],
    observedAt: new Date().toISOString(),
    observer: 'fixture',
    method: 'tool',
    target: { identity: 'local fixture', revision: 'initial' },
    outcome: 'pass',
    summary: 'Local run',
    artifacts: [{ path: run.out.receipt, description: 'Local receipt, not remote proof' }],
  });
  assert.equal(cli(f.root, 'evidence', 'attach', id, '--file', observation).status, 0);
  return run;
}

test('workspace coordinates sibling sources and owned context without a Git repository', async () => {
  const f = await setup();
  const preview = cli(f.root, 'verify', id);
  assert.deepEqual(
    preview.out.sources.map((s) => s.id),
    ['client', 'policy', 'service'],
  );
  const run = await history(f);
  const ctx = cli(f.root, 'context', id);
  assert.equal(ctx.out.index[0].source, 'service');
  assert.equal(ctx.out.index[0].available, true);
  assert.equal(ctx.out.continuity, 'inputs-match');
  assert.equal(reconcile(f, run).status, 0);
});

test('context navigation selects task sources and focus while retaining workspace references', async () => {
  const f = await setup();
  await put(join(f.root, 'navigation.md'), 'Workspace navigation');
  f.config.context.push(
    { path: 'navigation.md', description: 'Workspace map', when: ['discover'] },
    { source: 'analytics', path: 'events.json', description: 'Analytics', when: ['always'] },
  );
  await json(f.configPath, f.config);
  const scoped = cli(f.root, 'context', id, '--focus', 'discover');
  assert.equal(scoped.status, 0, scoped.err);
  assert.equal(
    scoped.out.index.some((item) => item.source === 'analytics'),
    false,
  );
  assert.equal(scoped.out.index.find((item) => item.path === 'navigation.md').available, true);
  assert.equal(
    cli(f.root, 'context', id, '--focus', 'build').out.index.some(
      (item) => item.path === 'navigation.md',
    ),
    false,
  );

  // The omitted scope deliberately includes all configured sources.
  delete f.task.sources;
  await json(f.taskPath, f.task);
  assert.equal(
    cli(f.root, 'context', id).out.index.find((item) => item.source === 'analytics').available,
    true,
  );
  await rename(join(f.base, 'analytics'), join(f.base, 'unavailable-analytics'));
  const missing = cli(f.root, 'context', id);
  assert.equal(missing.out.index.find((item) => item.source === 'analytics').available, false);
  assert.equal(missing.out.continuity, 'reconcile-required');
});

test('workspace navigation binds acceptance only when explicitly referenced as a task input', async () => {
  const f = await setup();
  const path = 'knowledge/system-map.md';
  const run = await history(f);
  const before = cli(f.root, 'context', id, '--focus', 'discover');
  await put(join(f.root, path), 'Updated cross-source navigation');
  const after = cli(f.root, 'context', id, '--focus', 'discover');
  assert.notEqual(
    before.out.index.find((item) => item.path === path).sha256,
    after.out.index.find((item) => item.path === path).sha256,
  );
  assert.equal(after.out.continuity, 'inputs-match');
  assert.equal(reconcile(f, run).status, 0);

  const proposal = join(f.root, 'proposal.json');
  await json(proposal, {
    ...f.task,
    context: [...f.task.context, { path, why: 'Reviewed topology now constrains this task' }],
  });
  assert.equal(
    cli(f.root, 'task', 'revise', id, '--file', proposal, '--reason', 'Bind reviewed topology')
      .status,
    0,
  );
  const bound = await history(f);
  await put(join(f.root, path), 'Material topology change');
  assert.equal(reconcile(f, bound).out.verdict.applicability, 'stale');
  assert.equal(cli(f.root, 'context', id).out.continuity, 'reconcile-required');
});

test('co-located task design is an input while unbound validation notes are outputs', async () => {
  const f = await setup();
  const run = await history(f);
  await put(
    join(f.root, `clinx/tasks/${id}/validation.md`),
    'Local consumer run completed; see the saved receipt. No remote claim.',
  );
  assert.equal(reconcile(f, run).status, 0);
  assert.equal(cli(f.root, 'context', id).out.continuity, 'inputs-match');
  await put(join(f.root, `clinx/tasks/${id}/design.md`), 'A revised delivery decision');
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'changed');
});

test('workspace Skill onboarding neither requires source guides nor changes source files', async () => {
  const f = await setup();
  const snapshot = async () => {
    const contents = {};
    for (const source of f.config.sources) {
      const directory = join(f.base, source.id);
      const entries = await readdir(directory, { recursive: true, withFileTypes: true });
      for (const entry of entries.filter((entry) => entry.isFile())) {
        const path = join(entry.parentPath, entry.name);
        contents[path] = (await readFile(path)).toString('base64');
      }
    }
    return contents;
  };
  const before = await snapshot();
  assert.equal(
    Object.keys(before).some((path) => path.endsWith('/AGENTS.md')),
    false,
  );
  const preview = cli(f.root, 'init', '--agent', 'codex');
  assert.equal(preview.status, 0, preview.err);
  assert.deepEqual(await snapshot(), before);
  const applied = cli(f.root, 'init', '--agent', 'codex', '--apply');
  assert.equal(applied.status, 0, applied.err);
  assert.ok(await readFile(join(f.root, '.agents/skills/clinx-delivery/SKILL.md'), 'utf8'));
  assert.deepEqual(await snapshot(), before);
  assert.equal(cli(f.root, 'verify', id, '--run').status, 0);
});

test('unrelated source bytes, availability and navigation do not stale scoped records', async () => {
  const f = await setup();
  const run = await history(f);
  await json(join(f.base, 'analytics/events.json'), { events: ['unrelated'] });
  await rename(join(f.base, 'analytics'), join(f.base, 'unavailable-analytics'));
  f.config.context[0].description = 'New navigation description';
  f.config.checks[0].description = 'Updated check navigation';
  f.config.name = 'renamed-workspace';
  f.config.sources[3].inputs = ['different.json'];
  f.config.checks.push({ ...f.config.checks[0], id: 'unrelated', source: 'analytics' });
  await json(f.configPath, f.config);
  assert.equal(reconcile(f, run).status, 0);
  assert.equal(cli(f.root, 'context', id).out.continuity, 'inputs-match');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'matches');
  assert.equal(cli(f.root, 'validate', id).status, 0);
  assert.equal(cli(f.root, 'validate').status, 3);
  assert.equal(cli(f.root, 'verify', id, '--run').status, 0);
});

test('an unchanged dependency source is bound even when the check executes in the consumer', async () => {
  const f = await setup();
  const run = await history(f);
  await put(join(f.base, 'policy/src/visibility.mjs'), 'export const isVisible = () => true;\n');
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
  assert.equal(cli(f.root, 'context', id).out.continuity, 'reconcile-required');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'changed');
  assert.equal(cli(f.root, 'verify', id, '--run').status, 1);
});

test('source-owned contract bytes bind a task even outside source input selectors', async () => {
  const f = await setup();
  const run = await history(f);
  await put(join(f.base, 'service/docs/contract.md'), 'Revised consumer contract');
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
  assert.equal(cli(f.root, 'context', id).out.continuity, 'reconcile-required');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'changed');
});

test('unavailable source-owned context preserves history without certifying current inputs', async () => {
  const f = await setup();
  const run = await history(f);
  await rename(join(f.base, 'service'), join(f.base, 'service-moved'));
  const context = cli(f.root, 'context', id);
  assert.equal(context.status, 0, context.err);
  assert.equal(context.out.continuity, 'reconcile-required');
  assert.equal(context.out.taskDigest, null);
  assert.equal(context.out.checkpoint.sequence, 1);
  assert.equal(reconcile(f, run).out.verdict.applicability, 'unknown');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'unknown');
  assert.equal(cli(f.root, 'verify', id, '--run').status, 3);
});

test('selected check semantics change applicability but do not rewrite the historical observation', async () => {
  const f = await setup();
  const run = await history(f);
  f.config.checks[0].result.minTests = 2;
  await json(f.configPath, f.config);
  const result = reconcile(f, run).out.verdict;
  assert.equal(result.applicability, 'stale');
  assert.equal(result.checks[0].observation, 'pass');
  assert.equal(result.decision, 'unresolved');
  assert.equal(cli(f.root, 'verify', id, '--run').status, 2);
});

test('source selector policy changes stale evidence even when selected bytes are identical', async () => {
  const f = await setup();
  const run = cli(f.root, 'verify', id, '--run');
  f.config.sources[2].inputs.push('src/visibility.mjs');
  await json(f.configPath, f.config);
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
});

test('task source scope rejects unknown, empty, duplicate and out-of-scope check or context sources', async () => {
  const f = await setup();
  for (const sources of [
    [],
    ['client', 'service', 'missing'],
    ['client', 'client'],
    ['client'],
    ['service'],
  ]) {
    await json(f.taskPath, { ...f.task, sources });
    assert.equal(cli(f.root, 'validate', id).status, 3, JSON.stringify(sources));
  }
  f.config.context[0].source = 'missing';
  await json(f.configPath, f.config);
  assert.equal(cli(f.root, 'validate').status, 3);
});

test('source-aware references cannot escape a source or traverse symlinks', async () => {
  const f = await setup();
  await symlink('contract.md', join(f.base, 'service/docs/link.md'));
  for (const path of [`../workspace/clinx/tasks/${id}/prd.md`, '/absolute', 'docs/link.md']) {
    const task = structuredClone(f.task);
    task.context[1].path = path;
    await json(f.taskPath, task);
    assert.equal(cli(f.root, 'validate', id).status, 3, path);
  }
  await json(f.taskPath, { ...f.task, context: [...f.task.context, f.task.context[1]] });
  assert.equal(cli(f.root, 'validate', id).status, 3);
});

test('omitting task sources deliberately binds all workspace sources', async () => {
  const f = await setup();
  delete f.task.sources;
  await json(f.taskPath, f.task);
  const run = cli(f.root, 'verify', id, '--run');
  assert.equal(run.status, 0);
  await json(join(f.base, 'analytics/events.json'), { events: ['now included'] });
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
});

test('task scope revision archives the agreement and invalidates prior consumer acceptance', async () => {
  const f = await setup();
  const run = await history(f);
  const proposal = join(f.root, 'proposal.json');
  await json(proposal, { ...f.task, sources: [...f.task.sources, 'analytics'] });
  const revised = cli(
    f.root,
    'task',
    'revise',
    id,
    '--file',
    proposal,
    '--reason',
    'Analytics is now a required consumer',
  );
  assert.equal(revised.status, 0, revised.err);
  const saved = JSON.parse(
    await readFile(
      join(f.root, `clinx/tasks/${id}/revisions/${revised.out.revision}.json`),
      'utf8',
    ),
  );
  assert.deepEqual(saved.previous.sources, f.task.sources);
  assert.equal(reconcile(f, run).out.verdict.applicability, 'stale');
  assert.equal(cli(f.root, 'context', id).out.continuity, 'reconcile-required');
  assert.equal(cli(f.root, 'verify', id, '--run').status, 0);
});

test('receipt binds selected checks while continuity and attachments bind every task check', async () => {
  const f = await setup();
  f.config.checks.push({ ...f.config.checks[0], id: 'later' });
  f.task.claims.push('later');
  f.task.obligations.push({
    id: 'later',
    description: 'Another declared claim',
    claims: ['later'],
    checks: ['later'],
  });
  await json(f.configPath, f.config);
  await json(f.taskPath, f.task);
  const run = await history(f);
  f.config.checks[1].timeoutMs = 1000;
  await json(f.configPath, f.config);
  assert.equal(reconcile(f, run).status, 0);
  assert.equal(cli(f.root, 'context', id).out.continuity, 'reconcile-required');
  assert.equal(cli(f.root, 'evidence', 'list', id).out.records[0].localBinding, 'changed');
});

test('saved check definitions and protocol cannot be edited into a supported claim', async () => {
  const f = await setup();
  const run = cli(f.root, 'verify', id, '--run');
  const path = join(f.root, run.out.receipt);
  const original = JSON.parse(await readFile(path, 'utf8'));
  for (const mutate of [
    (r) => {
      r.definition.checks[0].command.push('changed');
    },
    (r) => {
      r.definition.checks = [];
    },
    (r) => {
      r.protocolVersion++;
    },
  ]) {
    const receipt = structuredClone(original);
    mutate(receipt);
    await json(path, receipt);
    assert.equal(reconcile(f, run).status, 2);
  }
});

test('receipt definition is self-contained and selector drift does not corrupt historical interpretation', async () => {
  const f = await setup();
  const run = cli(f.root, 'verify', id, '--run');
  const saved = JSON.parse(await readFile(join(f.root, run.out.receipt), 'utf8'));
  const { digestDefinition } = await import('../dist/workspace.js');
  assert.equal(saved.definitionDigest, digestDefinition(saved.definition));
  assert.deepEqual(
    saved.definition.sources.map((s) => s.id),
    ['client', 'policy', 'service'],
  );
  f.config.sources[2].inputs.push('src/visibility.mjs');
  await json(f.configPath, f.config);
  const result = reconcile(f, run).out.verdict;
  assert.equal(result.applicability, 'stale');
  assert.equal(result.checks[0].observation, 'pass');
  assert.ok(!result.reasons.some((r) => r.includes('Cannot interpret saved')));
  assert.equal(saved.definitionDigest, digestDefinition(saved.definition));
});

test('corrupt saved source definitions cannot interpret historical pass or support current claims', async () => {
  const f = await setup();
  const run = cli(f.root, 'verify', id, '--run');
  const path = join(f.root, run.out.receipt);
  const original = JSON.parse(await readFile(path, 'utf8'));
  const { digestDefinition } = await import('../dist/workspace.js');
  for (const mutate of [
    (r) => {
      r.definition.sources[0].inputs.push('another');
    },
    (r) => {
      r.definition.sources.pop();
      r.definitionDigest = digestDefinition(r.definition);
    },
    (r) => {
      r.definition.sources.push(r.definition.sources[0]);
      r.definitionDigest = digestDefinition(r.definition);
    },
    (r) => {
      r.definition.checks[0].source = 'missing';
      r.definitionDigest = digestDefinition(r.definition);
    },
    (r) => {
      r.definition.checks[0].result.paths = ['impossible.xml'];
      r.definitionDigest = digestDefinition(r.definition);
    },
    (r) => {
      r.definition.checks.push(r.definition.checks[0]);
      r.definitionDigest = digestDefinition(r.definition);
    },
    (r) => {
      r.definition.checks = [];
      r.definitionDigest = digestDefinition(r.definition);
    },
  ]) {
    const receipt = structuredClone(original);
    mutate(receipt);
    await json(path, receipt);
    const result = reconcile(f, run);
    assert.equal(result.status, 2, result.err);
    assert.equal(result.out.verdict.applicability, 'unknown');
    assert.equal(result.out.verdict.checks[0].observation, 'inconclusive');
  }
});

test('retired checks leave historical observations and handoffs readable but forbid new execution', async () => {
  const f = await setup();
  const run = await history(f);
  f.config.checks = [];
  await json(f.configPath, f.config);
  const result = reconcile(f, run);
  assert.equal(result.status, 2, result.err);
  assert.equal(result.out.verdict.applicability, 'unknown');
  assert.equal(result.out.verdict.checks[0].observation, 'pass');
  const ctx = cli(f.root, 'context', id);
  assert.equal(ctx.status, 0, ctx.err);
  assert.equal(ctx.out.checkpoint.sequence, 1);
  assert.equal(ctx.out.taskDigest, null);
  assert.equal(ctx.out.continuity, 'reconcile-required');
  assert.equal(cli(f.root, 'verify', id, '--run').status, 3);
});

test('source-owned evidence copies original bytes with qualified identity and survives original removal', async () => {
  const f = await setup();
  const file = join(f.root, 'observation.json');
  const artifacts = ['client', 'service'].map((source) => ({
    source,
    path: 'reports/journey.txt',
    description: `${source} observation`,
  }));
  for (const a of artifacts) await put(join(f.base, a.source, a.path), a.source);
  await json(file, {
    obligations: ['visible'],
    observedAt: new Date().toISOString(),
    observer: 'fixture',
    method: 'tool',
    target: { identity: 'local fixture', revision: 'initial' },
    outcome: 'inconclusive',
    summary: 'Separate consumers',
    artifacts,
  });
  const captured = cli(f.root, 'evidence', 'attach', id, '--file', file);
  assert.equal(captured.status, 0, captured.err);
  assert.deepEqual(
    captured.out.record.artifacts.map((a) => a.original),
    artifacts.map(({ source, path }) => ({ source, path })),
  );
  for (const a of artifacts) await unlink(join(f.base, a.source, a.path));
  const saved = cli(f.root, 'evidence', 'list', id).out.records[0];
  assert.equal(saved.integrity, 'intact');
  assert.equal(saved.localBinding, 'matches');
  assert.equal(saved.remoteState, 'not-checked');
});

test('source-owned evidence rejects unknown, out-of-scope, duplicate and escaping references before capture', async () => {
  const f = await setup();
  const file = join(f.root, 'observation.json');
  await symlink('contract.md', join(f.base, 'service/docs/link.md'));
  await put(join(f.base, 'service/reports/large.bin'), Buffer.alloc(8 * 1024 * 1024 + 1));
  const good = { source: 'service', path: 'docs/contract.md', description: 'source context' };
  for (const artifacts of [
    [{ ...good, source: 'missing' }],
    [{ ...good, source: 'analytics', path: 'events.json' }],
    [good, good],
    [{ ...good, path: `../workspace/clinx/tasks/${id}/prd.md` }],
    [{ ...good, path: 'docs/link.md' }],
    [{ ...good, path: 'reports/large.bin' }],
  ]) {
    await json(file, {
      obligations: ['visible'],
      observedAt: new Date().toISOString(),
      observer: 'fixture',
      method: 'tool',
      target: { identity: 'local fixture', revision: 'initial' },
      outcome: 'inconclusive',
      summary: 'Invalid reference',
      artifacts,
    });
    assert.equal(cli(f.root, 'evidence', 'attach', id, '--file', file).status, 3);
    assert.deepEqual(cli(f.root, 'evidence', 'list', id).out.records, []);
  }
});
