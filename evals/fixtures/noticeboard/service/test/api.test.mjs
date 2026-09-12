import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.mjs';

test('published unscheduled notices, clock, HTTP routes and sibling viewer', async () => {
  const server = createApp({
    notices: [
      { id: 'public', title: 'Public', published: true },
      { id: 'draft', title: 'Draft', published: false },
    ],
    now: () => new Date('2026-01-01T12:00:00Z'),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const data = await (await fetch(`${url}/api/notices`)).json();
    assert.deepEqual(
      data.items.map((n) => n.id),
      ['public'],
    );
    assert.equal(data.total, 1);
    assert.equal(data.generatedAt, '2026-01-01T12:00:00.000Z');
    assert.match(await (await fetch(url)).text(), /Noticeboard/);
    assert.equal((await fetch(`${url}/board.js`)).status, 200);
    assert.equal((await fetch(`${url}/missing`)).status, 404);
    assert.equal((await fetch(`${url}/api/notices`, { method: 'POST' })).status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
