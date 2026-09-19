import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { copyExample, cli } from './helpers.mjs';

test('platform example connects native HTTP checks, retained history, resumption and drift', async () => {
  const dir = await copyExample('platform-observation');
  const local = cli(dir, 'verify', 'observe-job', '--run');
  assert.equal(local.status, 0, local.err);
  assert.equal(local.out.verdict.decision, 'supported');
  const demo = spawnSync(process.execPath, ['demo.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(demo.status, 0, demo.stderr);
  const results = demo.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    results.map((r) => r.outcome),
    ['inconclusive', 'fail', 'pass'],
  );
  for (const result of results) {
    const attached = cli(dir, 'evidence', 'attach', 'observe-job', '--file', result.attachment);
    assert.equal(attached.status, 0, attached.err);
  }
  const context = cli(dir, 'context', 'observe-job').out;
  assert.equal(context.evidence.records.length, 3);
  assert.equal(context.evidence.integrity, 'not-checked');
  assert.ok(context.evidence.records.some((r) => r.observation.outcome === 'fail'));
  const integration = cli(dir, 'verify', 'observe-job', '--claim', 'integration', '--run');
  assert.equal(integration.status, 2, integration.err);
  assert.equal(
    integration.out.verdict.obligations.find((o) => o.id === 'target-behavior').disposition,
    'unresolved',
  );
  const file = join(dir, 'observe.mjs');
  const original = await readFile(file, 'utf8');
  // Broken control: a plausible HTTP/business-envelope shortcut discards identity
  // and actual case results. The original, unchanged oracle must reject it.
  await writeFile(
    file,
    original.replace(
      'const job = body.job;',
      "return result('pass', 'Envelope-only shortcut');\n  const job = body.job;",
    ),
  );
  assert.equal(
    cli(dir, 'reconcile', 'observe-job', '--receipt', local.out.receipt).out.verdict.applicability,
    'stale',
  );
  assert.ok(
    cli(dir, 'evidence', 'list', 'observe-job').out.records.every(
      (r) => r.localBinding === 'changed',
    ),
  );
  const broken = cli(dir, 'verify', 'observe-job', '--run');
  assert.equal(broken.status, 1, broken.err);
  assert.equal(broken.out.verdict.decision, 'failed');
  await writeFile(file, original);
  assert.equal(cli(dir, 'verify', 'observe-job', '--run').out.verdict.decision, 'supported');
  assert.equal(cli(dir, 'context', 'observe-job').out.evidence.records.length, 3);
});
