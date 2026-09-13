import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { root, cli, json, put } from './helpers.mjs';

test('hands-on guide JSON runs the documented task without treating passing old tests as product acceptance', async () => {
  const blocks = async (language) =>
    [
      ...(await readFile(join(root, `docs/${language}/hands-on.md`), 'utf8')).matchAll(
        /```json\n([\s\S]*?)\n```/g,
      ),
    ].map((match) => JSON.parse(match[1]));
  const english = await blocks('en');
  assert.deepEqual(await blocks('zh-CN'), english);
  assert.equal(english.length, 3);
  const [config, task, note] = english;
  const dir = await mkdtemp(join(tmpdir(), 'clinx-hands-on-'));
  await cp(join(root, 'evals/fixtures/noticeboard'), dir, { recursive: true });
  const preview = cli(dir, 'init', '--agent', 'codex');
  assert.equal(preview.status, 0, preview.err);
  await assert.rejects(access(join(dir, '.agents')), /ENOENT/);
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  await access(join(dir, '.agents/skills/clinx-delivery/SKILL.md'));
  await access(join(dir, 'clinx/agent-entry.md'));
  await json(join(dir, 'clinx.config.json'), config);
  await json(join(dir, 'proposal.json'), task);
  assert.equal(cli(dir, 'task', 'add', '--file', join(dir, 'proposal.json')).status, 0);
  assert.equal(cli(dir, 'validate', task.id).status, 0);
  assert.equal(cli(dir, 'context', task.id, '--focus', 'verify').status, 0);
  assert.equal(cli(dir, 'verify', task.id).status, 0);
  const run = cli(dir, 'verify', task.id, '--run');
  assert.equal(run.status, 0, run.err);
  assert.equal(run.out.verdict.decision, 'supported');
  const product = cli(dir, 'verify', task.id, '--claim', 'local-product', '--run');
  assert.equal(product.status, 2, product.err);
  assert.equal(product.out.verdict.decision, 'unresolved');
  await json(join(dir, 'resume.json'), note);
  assert.equal(
    cli(dir, 'task', 'checkpoint', task.id, '--file', join(dir, 'resume.json')).status,
    0,
  );
  assert.equal(cli(dir, 'context', task.id).out.continuity, 'inputs-match');
  assert.equal(cli(dir, 'reconcile', task.id, '--receipt', run.out.receipt).status, 0);
  const path = join(dir, 'viewer/public/board.js');
  await put(path, (await readFile(path, 'utf8')) + '\n// Changed consumer for drift regression.\n');
  assert.equal(
    cli(dir, 'reconcile', task.id, '--receipt', run.out.receipt).out.verdict.applicability,
    'stale',
  );
});
