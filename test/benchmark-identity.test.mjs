import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { root, json, put } from './helpers.mjs';
import { action, materials } from '../evals/benchmark/scripts/identity.mjs';

function script(name, ...args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [join(root, 'evals/benchmark/scripts', name), ...args],
    { env, encoding: 'utf8', timeout: 30000 },
  );
  assert.ifError(result.error);
  return result;
}
const scenario = 'campaign-cross-repo';
const experiment = () => ({
  version: 1,
  id: 'fixture-study',
  model: 'explicit-fixture-model',
  effort: 'high',
  action,
  sourceRevision: 'a'.repeat(40),
  materials: Object.fromEntries(
    ['fixture', 'evaluator', 'deliverySkill', 'runtime'].map((k) => [k, 'b'.repeat(64)]),
  ),
});
function record(e, rep = 1) {
  return {
    version: 2,
    scenario,
    arm: 'baseline',
    provenance: {
      experiment: e,
      scenario,
      arm: 'baseline',
      rep,
      baseInputSha256: 'a'.repeat(64),
      inputSha256: 'c'.repeat(64),
      promptSha256: 'd'.repeat(64),
    },
    runtime: { phase1: 'codex-cli fixture-version' },
    host: {
      phase1: {
        runnerOs: 'Linux',
        runnerArch: 'X64',
        imageOs: 'ubuntu24',
        imageVersion: 'fixture-image',
        node: 'v22.16.0',
      },
    },
    evaluation: 'passed',
    passed: true,
    passedChecks: 1,
    totalChecks: 1,
    checks: [{ name: 'observed', pass: true }],
    metrics: { phase1ElapsedMs: 100, phase1AgentOutcome: 'success' },
  };
}

test('formal aggregation refuses mismatched experiment, repetition, inputs and unknown or mixed runtime', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-identity-'));
  const e = experiment();
  const runs = [1, 2, 3].map((rep) => ({ scenario, arm: 'baseline', rep }));
  await json(join(dir, 'run-plan.json'), { version: 1, experiment: e, runs });
  const save = async (r) =>
    json(join(dir, `result-${scenario}-baseline-${r.provenance.rep}.json`), r);
  await save(record(e));
  await save(record(e, 2));
  const aggregate = () => {
    const result = script('aggregate.mjs', dir);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  let result = aggregate();
  assert.equal(result.purpose, 'formal-comparison');
  assert.equal(result.summary[0].confirmedPassRate, 2 / 3);
  assert.equal(result.summary[0].passRate, null);
  for (const mutate of [
    (r) => (r.provenance.experiment.model = 'different-model'),
    (r) => (r.provenance.experiment.effort = 'medium'),
    (r) => (r.provenance.experiment.materials.deliverySkill = 'e'.repeat(64)),
    (r) => (r.provenance.experiment.materials.fixture = 'e'.repeat(64)),
    (r) => (r.provenance.rep = 2),
    (r) => (r.provenance.scenario = 'campaign-resume-drift'),
    (r) => (r.provenance.arm = 'skill'),
    (r) => delete r.provenance,
    (r) => (r.runtime = {}),
    (r) => (r.host = {}),
  ]) {
    const changed = record(structuredClone(e));
    mutate(changed);
    await json(join(dir, `result-${scenario}-baseline-1.json`), changed);
    result = aggregate();
    assert.equal(result.records[0].state, 'invalid');
    assert.equal(result.summary[0].confirmedPassRate, 1 / 3);
  }
  for (const mutate of [
    (r) => (r.provenance.baseInputSha256 = 'e'.repeat(64)),
    (r) => (r.provenance.inputSha256 = 'e'.repeat(64)),
    (r) => (r.provenance.promptSha256 = 'e'.repeat(64)),
    (r) => (r.runtime.phase1 = 'codex-cli other-version'),
    (r) => (r.host.phase1.imageVersion = 'other-image'),
  ]) {
    const changed = record(e);
    mutate(changed);
    await json(join(dir, `result-${scenario}-baseline-1.json`), changed);
    result = aggregate();
    assert.deepEqual(
      result.records.map((r) => r.state),
      ['invalid', 'invalid', 'missing'],
    );
    assert.equal(result.summary[0].confirmedPassRate, 0);
  }
  const failed = {
    ...record(e),
    evaluation: 'operational-failure',
    operationalFailure: 'worker timed out',
    passed: null,
    passedChecks: null,
    totalChecks: null,
    checks: [],
  };
  await save(failed);
  result = aggregate();
  assert.equal(result.records[0].state, 'recorded');
  assert.equal(result.summary[0].planned, 3);
  assert.equal(result.summary[0].operationalFailures, 1);
  assert.equal(result.summary[0].passRate, null);
  await json(join(dir, 'run-plan.json'), runs);
  assert.equal(aggregate().summary[0].recorded, 0);
});

test('formal preparation checks frozen materials and carries provenance through grading failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-prepare-identity-'));
  const e = { ...experiment(), materials: await materials(root) };
  const plan = join(dir, 'run-plan.json');
  await json(plan, {
    version: 1,
    experiment: e,
    runs: [1, 2].map((rep) => ({ scenario, arm: 'baseline', rep })),
  });
  const identities = [];
  for (const rep of [1, 2]) {
    const run = join(dir, `run-${rep}`);
    const result = script('prepare.mjs', root, scenario, 'baseline', run, plan, String(rep));
    assert.equal(result.status, 0, result.stderr);
    const meta = JSON.parse(await readFile(join(run, 'benchmark-meta.json'), 'utf8'));
    assert.deepEqual(meta.provenance.experiment, e);
    assert.equal(meta.provenance.rep, rep);
    identities.push(meta.provenance.inputSha256);
  }
  assert.equal(identities[0], identities[1]);
  const skillRun = join(dir, 'skill-run');
  await json(plan, { version: 1, experiment: e, runs: [{ scenario, arm: 'skill', rep: 1 }] });
  const skillPrepared = script('prepare.mjs', root, scenario, 'skill', skillRun, plan, '1');
  assert.equal(skillPrepared.status, 0, skillPrepared.stderr);
  const baseMeta = JSON.parse(await readFile(join(dir, 'run-1/benchmark-meta.json'), 'utf8'));
  const skillMeta = JSON.parse(await readFile(join(skillRun, 'benchmark-meta.json'), 'utf8'));
  assert.equal(baseMeta.provenance.baseInputSha256, skillMeta.provenance.baseInputSha256);
  assert.notEqual(baseMeta.provenance.inputSha256, skillMeta.provenance.inputSha256);
  assert.notEqual(baseMeta.provenance.promptSha256, skillMeta.provenance.promptSha256);

  const run = join(dir, 'run-1');
  await put(join(run, 'phase1-codex-version.txt'), 'codex-cli observed-fixture\n');
  await json(join(run, 'phase1-host.json'), record(e).host.phase1);
  await put(join(run, 'project/api/src/server.mjs'), 'while (true) {}');
  const graded = script('grade.mjs', scenario, run, '250');
  assert.equal(graded.status, 3, graded.stdout + graded.stderr);
  const result = JSON.parse(graded.stdout);
  assert.deepEqual(result.provenance.experiment, e);
  assert.equal(result.provenance.rep, 1);
  assert.equal(result.runtime.phase1, 'codex-cli observed-fixture');
  assert.equal(result.host.phase1.imageVersion, 'fixture-image');
  assert.equal(result.passed, null);
  e.materials.deliverySkill = 'e'.repeat(64);
  await json(plan, { version: 1, experiment: e, runs: [{ scenario, arm: 'baseline', rep: 1 }] });
  const bad = script('prepare.mjs', root, scenario, 'baseline', join(dir, 'bad'), plan, '1');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /materials changed/);
  assert.ok(!(await readdir(dir)).includes('bad'));
});

test('formal aggregation keeps different shared inputs across arms unknown', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-fair-inputs-'));
  const e = experiment();
  await json(join(dir, 'run-plan.json'), {
    version: 1,
    experiment: e,
    runs: ['baseline', 'skill'].map((arm) => ({ scenario, arm, rep: 1 })),
  });
  for (const arm of ['baseline', 'skill']) {
    const r = record(e);
    r.arm = arm;
    r.provenance.arm = arm;
    if (arm === 'skill') r.provenance.baseInputSha256 = 'f'.repeat(64);
    await json(join(dir, `result-${scenario}-${arm}-1.json`), r);
  }
  const result = script('aggregate.mjs', dir);
  assert.equal(result.status, 0, result.stderr);
  const aggregate = JSON.parse(result.stdout);
  assert.deepEqual(
    aggregate.records.map((r) => r.state),
    ['invalid', 'invalid'],
  );
  assert.ok(aggregate.records.every((r) => /Base inputs differ/.test(r.reason)));
  assert.ok(aggregate.summary.every((r) => r.passRate === null));
});
