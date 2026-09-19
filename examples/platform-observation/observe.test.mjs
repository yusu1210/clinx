import test from 'node:test';
import assert from 'node:assert/strict';
import { observe } from './observe.mjs';
import { provider, expected, success } from './provider.mjs';

test('correlated terminal cases pass; accepted and running replies stay inconclusive', async () => {
  const pending = success();
  pending.job.state = 'running';
  const fixture = await provider([{ status: 202, body: pending }, { body: success() }]);
  try {
    const first = await observe(fixture.url, expected);
    assert.equal(first.outcome, 'inconclusive');
    assert.equal(fixture.requests(), 1, 'Read-only observation does not create or retry a job');
    const second = await observe(fixture.url, expected);
    assert.equal(second.outcome, 'pass');
    assert.equal(second.status, 200);
    assert.deepEqual(JSON.parse(second.raw), success());
    assert.equal(first.outcome, 'inconclusive', 'Later success cannot rewrite earlier history');
  } finally {
    await fixture.close();
  }
});

test('business errors, wrong identities, missing cases and unreadable responses never pass', async () => {
  const cases = [
    { status: 200, body: { ok: false, job: success().job } },
    { status: 503, body: success() },
    { body: '{bad-json' },
    { body: 'x'.repeat(64 * 1024 + 1) },
    ...['id', 'target', 'revision'].map((key) => ({
      body: { ok: true, job: { ...success().job, [key]: 'other' } },
    })),
    ...['running', 'queued', 'cancelled', 'unknown'].map((state) => ({
      body: { ok: true, job: { ...success().job, state } },
    })),
    ...[
      [],
      [success().job.cases[0]],
      [success().job.cases[0], success().job.cases[0]],
      expected.cases.map((id) => ({ id, status: 'skipped' })),
      expected.cases.map((id) => ({ id, status: 'unrecognized' })),
    ].map((cases) => ({ body: { ok: true, job: { ...success().job, cases } } })),
  ];
  for (const reply of cases) {
    const fixture = await provider([reply]);
    try {
      const result = await observe(fixture.url, expected);
      assert.equal(result.outcome, 'inconclusive', JSON.stringify(reply).slice(0, 300));
      assert.ok(result.reason);
    } finally {
      await fixture.close();
    }
  }
});

test('failed jobs and failed cases remain failures even with HTTP 200', async () => {
  for (const job of [
    { ...success().job, state: 'failed' },
    {
      ...success().job,
      cases: [...success().job.cases, { id: 'extra-regression', status: 'failed' }],
    },
  ]) {
    const fixture = await provider([{ body: { ok: true, job } }]);
    try {
      const result = await observe(fixture.url, expected);
      assert.equal(result.outcome, 'fail');
      assert.deepEqual(JSON.parse(result.raw).job, job);
    } finally {
      await fixture.close();
    }
  }
});

test('transport failure and missing acceptance identity do not become success', async () => {
  const fixture = await provider([{ body: success() }]);
  await fixture.close();
  assert.equal((await observe(fixture.url, expected)).outcome, 'inconclusive');
  for (const change of [{ revision: '' }, { cases: [] }, { cases: ['a', 'a'] }])
    await assert.rejects(observe(fixture.url, { ...expected, ...change }), /identities/);
  await assert.rejects(observe('https://example.invalid/jobs/job-42', expected), /loopback/);
});
