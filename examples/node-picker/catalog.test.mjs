import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { query } from './catalog.mjs';
import { server } from './http.mjs';

const items = [
  { id: 'c', tenant: 'one', active: true, stock: 2 },
  { id: 'a', tenant: 'one', active: true, stock: 1 },
  { id: 'b', tenant: 'one', active: false, stock: 1 },
  { id: 'd', tenant: 'one', active: true, stock: 0 },
  { id: 'e', tenant: 'two', active: true, stock: 1 },
];
test('filters before pagination and counts the same set', () => {
  const result = query(items, { tenant: 'one', offset: 1, limit: 1 });
  assert.deepEqual(
    result.rows.map((i) => i.id),
    ['c'],
  );
  assert.equal(result.total, 2);
  assert.deepEqual(query(items, { tenant: 'one', offset: 8 }).rows, []);
});
test('rejects invalid pagination', () => {
  for (const options of [{ offset: -1 }, { limit: 0 }, { offset: 0.5 }, { limit: 101 }]) {
    assert.throws(() => query(items, { tenant: 'one', ...options }), RangeError);
  }
});
test('HTTP boundary preserves eligibility total and server tenant', async (t) => {
  const app = server(items, 'one');
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        app.close(resolve);
        app.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${app.address().port}`;
  const response = await fetch(`${base}/items?limit=1&tenant=two`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 2);
  assert.deepEqual(
    body.rows.map((i) => i.id),
    ['a'],
  );
  assert.equal((await fetch(`${base}/items?offset=-1`)).status, 400);
  assert.equal((await fetch(`${base}/elsewhere`)).status, 404);
});
