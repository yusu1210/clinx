import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, symlink, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixture, cli } from './helpers.mjs';

test('receipt paths accept the selected workspace alias without accepting inner symlinks or escapes', async () => {
  const target = await realpath(await fixture());
  const parent = await mkdtemp(join(tmpdir(), 'clinx-root-alias-'));
  const alias = join(parent, 'workspace');
  await symlink(target, alias, 'dir');
  const run = cli(alias, 'verify', 'change', '--run');
  assert.equal(run.status, 0, run.err);
  for (const receipt of [
    run.out.receipt,
    join(alias, run.out.receipt),
    join(target, run.out.receipt),
  ]) {
    const read = cli(alias, 'reconcile', 'change', '--receipt', receipt);
    assert.equal(read.status, 0, read.err);
    assert.equal(read.out.verdict.applicability, 'current');
  }
  const indirect = join(target, 'indirect.json');
  await symlink(join(target, run.out.receipt), indirect);
  const inner = cli(alias, 'reconcile', 'change', '--receipt', join(alias, 'indirect.json'));
  assert.equal(inner.status, 3);
  assert.match(inner.err, /Symlink/);
  const outside = cli(alias, 'reconcile', 'change', '--receipt', join(alias, '..', 'outside.json'));
  assert.equal(outside.status, 3);
  assert.match(outside.err, /escapes/);
});
