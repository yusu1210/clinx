import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access, cp } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { prepareContext, cases } from '../evals/context/prepare.mjs';
import { fixture, cli, contract, json, put } from './helpers.mjs';

test('reused navigation and unrelated catalog entries do not widen a selected task or stale its evidence', async () => {
  const dir = await fixture((config) => {
    config.sources[0].inputs = ['src'];
    config.sources.push({ id: 'other', path: 'not-checked-out', inputs: ['src'] });
    config.context = [
      { path: 'projects.md', description: 'Project navigation', when: ['discover'] },
    ];
  });
  await put(join(dir, 'projects.md'), 'Existing project directory');
  await put(join(dir, 'src/rule.md'), 'Current rule');
  await json(join(dir, 'clinx/tasks/change/contract.json'), {
    ...contract(),
    sources: ['main'],
    context: [{ source: 'main', path: 'src/rule.md', why: 'Required behavior' }],
  });
  const run = cli(dir, 'verify', 'change', '--run');
  assert.equal(run.status, 0, run.err);
  await put(join(dir, 'projects.md'), 'Unrelated project added to navigation');
  const config = JSON.parse(await readFile(join(dir, 'clinx.config.json'), 'utf8'));
  config.sources[1].path = 'another-unavailable-location';
  await json(join(dir, 'clinx.config.json'), config);
  assert.equal(
    cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt).out.verdict.applicability,
    'current',
  );
  // Locators do not define evidence identity. Selection/authority remains the agent's job.
  await cp(join(dir, 'src'), join(dir, 'relocated/src'), { recursive: true });
  config.sources[0].path = 'relocated';
  await json(join(dir, 'clinx.config.json'), config);
  assert.equal(
    cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt).out.verdict.applicability,
    'current',
  );
  await put(join(dir, 'relocated/src/rule.md'), 'Changed required behavior');
  assert.equal(
    cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt).out.verdict.applicability,
    'stale',
  );
  await assert.rejects(access(join(dir, '.agents')), { code: 'ENOENT' });
});

test('context cases isolate evaluator data and expose identical path-free requests', async () => {
  let request;
  for (const scenario of cases) {
    const prepared = await prepareContext(scenario);
    request ??= prepared.request;
    assert.equal(prepared.request, request);
    assert.ok(relative(prepared.workspace, prepared.evaluator).startsWith('..'));
    assert.ok(!(await readdir(prepared.workspace)).includes('evaluator.json'));
    const evaluator = JSON.parse(await readFile(prepared.evaluator, 'utf8'));
    assert.equal(evaluator.status, 'prepared-not-evaluated');
    assert.equal(evaluator.scenario, scenario);
    for (const [path, hash] of Object.entries(evaluator.baseline)) {
      assert.equal(
        createHash('sha256')
          .update(await readFile(join(prepared.workspace, path)))
          .digest('hex'),
        hash,
      );
      assert.ok(!prepared.request.includes(path));
    }
    for (const path of evaluator.expected)
      await access(join(prepared.workspace, path, 'project.json'));
    if (scenario === 'relocated-project')
      await assert.rejects(access(join(prepared.workspace, 'checkouts/service')), {
        code: 'ENOENT',
      });
    if (scenario === 'wrong-project')
      assert.equal(
        JSON.parse(await readFile(join(prepared.workspace, 'checkouts/service/project.json'))).id,
        'stock-alerts',
      );
    if (scenario === 'missing-entry')
      assert.deepEqual(Object.keys(evaluator.baseline), ['README.md']);
    if (scenario === 'unavailable-source')
      await assert.rejects(access(join(prepared.workspace, 'checkouts')), { code: 'ENOENT' });
    if (scenario === 'ambiguous-copies') {
      const load = (p) => import(pathToFileURL(join(prepared.workspace, p, 'visibility.mjs')).href);
      const a = await load('checkouts/service'),
        b = await load('checkouts/experiment');
      assert.equal(a.visible({ state: 'draft' }), false);
      assert.equal(b.visible({ state: 'draft' }), true);
    }
    if (scenario === 'read-only-dependency') {
      const module = await import(
        pathToFileURL(join(prepared.workspace, 'checkouts/service/visibility.mjs')).href
      );
      assert.equal(module.visible({ state: 'published' }), true);
      assert.equal(module.visible({ state: 'draft' }), false);
    }
  }
});

test('unknown context scenarios are rejected before preparation', async () => {
  await assert.rejects(prepareContext('../outside'), /Unknown case/);
});
