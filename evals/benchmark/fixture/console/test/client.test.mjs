import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignUrl } from '../src/client.mjs';

test('client builds the existing paginated URL', () => {
  assert.equal(
    campaignUrl('http://127.0.0.1:3000', { page: 2, size: 5 }).toString(),
    'http://127.0.0.1:3000/campaigns?page=2&size=5',
  );
});
