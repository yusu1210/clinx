// Evaluator only: never copy this oracle into an agent's raw task inputs.
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';

export async function grade(workspace) {
  const { createApp } = await import(pathToFileURL(join(workspace, 'service/src/server.mjs')));
  const instant = '2026-04-01T12:00:00.000Z';
  const cases = [
    ['unscheduled', {}, true],
    ['null-window', { startsAt: null, endsAt: null }, true],
    ['draft', { published: false }, false],
    ['at-start', { startsAt: instant }, true],
    ['at-end', { endsAt: instant }, false],
    ['future', { startsAt: '2026-04-01T12:00:00.001Z' }, false],
    ['expired', { endsAt: '2026-04-01T11:59:59.999Z' }, false],
    ['active', { startsAt: '2026-04-01T11:00:00Z', endsAt: '2026-04-01T13:00:00Z' }, true],
    ['offset-start', { startsAt: '2026-04-01T14:00:00+02:00' }, true],
    ['invalid', { startsAt: 'not-a-date' }, false],
    ['reversed', { startsAt: '2026-04-01T13:00:00Z', endsAt: '2026-04-01T11:00:00Z' }, false],
    ['zero-window', { startsAt: instant, endsAt: instant }, false],
    ['fractional-future-start', { startsAt: '2026-04-01T12:00:00.0001Z' }, false],
    ['fractional-future-end', { endsAt: '2026-04-01T12:00:00.0001Z' }, true],
    ['timezone-required', { startsAt: '2026-04-01T11:00:00' }, false],
    ['impossible-calendar', { startsAt: '2026-02-30T00:00:00Z' }, false],
  ];
  const notices = cases.map(([id, fields]) => ({ id, title: id, published: true, ...fields }));
  const expected = cases.filter(([, , visible]) => visible).map(([id]) => id);
  const server = createApp({ notices, now: () => new Date(instant) });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const results = [];
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const query of ['', '?now=2099-01-01T00:00:00Z']) {
      const response = await fetch(`${url}/api/notices${query}`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      try {
        assert.equal(response.status, 200);
        assert.deepEqual(
          data.items.map((n) => n.id),
          expected,
        );
        assert.equal(data.total, expected.length);
        assert.equal(data.generatedAt, instant);
        results.push({ query, passed: true });
      } catch (error) {
        results.push({ query, passed: false, reason: String(error) });
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
  return {
    passed: results.every((r) => r.passed),
    results,
    scenarios: cases.length,
    limits:
      'HTTP behavior only; inspect original tests, diff, actual browser, scope and handoff separately. This is not an agent-effectiveness result.',
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) {
    console.error('Usage: node evals/grade-cold-start.mjs WORKSPACE');
    process.exitCode = 3;
  } else {
    try {
      const result = await grade(resolve(process.argv[2]));
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.passed ? 0 : 1;
    } catch (error) {
      console.error(String(error));
      process.exitCode = 3;
    }
  }
}
