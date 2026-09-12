import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile, mkdir, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
async function start(dataDir) {
  const child = spawn(process.execPath, ['server.mjs', '--data-dir', dataDir, '--port', '0'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '',
    errors = '';
  child.stderr.on('data', (chunk) => {
    errors += chunk;
  });
  const started = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Startup timeout: ${errors}`));
    }, 5000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited (${code}): ${errors}`));
    });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const line = output.split('\n')[0];
      if (output.includes('\n')) {
        try {
          clearTimeout(timer);
          resolve(JSON.parse(line));
        } catch (error) {
          reject(error);
        }
      }
    });
  });
  return {
    ...started,
    child,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      const [code, signal] = await stopped;
      clearTimeout(timer);
      assert.equal(signal, null, 'Server should stop gracefully');
      assert.equal(code, 0, errors);
    },
    async request(path, { role = 'reader', method = 'GET', body, headers = {}, raw } = {}) {
      const response = await fetch(started.url + path, {
        method,
        headers: {
          ...(role ? { Authorization: `Bearer ${started.demoCodes[role] ?? role}` } : {}),
          ...(body !== undefined || raw !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...headers,
        },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
        signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, data: await response.json() };
    },
  };
}

test('real HTTP contract and disk persistence', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'reading-list-http-test-'));
  let server;
  t.after(async () => {
    await server?.stop();
    await rm(dataDir, { recursive: true, force: true });
  });
  server = await start(dataDir);
  let book;
  await t.test('starts on loopback; serves the browser; list starts empty', async () => {
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    const page = await fetch(server.url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Demo access code/);
    assert.deepEqual((await server.request('/api/books')).data, { books: [] });
    assert.deepEqual((await server.request('/api/session')).data, { role: 'reader' });
  });
  await t.test('requires a valid server-issued identity', async () => {
    for (const role of [null, 'invalid', 'f'.repeat(48)]) {
      assert.equal((await server.request('/api/books', { role })).status, 401);
    }
    assert.equal(
      (
        await server.request('/api/books', {
          role: null,
          method: 'POST',
          body: { title: 'Unauthorized', author: 'Nobody' },
        })
      ).status,
      401,
    );
  });
  await t.test('reader can save a trimmed title and author and read it back', async () => {
    const result = await server.request('/api/books', {
      method: 'POST',
      body: { title: '  A Wizard of Earthsea  ', author: '  Ursula K. Le Guin  ' },
    });
    assert.equal(result.status, 201);
    book = result.data.book;
    assert.equal(book.title, 'A Wizard of Earthsea');
    assert.equal(book.author, 'Ursula K. Le Guin');
    assert.equal(book.read, false);
    assert.deepEqual((await server.request('/api/books')).data.books, [book]);
    assert.deepEqual(JSON.parse(await readFile(join(dataDir, 'books.json'), 'utf8')), [book]);
  });
  await t.test('reader cannot mark read through direct HTTP or forged role claims', async () => {
    const result = await server.request(`/api/books/${book.id}/read`, {
      method: 'PATCH',
      body: { read: true },
      headers: { 'X-Role': 'librarian', 'X-User-Role': 'librarian' },
    });
    assert.equal(result.status, 403);
    assert.equal((await server.request('/api/books')).data.books[0].read, false);
    assert.equal(
      (
        await server.request('/api/books', {
          method: 'POST',
          body: { title: 'Privilege injection', author: 'Reader', read: true, role: 'librarian' },
        })
      ).status,
      400,
    );
  });
  await t.test(
    'server rejects blank, missing, wrong type, long, malformed and oversized input',
    async () => {
      const invalid = [
        { title: ' ', author: 'A' },
        { title: 'Book' },
        { title: 42, author: 'A' },
        { title: 'B', author: '' },
        { title: 'x'.repeat(121), author: 'A' },
        { title: 'B', author: 'x'.repeat(121) },
      ];
      for (const body of invalid)
        assert.equal((await server.request('/api/books', { method: 'POST', body })).status, 400);
      assert.equal((await server.request('/api/books', { method: 'POST', raw: '{' })).status, 400);
      assert.equal(
        (
          await server.request('/api/books', {
            method: 'POST',
            body: { title: 'B', author: 'A' },
            headers: { 'Content-Type': 'text/plain' },
          })
        ).status,
        415,
      );
      assert.equal(
        (
          await server.request('/api/books', {
            method: 'POST',
            body: { title: 'x'.repeat(9000), author: 'A' },
          })
        ).status,
        413,
      );
      assert.equal((await server.request('/api/books')).data.books.length, 1);
    },
  );
  await t.test('cross-origin writes and unexpected Host are rejected', async () => {
    assert.equal(
      (
        await server.request('/api/books', {
          method: 'POST',
          body: { title: 'B', author: 'A' },
          headers: { Origin: 'http://elsewhere.invalid' },
        })
      ).status,
      403,
    );
    const { request } = await import('node:http');
    const status = await new Promise((resolve, reject) => {
      const req = request(server.url, { headers: { Host: 'elsewhere.invalid' } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 403);
  });
  await t.test('librarian marks read; repeating is idempotent; unknown book is 404', async () => {
    for (let i = 0; i < 2; i++) {
      const result = await server.request(`/api/books/${book.id}/read`, {
        role: 'librarian',
        method: 'PATCH',
        body: { read: true },
      });
      assert.equal(result.status, 200);
      assert.equal(result.data.book.read, true);
    }
    assert.equal(
      (
        await server.request(`/api/books/${book.id}/read`, {
          role: 'librarian',
          method: 'PATCH',
          body: { read: false },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await server.request('/api/books/00000000-0000-0000-0000-000000000000/read', {
          role: 'librarian',
          method: 'PATCH',
          body: { read: true },
        })
      ).status,
      404,
    );
  });
  await t.test('concurrent saves are serialized without losing recommendations', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        server.request('/api/books', {
          method: 'POST',
          body: { title: `Concurrent book ${i}`, author: 'Test author' },
        }),
      ),
    );
    assert.ok(results.every((result) => result.status === 201));
    const saved = (await server.request('/api/books')).data.books;
    assert.equal(saved.length, 9);
    assert.equal(new Set(saved.map((item) => item.id)).size, 9);
  });
  await t.test('failed disk write returns an error and does not claim a saved change', async () => {
    const dataPath = join(dataDir, 'books.json');
    const backup = join(dataDir, 'books.test-backup');
    await rename(dataPath, backup);
    await mkdir(dataPath);
    try {
      const response = await server.request('/api/books', {
        method: 'POST',
        body: { title: 'Unsaved', author: 'Test author' },
      });
      assert.equal(response.status, 500);
      assert.match(response.data.error, /not saved/);
      assert.equal((await server.request('/api/books')).data.books.length, 9);
    } finally {
      await rm(dataPath, { recursive: true });
      await rename(backup, dataPath);
    }
  });
  await t.test('saved list and read status survive an actual server process restart', async () => {
    const before = (await server.request('/api/books')).data.books;
    const oldReader = server.demoCodes.reader;
    await server.stop();
    server = await start(dataDir);
    assert.deepEqual((await server.request('/api/books')).data.books, before);
    assert.equal(before[0].read, true);
    assert.notEqual(server.demoCodes.reader, oldReader);
    assert.equal((await server.request('/api/books', { role: oldReader })).status, 401);
    const result = await server.request('/api/books', {
      method: 'POST',
      body: { title: 'After restart', author: 'Test author' },
    });
    assert.equal(result.status, 201);
    assert.equal((await server.request('/api/books')).data.books.length, 10);
  });
});
