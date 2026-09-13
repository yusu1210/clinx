import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createCampaignServer } from '../src/server.mjs';

test('existing campaign list preserves eligibility and pagination', async (t) => {
  const server = createCampaignServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/campaigns?page=1&size=2`, {
    headers: { 'x-tenant': 'tenant-a', 'x-region': 'sg' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    rows: [
      { id: 'c1', tier: 'gold' },
      { id: 'c2', tier: 'silver' },
    ],
    total: 3,
  });
});
