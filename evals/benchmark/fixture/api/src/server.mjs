import http from 'node:http';
import { queryCampaigns } from './query.mjs';

function positiveInt(value, fallback) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
}

export function createCampaignServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET' || url.pathname !== '/campaigns') {
      res.writeHead(404).end();
      return;
    }

    const tenant = req.headers['x-tenant'];
    const region = req.headers['x-region'];
    const page = positiveInt(url.searchParams.get('page'), 1);
    const size = positiveInt(url.searchParams.get('size'), 20);

    if (
      typeof tenant !== 'string' ||
      typeof region !== 'string' ||
      page === null ||
      size === null ||
      size > 50
    ) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid request' }));
      return;
    }

    const result = queryCampaigns({ tenant, region, page, size });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result));
  });
}
