import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { server } from '../../service/src/server.mjs';
import { notices } from '../src/notices.mjs';

test('consumer receives only visible notices and matching total', async () => {
  const app = server([
    { title: 'Open', active: true },
    { title: 'Hidden', active: false },
  ]);
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  try {
    assert.deepEqual(await notices(`http://127.0.0.1:${app.address().port}`), {
      titles: ['Open'],
      total: 1,
    });
  } finally {
    await new Promise((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
