import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleCampaigns } from '../src/rules.mjs';

test('eligibility remains owned by policy', () => {
  assert.deepEqual(
    eligibleCampaigns({ tenant: 'tenant-a', region: 'sg' }).map((c) => c.id),
    ['c1', 'c2', 'c7'],
  );
});
