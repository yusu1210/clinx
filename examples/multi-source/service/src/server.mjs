import { createServer } from 'node:http';
import { isVisible } from '../../policy/src/visibility.mjs';

export function server(notices) {
  return createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/notices') {
      response.writeHead(404).end();
      return;
    }
    const items = notices.filter(isVisible);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ items, total: items.length }));
  });
}
