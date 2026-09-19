import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, symlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.mjs';

test('script entrypoints execute through a symlinked checkout instead of silently doing nothing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-entry-'));
  const alias = join(dir, 'reviewed checkout');
  await symlink(root, alias);
  const run = (script, args = []) =>
    spawnSync(process.execPath, [join(alias, script), ...args], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 15000,
    });
  for (const script of ['evals/context/prepare.mjs', 'evals/knowledge/prepare.mjs']) {
    const result = run(script);
    assert.equal(result.status, 0, result.stderr);
    const prepared = JSON.parse(result.stdout);
    await readFile(join(prepared.workspace, 'README.md'));
    assert.equal(
      JSON.parse(await readFile(prepared.evaluator, 'utf8')).status,
      'prepared-not-evaluated',
    );
  }
  const grade = run('evals/grade-cold-start.mjs', [join(alias, 'evals/fixtures/noticeboard')]);
  assert.equal(grade.status, 1, grade.stderr);
  assert.equal(JSON.parse(grade.stdout).passed, false);
  const translations = run('scripts/translations.mjs', ['--snapshot']);
  assert.equal(translations.status, 0, translations.stderr);
  assert.ok(JSON.parse(translations.stdout).pairs.length > 0);
  // Invalid input must be rejected; a silent exit zero would miss the CLI guard.
  for (const script of ['scripts/translations.mjs', 'scripts/sync-skills.mjs']) {
    const result = run(script, ['--unknown']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage:/);
  }
});
