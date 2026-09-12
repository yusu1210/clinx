import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, json, cli } from './helpers.mjs';
import { gradeBulkReset } from '../evals/grade-bulk-reset.mjs';

// Evaluator-authored positive control, never copied into raw agent inputs.
const compatible = `import { planBatches, sendBatch } from './delivery.mjs';
export { readSettings } from './baseline-application.mjs';
export async function resetOverrides({ requestId, accountIds }, client) {
  if (typeof requestId !== 'string' || !requestId.trim() || !Array.isArray(accountIds) ||
      accountIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Invalid input');
  const unique = [...new Set(accountIds)];
  const batches = planBatches(unique);
  const receipts = [];
  for (const [index, batch] of batches.entries()) {
    receipts.push(await sendBatch(client, JSON.stringify([requestId, index]),
      batch.map(accountId => ({ accountId, deliveryOverride: null }))));
  }
  return receipts;
}
`;

async function fixture(solution) {
  const path = await mkdtemp(join(tmpdir(), 'clinx-bulk-control-'));
  await cp(join(root, 'evals/fixtures/bulk-reset'), path, { recursive: true });
  if (solution) {
    await cp(join(path, 'application.mjs'), join(path, 'baseline-application.mjs'));
    await writeFile(join(path, 'application.mjs'), solution);
  }
  return path;
}

test('bulk boundary fixture passes old tests but does not implement the new outcome', async () => {
  const path = await fixture();
  const old = spawnSync(process.execPath, ['--test', 'existing.test.mjs'], {
    cwd: path,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(old.status, 0, old.stdout + old.stderr);
  const result = await gradeBulkReset(path);
  assert.equal(result.passed, false);
  assert.equal(result.checks[0].name, 'requested-operation');
});

test('bulk boundary oracle accepts a compatible implementation through the actual receiver', async () => {
  // A different valid partition must pass too; acceptance is not planner output identity.
  const alternative = compatible.replace(
    'const batches = planBatches(unique);',
    `planBatches(unique);
  const count = Math.min(3, unique.length), size = Math.ceil(unique.length / (count || 1));
  const batches = Array.from({ length: count }, (_, index) => unique.slice(index * size, (index + 1) * size));`,
  );
  const otherResult = await gradeBulkReset(await fixture(alternative));
  assert.equal(otherResult.passed, true, JSON.stringify(otherResult));
  const path = await fixture(compatible);
  const result = await gradeBulkReset(path);
  assert.equal(result.passed, true, JSON.stringify(result));
  assert.equal(result.checks.length, 16);
  const old = spawnSync(process.execPath, ['--test', 'existing.test.mjs'], {
    cwd: path,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(old.status, 0, old.stdout + old.stderr);
});

test('bulk boundary oracle rejects encoding, capacity, retry and false-success regressions', async () => {
  const mutations = [
    {
      app: (text) => text.replace('JSON.stringify([requestId, index])', 'JSON.stringify([index])'),
      check: 'request-identity-scopes-replay',
    },
    {
      delivery: (text) =>
        text.replace(
          'if (receipt !== null) return receipt;',
          'if (receipt !== null) return receipt; throw error;',
        ),
      check: 'authoritative-absence-allows-same-operation-retry',
    },
    {
      app: (text) => text.replace('deliveryOverride: null', 'deliveryOverride: {}'),
      check: 'receiving-reset-semantics',
    },
    {
      app: (text) =>
        text.replace(
          'planBatches(unique)',
          'Array.from({length: Math.ceil(unique.length / 16)}, (_, i) => unique.slice(i * 16, i * 16 + 16))',
        ),
      check: 'reject-49-before-effects',
    },
    {
      delivery: (text) => text.replace('await client.receipt(key)', 'null'),
      check: 'accepted-response-lost-is-reconciled',
    },
    {
      delivery: (text) => text.replace("error.code !== 'RETRYABLE'", 'false'),
      check: 'permanent-rejection-is-not-retried',
    },
    {
      delivery: (text) => text.replaceAll('throw error;', 'return null;'),
      check: 'permanent-rejection-is-not-retried',
    },
    {
      app: (text) =>
        text
          .replace(
            'export async function resetOverrides',
            'let nonce = 0;\nexport async function resetOverrides',
          )
          .replace(
            'JSON.stringify([requestId, index])',
            'JSON.stringify([requestId, index, ++nonce])',
          ),
      check: 'replay-does-not-repeat-effects',
    },
  ];
  for (const mutation of mutations) {
    const path = await fixture(mutation.app ? mutation.app(compatible) : compatible);
    if (mutation.delivery) {
      const file = join(path, 'delivery.mjs');
      await writeFile(file, mutation.delivery(await readFile(file, 'utf8')));
    }
    const result = await gradeBulkReset(path);
    assert.equal(result.passed, false);
    assert.equal(
      result.checks.find((check) => check.name === mutation.check)?.passed,
      false,
      JSON.stringify(result),
    );
  }
});

test('bulk boundary oracle times out a noncompleting asynchronous operation', async () => {
  const rejected = await fixture('export const resetOverrides = async () => { throw null; };');
  const failed = await gradeBulkReset(rejected);
  assert.equal(failed.passed, false);
  assert.equal(
    failed.checks.find((check) => check.name === 'receiving-reset-semantics').reason,
    'null',
  );
  const path = await fixture('export const resetOverrides = () => new Promise(() => {});');
  const result = await gradeBulkReset(path, 50);
  assert.equal(result.passed, false);
  assert.equal(result.checks.length, 16);
  assert.ok(
    result.checks.every((check) => !check.passed && check.reason === 'case deadline exceeded'),
  );
});

test('CLI keeps passing baseline evidence separate from unresolved delivery semantics', async () => {
  const path = await fixture();
  await json(join(path, 'clinx.config.json'), {
    version: 1,
    name: 'boundary-control',
    sources: [
      {
        id: 'app',
        path: '.',
        inputs: [
          'application.mjs',
          'delivery.mjs',
          'gateway.mjs',
          'existing.test.mjs',
          'PRD.md',
          'README.md',
          'clinx.config.json',
        ],
      },
    ],
    checks: [
      {
        id: 'baseline',
        source: 'app',
        description: 'Existing gateway tests, not the new operation',
        command: [process.execPath, '--test', '--test-reporter=junit', 'existing.test.mjs'],
        result: {
          format: 'junit',
          from: 'stdout',
          minTests: 3,
          expectedTests: [
            'test#read settings preserves gateway values',
            'test#existing gateway distinguishes omission and reset and deduplicates a replay',
            'test#shared planner respects batch and operation capacity',
          ],
        },
      },
    ],
  });
  await json(join(path, 'clinx/tasks/reset/contract.json'), {
    version: 1,
    id: 'reset',
    title: 'Implement scoped override reset',
    mode: 'implementation',
    outcome: 'Clear selected delivery overrides using the existing gateway contract',
    scope: ['Application operation and relevant tests'],
    defaultClaim: 'baseline',
    claims: ['baseline', 'delivery'],
    decisions: [
      {
        question: 'Does the old test suite cover the requested operation?',
        choice: 'No; baseline compatibility only',
        basis: 'Current application exports only readSettings; PRD.md requests a new operation',
      },
    ],
    obligations: [
      {
        id: 'existing',
        description: 'Existing gateway contract remains valid',
        claims: ['baseline', 'delivery'],
        checks: ['baseline'],
      },
      {
        id: 'new-operation',
        description: 'Requested reset behavior through the receiver',
        claims: ['delivery'],
        external: 'No new-operation acceptance has run; passing baseline tests cannot establish it',
      },
    ],
  });
  const baseline = cli(path, 'verify', 'reset', '--run');
  assert.equal(baseline.status, 0, baseline.err);
  assert.equal(baseline.out.verdict.decision, 'supported');
  assert.equal(baseline.out.verdict.claim, 'baseline');
  const delivery = cli(path, 'verify', 'reset', '--claim', 'delivery', '--run');
  assert.equal(delivery.status, 2, delivery.err);
  assert.equal(delivery.out.verdict.decision, 'unresolved');
  assert.equal(
    delivery.out.verdict.obligations.find((o) => o.id === 'new-operation').disposition,
    'unresolved',
  );
  assert.equal((await gradeBulkReset(path)).passed, false);
});
