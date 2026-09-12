import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { PreferenceGateway, gatewayError } from './fixtures/bulk-reset/gateway.mjs';

// Evaluator-owned receiver: candidate edits cannot redefine the acceptance protocol.
// This executes candidate code, not a sandbox. Use an outer process deadline too.
export async function gradeBulkReset(workspace, caseTimeoutMs = 1000) {
  const { resetOverrides } = await import(pathToFileURL(join(workspace, 'application.mjs')).href);
  const checks = [];
  if (typeof resetOverrides !== 'function') {
    return {
      passed: false,
      checks: [
        { name: 'requested-operation', passed: false, reason: 'resetOverrides is not exported' },
      ],
    };
  }
  async function check(name, run) {
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(run),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('case deadline exceeded')), caseTimeoutMs);
        }),
      ]);
      checks.push({ name, passed: true });
    } catch (error) {
      checks.push({ name, passed: false, reason: String(error?.message ?? error) });
    } finally {
      clearTimeout(timer);
    }
  }
  function environment(ids, fault = () => null, lookupFails = false) {
    const gateway = new PreferenceGateway(ids);
    const sends = [],
      lookups = [],
      events = [],
      appliedAccounts = [];
    const client = {
      read: (id) => gateway.read(id),
      async receipt(key) {
        events.push('receipt');
        lookups.push(key);
        if (lookupFails) throw gatewayError('UNKNOWN');
        return gateway.receipt(key);
      },
      async patchBatch(key, patches) {
        events.push('send');
        sends.push(structuredClone({ key, patches }));
        const failure = fault(sends.length, key);
        if (failure && failure !== 'accepted-lost') throw gatewayError(failure);
        const before = gateway.applications;
        const result = gateway.patchBatch(key, patches);
        if (gateway.applications > before)
          appliedAccounts.push(...patches.map((patch) => patch.accountId));
        if (failure === 'accepted-lost') throw gatewayError('UNKNOWN');
        return result;
      },
    };
    return { gateway, client, sends, lookups, events, appliedAccounts };
  }
  const ids = (count) => Array.from({ length: count }, (_, i) => `account-${i}`);
  const invoke = (env, accountIds, requestId = 'reset-1') =>
    resetOverrides({ requestId, accountIds }, env.client);
  function cleared(env, accountIds) {
    for (const id of accountIds)
      assert.deepEqual(env.gateway.read(id), { deliveryOverride: null, region: 'north' });
  }

  await check('receiving-reset-semantics', async () => {
    const env = environment(['a', 'b']);
    await invoke(env, ['a']);
    cleared(env, ['a']);
    assert.deepEqual(env.gateway.read('b'), { deliveryOverride: '09:30', region: 'north' });
  });
  await check('deduplicate-before-batching', async () => {
    const selected = ids(17),
      env = environment(selected);
    await invoke(env, [...selected, ...selected]);
    cleared(env, selected);
    assert.ok(env.sends.length <= 3);
    assert.ok(env.sends.every((call) => call.patches.length <= 16));
    assert.deepEqual(
      env.sends.flatMap((call) => call.patches.map((patch) => patch.accountId)),
      selected,
    );
  });
  await check('capacity-48', async () => {
    const selected = ids(48),
      env = environment(selected);
    await invoke(env, selected);
    cleared(env, selected);
    assert.equal(env.sends.length, 3);
  });
  await check('reject-49-before-effects', async () => {
    const selected = ids(49),
      env = environment(selected);
    await assert.rejects(() => invoke(env, selected));
    assert.equal(env.sends.length, 0);
    assert.equal(env.gateway.applications, 0);
  });
  await check('empty-is-no-op', async () => {
    const env = environment(['a']);
    await invoke(env, []);
    assert.equal(env.sends.length, 0);
  });
  await check('invalid-input-before-effects', async () => {
    const env = environment(['a']);
    for (const value of [null, 'a', ['a', ''], ['a', null], ['a', '   ']]) {
      await assert.rejects(() => invoke(env, value));
    }
    for (const value of [null, '', '   ', 42])
      await assert.rejects(() => invoke(env, ['a'], value));
    assert.equal(env.sends.length, 0);
  });
  await check('identifiers-are-not-rewritten', async () => {
    const env = environment(['a', ' a ']);
    await invoke(env, [' a ']);
    cleared(env, [' a ']);
    assert.equal(env.gateway.read('a').deliveryOverride, '09:30');
  });
  await check('replay-does-not-repeat-effects', async () => {
    const env = environment(ids(17));
    await invoke(env, ids(17));
    await invoke(env, ids(17));
    assert.deepEqual(env.appliedAccounts, ids(17));
  });
  await check('request-identity-scopes-replay', async () => {
    const env = environment(['a']);
    await invoke(env, ['a'], 'first-request');
    env.gateway.patchBatch('intervening-edit', [{ accountId: 'a', deliveryOverride: '12:15' }]);
    await invoke(env, ['a'], 'second-request');
    cleared(env, ['a']);
    assert.notEqual(env.sends[0].key, env.sends[1].key);
  });
  await check('permanent-rejection-is-not-retried', async () => {
    for (const code of ['DENIED', 'INVALID', 'UNCLASSIFIED']) {
      const env = environment(['a'], () => code);
      await assert.rejects(() => invoke(env, ['a']));
      assert.equal(env.sends.length, 1);
    }
  });
  await check('transient-rejection-can-recover', async () => {
    const env = environment(['a'], (n) => (n === 1 ? 'RETRYABLE' : null));
    await invoke(env, ['a']);
    cleared(env, ['a']);
    assert.equal(env.sends.length, 2);
    assert.equal(env.sends[0].key, env.sends[1].key);
  });
  await check('retries-are-bounded', async () => {
    const env = environment(['a'], () => 'RETRYABLE');
    await assert.rejects(() => invoke(env, ['a']));
    assert.equal(env.sends.length, 2);
  });
  await check('accepted-response-lost-is-reconciled', async () => {
    const env = environment(['a'], (n) => (n === 1 ? 'accepted-lost' : null));
    await invoke(env, ['a']);
    cleared(env, ['a']);
    assert.deepEqual(env.events, ['send', 'receipt']);
    assert.equal(env.lookups[0], env.sends[0].key);
    assert.equal(env.gateway.applications, 1);
  });
  await check('failed-reconciliation-stops-resubmission', async () => {
    const env = environment(['a'], () => 'UNKNOWN', true);
    await assert.rejects(() => invoke(env, ['a']));
    assert.deepEqual(env.events, ['send', 'receipt']);
  });
  await check('authoritative-absence-allows-same-operation-retry', async () => {
    const env = environment(['a'], (n) => (n === 1 ? 'UNKNOWN' : null));
    await invoke(env, ['a']);
    cleared(env, ['a']);
    assert.deepEqual(env.events, ['send', 'receipt', 'send']);
    assert.equal(env.sends[0].key, env.sends[1].key);
    assert.equal(env.gateway.applications, 1);
  });
  await check('partial-success-can-resume-without-repeat-effects', async () => {
    const env = environment(ids(17), (n) => (n === 2 ? 'DENIED' : null));
    await assert.rejects(() => invoke(env, ids(17)));
    assert.equal(env.gateway.applications, 1);
    await invoke(env, ids(17));
    cleared(env, ids(17));
    assert.deepEqual(env.appliedAccounts, ids(17));
  });
  return {
    passed: checks.every((check) => check.passed),
    checks,
    boundary:
      'Candidate operation through an evaluator-owned in-process receiver with controlled transport faults; not remote integration, elapsed-time capacity measurement or an agent-effectiveness trial',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    process.stderr.write('Usage: node evals/grade-bulk-reset.mjs PROJECT\n');
    process.exitCode = 3;
  } else {
    try {
      const result = await gradeBulkReset(resolve(process.argv[2]));
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exitCode = result.passed ? 0 : 1;
    } catch (error) {
      process.stderr.write(String(error) + '\n');
      process.exitCode = 3;
    }
  }
}
