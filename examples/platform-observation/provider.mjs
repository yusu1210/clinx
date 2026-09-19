import { createServer } from 'node:http';

export const expected = {
  id: 'job-42',
  target: 'isolated-preview',
  revision: 'build-7',
  cases: ['write-readback', 'reject-other-tenant'],
};
export const success = () => ({
  ok: true,
  job: {
    ...expected,
    state: 'succeeded',
    cases: expected.cases.map((id) => ({ id, status: 'passed' })),
  },
});

// An owned deterministic HTTP fixture, not a deployed platform or test execution.
export async function provider(replies) {
  let requests = 0;
  const server = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== `/jobs/${expected.id}`) {
      res.writeHead(404).end();
      return;
    }
    const reply = replies[Math.min(requests++, replies.length - 1)];
    res.writeHead(reply.status ?? 200, { 'content-type': 'application/json' });
    res.end(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/jobs/${expected.id}`,
    requests: () => requests,
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
