import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { copyExample, cli, put } from './helpers.mjs';

test('real full-stack example verifies HTTP and persistence, not browser approval', async () => {
  const dir = await copyExample('reading-list');
  const result = cli(dir, 'verify', 'reading-list', '--run');
  assert.equal(result.status, 0, result.err || JSON.stringify(result.out));
  assert.equal(result.out.verdict.decision, 'supported');
  const receipt = JSON.parse(await readFile(join(dir, result.out.receipt), 'utf8'));
  assert.equal(receipt.checks[0].summary.passed, 10);
  const wider = cli(dir, 'verify', 'reading-list', '--claim', 'local-product', '--run');
  assert.equal(wider.status, 2);
  assert.equal(
    wider.out.verdict.obligations.find((o) => o.id === 'browser-journey').disposition,
    'unresolved',
  );
  const file = join(dir, 'server.mjs');
  const source = await readFile(file, 'utf8');
  const broken = source.replace("if (role !== 'librarian')", "if (false && role !== 'librarian')");
  assert.notEqual(source, broken, 'Negative control must change the actual permission check');
  await put(file, broken);
  const failed = cli(dir, 'verify', 'reading-list', '--run');
  assert.equal(failed.status, 1);
  assert.equal(failed.out.verdict.checks[0].observation, 'fail');
});
