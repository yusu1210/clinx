import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './helpers.mjs';

// Controlled DOM/fetch doubles exercise async ordering in the reading-list client.
// They are not browser, rendering, accessibility or HTTP integration evidence.
async function client() {
  const elements = new Map();
  const element = () => ({
    children: [],
    handlers: {},
    classList: { toggle() {} },
    addEventListener(event, handler) {
      this.handlers[event] = handler;
    },
    setAttribute() {},
    removeAttribute() {},
    focus() {},
    reset() {},
    replaceChildren(...children) {
      this.children = children;
    },
    append(...children) {
      this.children.push(...children);
    },
  });
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const requests = [];
  const context = vm.createContext({
    document: { getElementById: get, createElement: element },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    AbortSignal,
    fetch: () =>
      new Promise((resolve) =>
        requests.push((data) => resolve({ ok: true, json: async () => data })),
      ),
  });
  vm.runInContext(
    await readFile(join(root, 'examples/reading-list/public/app.js'), 'utf8'),
    context,
  );
  return { get, requests, run: (source) => vm.runInContext(source, context) };
}
const book = { id: '1', title: 'A book', author: 'An author', read: false };

test('client keeps the newest refresh and does not drop a post-write refresh', async () => {
  const c = await client();
  const old = c.run('loadBooks()');
  const fresh = c.run('loadBooks("Saved newest")');
  assert.equal(c.requests.length, 2, 'A refresh after a write must not be dropped');
  c.requests[1]({ books: [book] });
  await fresh;
  c.requests[0]({ books: [] });
  await old;
  assert.equal(c.get('count').textContent, '1');
  assert.equal(c.get('list-feedback').textContent, 'Saved newest');
});

test('client does not restore an old identity view after logout', async () => {
  const c = await client();
  const old = c.run('loadBooks()');
  c.get('logout').handlers.click();
  c.requests[0]({ books: [book] });
  await old;
  assert.equal(c.get('books').children.length, 0);
  assert.equal(c.get('room').hidden, true);
});
