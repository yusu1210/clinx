import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { put, json } from './helpers.mjs';
import { checkTranslations, translationSnapshot } from '../scripts/translations.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'clinx-translations-'));
  await mkdir(join(root, 'docs/en'), { recursive: true });
  await mkdir(join(root, 'docs/zh-CN'));
  await put(join(root, 'docs/README.md'), '[English](en/README.md) / [中文](zh-CN/README.md)');
  await mkdir(join(root, 'examples/demo'), { recursive: true });
  await put(join(root, 'README.md'), '[中文](README.zh-CN.md)\nEnglish behavior\n');
  await put(join(root, 'README.zh-CN.md'), '[English](README.md)\n中文行为\n');
  await put(join(root, 'AGENTS.md'), 'Agent-only instructions');
  await json(join(root, 'docs/translations.json'), await translationSnapshot(root));
  return root;
}

test('translation review tracks exact paired bytes without changing files', async () => {
  const root = await fixture();
  const before = await readFile(join(root, 'docs/translations.json'), 'utf8');
  assert.equal(await checkTranslations(root), 1);
  assert.equal(await readFile(join(root, 'docs/translations.json'), 'utf8'), before);
});

test('source-only, translation-only and simultaneous edits all require explicit pair review', async () => {
  for (const names of [['README.md'], ['README.zh-CN.md'], ['README.md', 'README.zh-CN.md']]) {
    const root = await fixture();
    for (const name of names)
      await put(join(root, name), (await readFile(join(root, name), 'utf8')) + 'changed\n');
    await assert.rejects(checkTranslations(root), /Translation review required/);
    await json(join(root, 'docs/translations.json'), await translationSnapshot(root));
    assert.equal(await checkTranslations(root), 1);
  }
});

test('translation inventory discovers new public guides and examples and rejects missing pairs', async () => {
  const root = await fixture();
  await put(join(root, 'examples/demo/README.md'), '[中文](README.zh-CN.md)');
  await assert.rejects(translationSnapshot(root), /ENOENT/);
  await put(join(root, 'examples/demo/README.zh-CN.md'), '[English](README.md)');
  await assert.rejects(checkTranslations(root), /inventory changed/);
  await json(join(root, 'docs/translations.json'), await translationSnapshot(root));
  assert.equal(await checkTranslations(root), 2);
  await unlink(join(root, 'examples/demo/README.md'));
  await assert.rejects(checkTranslations(root), /Unpaired translation/);
});

test('translation records reject unsupported structure, duplicate entries and unsafe path substitutions', async () => {
  const root = await fixture();
  const original = await translationSnapshot(root);
  for (const mutate of [
    (r) => {
      r.version = 2;
    },
    (r) => {
      r.extra = true;
    },
    (r) => {
      r.pairs = null;
    },
    (r) => {
      r.pairs[0].source = '../outside.md';
    },
    (r) => {
      r.pairs[0].translation = '../outside.md';
    },
    (r) => {
      r.pairs[0].extra = true;
    },
    (r) => {
      r.pairs[0].sourceSha256 = 'not-a-hash';
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    await json(join(root, 'docs/translations.json'), changed);
    await assert.rejects(checkTranslations(root));
  }
  await put(join(root, 'docs/en/guide.md'), '[中文](../zh-CN/guide.md)');
  await put(join(root, 'docs/zh-CN/guide.md'), '[English](../en/guide.md)');
  const duplicate = await translationSnapshot(root);
  duplicate.pairs[1] = duplicate.pairs[0];
  await json(join(root, 'docs/translations.json'), duplicate);
  await assert.rejects(checkTranslations(root), /Duplicate/);
});

test('language navigation and removal cannot be hidden by refreshing translation hashes', async () => {
  const root = await fixture();
  await put(join(root, 'README.md'), 'Missing Chinese link');
  await assert.rejects(translationSnapshot(root), /Missing language link/);
  await put(join(root, 'README.md'), '[中文](README.zh-CN.md)');
  await put(join(root, 'README.zh-CN.md'), 'Missing English link');
  await assert.rejects(translationSnapshot(root), /Missing language link/);
  await unlink(join(root, 'README.md'));
  await unlink(join(root, 'README.zh-CN.md'));
  await assert.rejects(checkTranslations(root), /inventory changed/);
});

test('paired guides keep the same code-block sequence', async () => {
  const root = await fixture();
  await put(join(root, 'README.md'), '[中文](README.zh-CN.md)\n```sh\nclinx status\n```\n');
  await assert.rejects(translationSnapshot(root), /Code-block mismatch/);
  await put(join(root, 'README.zh-CN.md'), '[English](README.md)\n```sh\nclinx status\n```\n');
  await json(join(root, 'docs/translations.json'), await translationSnapshot(root));
  assert.equal(await checkTranslations(root), 1);
});

test('language directories pair nested guides and reject orphan or flat guides', async () => {
  const root = await fixture();
  await put(join(root, 'docs/en/tutorial/first.md'), '[中文](../../zh-CN/tutorial/first.md)');
  await assert.rejects(translationSnapshot(root), /Unpaired translation/);
  await put(join(root, 'docs/zh-CN/tutorial/first.md'), '[English](../../en/tutorial/first.md)');
  await json(join(root, 'docs/translations.json'), await translationSnapshot(root));
  assert.equal(await checkTranslations(root), 2);
  await put(join(root, 'docs/obsolete.md'), 'Old flat guide');
  await assert.rejects(translationSnapshot(root), /Keep guides/);
});
