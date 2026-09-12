import { createServer } from 'node:http';
import { query } from './catalog.mjs';

// Tenant is supplied by trusted server context, never by a client query parameter.
// This fixture has no authentication provider and is not a deployable application.
export function server(items, tenant) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET' || url.pathname !== '/items') {
      res.writeHead(404).end();
      return;
    }
    try {
      const result = query(items, {
        tenant,
        offset: Number(url.searchParams.get('offset') ?? 0),
        limit: Number(url.searchParams.get('limit') ?? 20),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result));
    } catch (error) {
      if (!(error instanceof RangeError)) {
        res.writeHead(500).end();
        return;
      }
      res
        .writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Invalid selection' }));
    }
  });
}
