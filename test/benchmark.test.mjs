import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, cp, readFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { root, put, json } from './helpers.mjs';
import { digest } from '../evals/benchmark/scripts/baseline.mjs';
import { captureDesignRecords } from '../evals/benchmark/scripts/design-records.mjs';

const pack = join(root, 'evals/benchmark');
function script(name, ...args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [join(pack, 'scripts', name), ...args], {
    env,
    encoding: 'utf8',
    timeout: 110000,
  });
  assert.ifError(result.error);
  return result;
}
async function raw() {
  const run = await mkdtemp(join(tmpdir(), 'clinx-benchmark-test-'));
  await cp(join(pack, 'fixture'), join(run, 'project'), { recursive: true });
  return run;
}
const grade = (run, scenario = 'campaign-cross-repo', timeout) =>
  script('grade.mjs', scenario, run, ...(timeout ? [String(timeout)] : []));
const solved = (run) => assert.equal(script('reference-solve.mjs', join(run, 'project')).status, 0);

test('design record capture is bounded, layout independent and does not follow links or private receipts', async () => {
  const project = await mkdtemp(join(tmpdir(), 'clinx-record-test-'));
  const outside = await mkdtemp(join(tmpdir(), 'clinx-record-outside-'));
  await put(join(outside, 'secret.md'), 'outside content');
  await symlink(outside, join(project, 'linked'));
  await put(join(project, '.clinx/private.md'), 'private receipt');
  await put(join(project, 'existing-docs/decision.txt'), 'reviewable proposal');
  const snapshot = await captureDesignRecords(project);
  assert.deepEqual(
    snapshot.files.map((file) => file.path),
    ['existing-docs/decision.txt'],
  );
  assert.equal(snapshot.files[0].sha256, digest('reviewable proposal'));
  await put(join(project, 'oversize.md'), 'x'.repeat(2 * 1024 * 1024 + 1));
  await assert.rejects(captureDesignRecords(project), /size limit/);
});

test('benchmark preparation refuses existing directories, files and symlinks without removing data', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'clinx-prepare-test-'));
  await put(join(parent, 'existing/sentinel'), 'user content');
  await put(join(parent, 'file'), 'user file');
  await symlink('existing', join(parent, 'alias'));
  for (const name of ['existing', 'file', 'alias']) {
    assert.notEqual(
      script('prepare.mjs', root, 'campaign-cross-repo', 'baseline', join(parent, name)).status,
      0,
    );
  }
  assert.equal(await readFile(join(parent, 'existing/sentinel'), 'utf8'), 'user content');
  assert.equal(await readFile(join(parent, 'file'), 'utf8'), 'user file');
});

test('benchmark preparation ignores inherited Git redirects, signing and hooks', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'clinx-git-isolation-'));
  const hooks = join(parent, 'host-hooks');
  const marker = join(parent, 'host-hook-ran');
  await put(join(hooks, 'pre-commit'), `#!/bin/sh\nprintf invoked > "${marker}"\nexit 91\n`);
  await chmod(join(hooks, 'pre-commit'), 0o700);
  const globalConfig = join(parent, 'host.gitconfig');
  await put(globalConfig, `[core]\n\thooksPath = ${hooks}\n[commit]\n\tgpgSign = true\n`);
  const out = join(parent, 'prepared');
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_DIR: join(parent, 'redirected.git'),
    GIT_WORK_TREE: join(parent, 'redirected-worktree'),
  };
  delete env.NODE_TEST_CONTEXT;
  const prepared = spawnSync(
    process.execPath,
    [join(pack, 'scripts/prepare.mjs'), root, 'campaign-cross-repo', 'baseline', out],
    { env, encoding: 'utf8', timeout: 30000 },
  );
  assert.ifError(prepared.error);
  assert.equal(prepared.status, 0, prepared.stderr);
  await assert.rejects(readFile(marker), { code: 'ENOENT' });
});

test('benchmark CLI arm has a relocatable usable runtime without evaluator answers or dev dependencies', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'clinx-runtime-test-'));
  const out = join(parent, 'new run');
  const prepared = script('prepare.mjs', root, 'campaign-cross-repo', 'skill-cli', out);
  assert.equal(prepared.status, 0, prepared.stderr);
  const moved = join(parent, 'relocated');
  await cp(out, moved, { recursive: true });
  const executable = join(moved, 'project/.benchmark/bin/clinx');
  const version = spawnSync(executable, ['--version'], {
    cwd: parent,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(version.status, 0, version.stderr);
  const runtime = join(moved, 'project/.benchmark/clinx-runtime');
  assert.deepEqual(await readdir(join(runtime, 'evals')), ['fixtures']);
  assert.deepEqual(await readdir(join(runtime, 'evals/fixtures')), ['noticeboard']);
  assert.ok((await readdir(join(runtime, 'docs/en'))).includes('cli.md'));
  assert.ok(!(await readdir(join(runtime, 'node_modules'))).includes('typescript'));
  assert.equal(
    await readFile(join(moved, 'project/.benchmark/clinx-usage.log'), 'utf8'),
    '--version\n',
  );
});

test('design boundary catches committed changes and never interprets approval keywords as confirmation', async () => {
  const run = await raw();
  const cwd = join(run, 'project/api');
  for (const args of [
    ['init', '-q'],
    ['add', '.'],
    [
      '-c',
      'user.name=Benchmark',
      '-c',
      'user.email=benchmark@example.invalid',
      'commit',
      '-qm',
      'baseline',
    ],
  ])
    execFileSync('git', args, { cwd });
  await put(join(cwd, 'src/new-feature.mjs'), 'export const premature = true;\n');
  await put(join(cwd, '__proto__'), 'A filename must not disappear into object metadata');
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Benchmark',
      '-c',
      'user.email=benchmark@example.invalid',
      'commit',
      '-qm',
      'implemented',
    ],
    { cwd },
  );
  await put(join(run, 'phase1-final.md'), 'Implemented already; no approval is necessary.');
  const boundary = script('check-phase1.mjs', run);
  assert.equal(boundary.status, 0, boundary.stderr);
  const result = JSON.parse(boundary.stdout);
  assert.equal(result.codeOrTestMutation, true);
  assert.equal(result.askedForConfirmation, null);
  assert.ok(result.details.some((d) => d.paths.includes('src/new-feature.mjs')));
  assert.ok(result.details.some((d) => d.paths.includes('__proto__')));
  const frozen = await readFile(join(run, 'phase1-records.json'));
  await put(join(run, 'project/late-design.md'), 'Too late to satisfy phase one');
  assert.notEqual(script('check-phase1.mjs', run).status, 0);
  assert.deepEqual(await readFile(join(run, 'phase1-records.json')), frozen);
});

test('deterministic benchmark controls fail for their intended assertions, not runtime errors', () => {
  const result = script('validate-pack.mjs', pack);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS:/);
});

test('confirmation grade remains unresolved until a matching independent semantic review exists', async () => {
  const run = await raw();
  const message = 'Please confirm this design before I implement it.';
  await put(
    join(run, 'project/notes/design.md'),
    'Proposed boundary; source anchors; held choices; next action.',
  );
  await put(join(run, 'phase1-final.md'), message);
  assert.equal(script('check-phase1.mjs', run).status, 0);
  solved(run);
  const pending = grade(run, 'campaign-confirmation');
  assert.equal(pending.status, 2, pending.stdout + pending.stderr);
  assert.equal(JSON.parse(pending.stdout).passed, null);
  const records = await readFile(join(run, 'phase1-records.json'));
  const review = {
    reviewer: 'independent fixture reviewer',
    askedForConfirmation: true,
    finalMessageSha256: digest(message),
    recordsSha256: digest(records),
    decisionRecord: {
      paths: ['notes/design.md'],
      reviewable: true,
      sourceBacked: true,
      resumable: true,
    },
  };
  await json(join(run, 'phase1-review.json'), review);
  const accepted = grade(run, 'campaign-confirmation');
  assert.equal(accepted.status, 0);
  assert.equal(JSON.parse(accepted.stdout).metrics.cliTaskRecordsCreated, false);
  assert.equal(JSON.parse(accepted.stdout).metrics.decisionRecordAccepted, true);
  await json(join(run, 'phase1-review.json'), {
    ...review,
    decisionRecord: { ...review.decisionRecord, sourceBacked: false },
  });
  assert.equal(grade(run, 'campaign-confirmation').status, 1);
  await put(join(run, 'project/late-note.md'), 'Added after the approval boundary');
  await json(join(run, 'phase1-review.json'), {
    ...review,
    decisionRecord: { ...review.decisionRecord, paths: ['late-note.md'] },
  });
  assert.equal(grade(run, 'campaign-confirmation').status, 1);
  await json(join(run, 'phase1-review.json'), {
    ...review,
    recordsSha256: digest('other snapshot'),
  });
  assert.equal(grade(run, 'campaign-confirmation').status, 1);
  await json(join(run, 'phase1-review.json'), { ...review, decisionRecord: undefined });
  assert.equal(grade(run, 'campaign-confirmation').status, 2);
  await json(join(run, 'phase1-review.json'), review);

  await put(join(run, 'phase1-final.md'), 'Changed after review');
  assert.equal(grade(run, 'campaign-confirmation').status, 1);
});

test('transition rejects missing or inconsistent treatment metadata before changing the project', async () => {
  for (const meta of [
    null,
    { scenario: 'wrong', arm: 'skill' },
    { scenario: 'campaign-resume-drift', arm: 'wrong' },
  ]) {
    const run = await raw();
    if (meta) await json(join(run, 'benchmark-meta.json'), meta);
    const path = join(run, 'project/policy/src/rules.mjs');
    const before = await readFile(path, 'utf8');
    assert.notEqual(script('transition.mjs', 'campaign-resume-drift', run).status, 0);
    assert.equal(await readFile(path, 'utf8'), before);
    await assert.rejects(readFile(join(run, 'project/HANDOFF_FROM_PHASE1.md')), { code: 'ENOENT' });
  }
});

test('fresh phase-two contexts retain the assigned treatment and authority', async () => {
  for (const scenario of ['campaign-resume-drift', 'campaign-confirmation']) {
    for (const arm of ['baseline', 'skill', 'skill-cli']) {
      const run = await raw();
      await json(join(run, 'benchmark-meta.json'), { scenario, arm });
      assert.equal(script('transition.mjs', scenario, run).status, 0);
      const prompt = await readFile(join(run, 'project/request-phase2.md'), 'utf8');
      assert.equal(prompt.includes('.benchmark/clinx-delivery/SKILL.md'), arm !== 'baseline');
      assert.equal(prompt.includes('.benchmark/bin/clinx'), arm === 'skill-cli');
      assert.match(prompt, /Do not deploy|does not authorize deployment/);
      if (arm === 'skill-cli') assert.match(prompt, /only when it materially helps/);
    }
  }
});

test('resume drift preserves owner violations instead of laundering them into evaluator changes', async () => {
  const run = await raw();
  await json(join(run, 'benchmark-meta.json'), {
    scenario: 'campaign-resume-drift',
    arm: 'baseline',
  });
  solved(run);
  assert.equal(script('transition.mjs', 'campaign-resume-drift', run).status, 0);
  solved(run);
  const good = grade(run, 'campaign-resume-drift');
  assert.equal(good.status, 0, good.stdout + good.stderr);
  const bad = await raw();
  await json(join(bad, 'benchmark-meta.json'), {
    scenario: 'campaign-resume-drift',
    arm: 'baseline',
  });
  const path = join(bad, 'project/policy/src/rules.mjs');
  const changed = (await readFile(path, 'utf8')) + '\n// out-of-scope modification\n';
  await put(path, changed);
  assert.equal(script('transition.mjs', 'campaign-resume-drift', bad).status, 0);
  assert.equal(await readFile(path, 'utf8'), changed);
  const boundary = JSON.parse(await readFile(join(bad, 'transition-boundary.json'), 'utf8'));
  assert.equal(boundary.violations[0].repo, 'policy');
});

test('a hanging candidate import is terminated and produces a durable operational failure', async () => {
  const run = await raw();
  await json(join(run, 'benchmark-meta.json'), { arm: 'baseline' });
  await put(
    join(run, 'project/api/src/server.mjs'),
    'await new Promise(() => { setInterval(() => {}, 1000); });\n',
  );
  const result = grade(run, 'campaign-cross-repo', 500);
  assert.equal(result.status, 3, result.stderr);
  const saved = JSON.parse(await readFile(join(run, 'grade.json'), 'utf8'));
  assert.equal(saved.evaluation, 'operational-failure');
  assert.match(saved.operationalFailure, /exceeded/);
  assert.equal(saved.arm, 'baseline');
  assert.equal(saved.passed, null);
  assert.equal(saved.passedChecks, null);
});

test('aggregation retains planned missing, invalid and unknown runs without inventing zero measurements', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-aggregate-test-'));
  const scenario = 'campaign-resume-drift';
  await json(
    join(dir, 'run-plan.json'),
    [1, 2, 3].map((rep) => ({ scenario, arm: 'baseline', rep })),
  );
  await json(join(dir, `result-${scenario}-baseline-1.json`), {
    version: 2,
    evaluation: 'passed',
    checks: [{ name: 'observed', pass: true }],
    scenario,
    arm: 'baseline',
    passed: true,
    passedChecks: 1,
    totalChecks: 1,
    metrics: {
      phase1ElapsedMs: 1000,
      phase2ElapsedMs: null,
      phase1AgentOutcome: null,
      phase2AgentOutcome: null,
    },
  });
  await put(join(dir, `result-${scenario}-baseline-3.json`), '{bad');
  let result = script('aggregate.mjs', dir);
  assert.equal(result.status, 0, result.stderr);
  let data = JSON.parse(result.stdout);
  assert.deepEqual(
    data.records.map((r) => r.state),
    ['recorded', 'missing', 'invalid'],
  );
  assert.equal(data.summary[0].confirmedPassRate, 1 / 3);
  assert.equal(data.summary[0].passRate, null);
  assert.equal(data.summary[0].meanElapsedMs, null);
  assert.equal(data.summary[0].operationalFailureRate, null);
  await json(join(dir, 'run-plan.json'), [
    { scenario: 'campaign-cross-repo', arm: 'baseline', rep: 1 },
  ]);
  await json(join(dir, 'result-campaign-cross-repo-baseline-1.json'), {
    version: 2,
    evaluation: 'passed',
    checks: [{ name: 'observed', pass: true }],
    scenario: 'campaign-cross-repo',
    arm: 'baseline',
    passed: true,
    passedChecks: 1,
    totalChecks: 1,
    metrics: { phase1ElapsedMs: 0, phase1AgentOutcome: 'success' },
  });
  data = JSON.parse(script('aggregate.mjs', dir).stdout);
  assert.equal(data.summary[0].meanElapsedMs, 0);
  assert.equal(data.summary[0].operationalFailureRate, 0);
  assert.equal(data.unexpectedFiles.length, 2);
  await json(join(dir, 'result-campaign-cross-repo-baseline-1.json'), {
    version: 2,
    scenario: 'campaign-cross-repo',
    arm: 'baseline',
    evaluation: 'passed',
    passed: true,
    passedChecks: 1,
    totalChecks: 1,
    checks: [{ name: 'contradiction', pass: false }],
  });
  data = JSON.parse(script('aggregate.mjs', dir).stdout);
  assert.equal(data.records[0].state, 'invalid');
  assert.equal(data.summary[0].passRate, null);
});
