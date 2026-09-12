import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { root, put } from './helpers.mjs';
import { grade } from '../evals/grade-cold-start.mjs';

test('cold-start preparation separates raw multi-project inputs from method and oracle', async () => {
  let prd;
  for (const variant of ['baseline', 'skill', 'recorded']) {
    const r = spawnSync(process.execPath, ['evals/prepare.mjs', 'cold-start', variant], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    const output = JSON.parse(r.stdout);
    assert.equal(output.executed, false);
    assert.equal(output.variant, variant);
    assert.deepEqual((await readdir(output.workspace)).sort(), ['PRD.md', 'service', 'viewer']);
    const currentPrd = await readFile(join(output.workspace, 'PRD.md'), 'utf8');
    if (prd) assert.equal(currentPrd, prd);
    prd = currentPrd;
    const record = JSON.parse(await readFile(output.inputs, 'utf8'));
    assert.ok(record.hashes['project/service/src/server.mjs']);
    assert.ok(!Object.keys(record.hashes).some((p) => /grade-cold-start|scenarios.json/.test(p)));
    const request = await readFile(output.request, 'utf8');
    if (variant === 'baseline') {
      assert.equal(output.skill, null);
      assert.doesNotMatch(request, /clinx-delivery/);
    } else assert.ok(record.hashes['clinx-delivery/references/cold-start.md']);
    assert.equal(Boolean(output.cli), variant === 'recorded');
  }
});

test(
  'cold-start oracle times out an unresponsive HTTP candidate and closes its server',
  { timeout: 9000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'clinx-oracle-timeout-'));
    const candidate = join(dir, 'service/src/server.mjs');
    await put(
      candidate,
      `import { createServer } from 'node:http';
    export const server = createServer(() => {});
    export const createApp = () => server;
  `,
    );
    await assert.rejects(grade(dir), /Timeout|abort/i);
    const { server } = await import(pathToFileURL(candidate));
    assert.equal(server.listening, false);
  },
);

test('cold-start fixture runs existing HTTP tests but fails the new product oracle', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-cold-oracle-'));
  await cp(join(root, 'evals/fixtures/noticeboard'), dir, { recursive: true });
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const baseline = spawnSync(process.execPath, ['--test', 'test/api.test.mjs'], {
    cwd: join(dir, 'service'),
    encoding: 'utf8',
    env,
  });
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  const result = await grade(dir);
  assert.equal(result.passed, false);
  assert.equal(result.scenarios, 12);
  assert.ok(result.results.every((r) => r.passed === false));
});

test('cold-start oracle accepts a compatible implementation and rejects exclusive-start regression', async () => {
  // Evaluator control only. This implementation is never copied to raw task inputs.
  for (const inclusive of [true, false]) {
    const dir = await mkdtemp(join(tmpdir(), 'clinx-oracle-control-'));
    await cp(join(root, 'evals/fixtures/noticeboard'), dir, { recursive: true });
    const serverPath = join(dir, 'service/src/server.mjs');
    await put(
      serverPath,
      (await readFile(serverPath, 'utf8')).replace(
        'listNotices(notices)',
        'listNotices(notices, now().getTime())',
      ),
    );
    await put(
      join(dir, 'service/src/catalog.mjs'),
      `export function listNotices(notices, now) {
      const items = notices.filter(n => {
        const start = n.startsAt == null ? -Infinity : Date.parse(n.startsAt);
        const end = n.endsAt == null ? Infinity : Date.parse(n.endsAt);
        return n.published === true && start < end && start ${inclusive ? '<=' : '<'} now && now < end;
      });
      return { items, total: items.length };
    }`,
    );
    assert.equal((await grade(dir)).passed, inclusive);
  }
});
