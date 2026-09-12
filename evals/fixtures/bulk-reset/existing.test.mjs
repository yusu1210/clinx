import test from 'node:test';
import assert from 'node:assert/strict';
import { readSettings } from './application.mjs';
import { PreferenceGateway } from './gateway.mjs';
import { planBatches, sendBatch } from './delivery.mjs';

test('read settings preserves gateway values', () => {
  const gateway = new PreferenceGateway(['a']);
  assert.deepEqual(readSettings('a', gateway), { deliveryOverride: '09:30', region: 'north' });
});

test('existing gateway distinguishes omission and reset and deduplicates a replay', async () => {
  const gateway = new PreferenceGateway(['a']);
  await sendBatch(gateway, 'keep', [{ accountId: 'a' }]);
  assert.equal(gateway.read('a').deliveryOverride, '09:30');
  await sendBatch(gateway, 'clear', [{ accountId: 'a', deliveryOverride: null }]);
  await sendBatch(gateway, 'clear', [{ accountId: 'a', deliveryOverride: null }]);
  assert.equal(gateway.read('a').deliveryOverride, null);
  assert.equal(gateway.applications, 2);
});

test('shared planner respects batch and operation capacity', () => {
  assert.deepEqual(
    planBatches(Array(48).fill('x')).map((batch) => batch.length),
    [16, 16, 16],
  );
  assert.throws(() => planBatches(Array(49).fill('x')), RangeError);
});
