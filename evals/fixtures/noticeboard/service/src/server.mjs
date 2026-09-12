import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { listNotices } from './catalog.mjs';
import { notices as initial } from './data.mjs';

const publicRoot = new URL('../../viewer/public/', import.meta.url);
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/board.js', ['board.js', 'text/javascript; charset=utf-8']],
]);
export function createApp({ notices = initial, now = () => new Date() } = {}) {
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET') {
        res.writeHead(405).end();
        return;
      }
      if (path === '/api/notices') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ ...listNotices(notices), generatedAt: now().toISOString() }));
        return;
      }
      const asset = assets.get(path);
      if (!asset) {
        res.writeHead(404).end();
        return;
      }
      const body = await readFile(new URL(asset[0], publicRoot));
      res.writeHead(200, { 'content-type': asset[1] }).end(body);
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
}
