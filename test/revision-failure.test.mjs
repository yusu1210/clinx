import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fixture, contract } from './helpers.mjs';
import { openWorkspace } from '../dist/workspace.js';
import { reviseTask } from '../dist/task.js';

test('failed contract replacement removes only this attempt history and preserves the primary error', async () => {
  for (const mode of [
    'replace-failure',
    'cleanup-failure',
    'external-history-edit',
    'external-history-replacement',
  ]) {
    const dir = await fs.realpath(await fixture());
    const taskDir = join(dir, 'clinx/tasks/change');
    const current = join(taskDir, 'contract.json');
    const before = await fs.readFile(current);
    const originalRename = fs.rename;
    const originalUnlink = fs.unlink;
    fs.rename = async (from, to) => {
      if (to === current) {
        if (mode.startsWith('external-history-')) {
          const [name] = (await fs.readdir(join(taskDir, 'revisions'))).filter((n) =>
            n.endsWith('.json'),
          );
          const path = join(taskDir, 'revisions', name);
          if (mode === 'external-history-edit') await fs.writeFile(path, 'external edit');
          else {
            await fs.writeFile(path + '.replacement', await fs.readFile(path));
            await originalRename(path + '.replacement', path);
          }
        }
        throw new Error('injected replacement failure');
      }
      return originalRename(from, to);
    };
    fs.unlink = async (path) => {
      if (
        mode === 'cleanup-failure' &&
        String(path).includes('/revisions/') &&
        String(path).endsWith('.json')
      )
        throw new Error('injected cleanup failure');
      return originalUnlink(path);
    };
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        reviseTask(
          await openWorkspace(dir),
          'change',
          { ...contract(), outcome: 'Changed' },
          'fixture',
        ),
        (error) => {
          assert.match(String(error), /injected replacement failure/);
          if (mode !== 'replace-failure') assert.match(String(error), /cleanup incomplete/);
          return true;
        },
      );
    } finally {
      fs.rename = originalRename;
      fs.unlink = originalUnlink;
      syncBuiltinESMExports();
    }
    assert.deepEqual(await fs.readFile(current), before);
    const names = await fs.readdir(join(taskDir, 'revisions'));
    assert.equal(names.length, mode === 'replace-failure' ? 0 : 1);
    if (mode === 'external-history-edit')
      assert.equal(
        await fs.readFile(join(taskDir, 'revisions', names[0]), 'utf8'),
        'external edit',
      );
    assert.deepEqual((await fs.readdir(taskDir)).sort(), ['contract.json', 'revisions']);
    await assert.rejects(fs.stat(join(dir, '.clinx/write.lock')), { code: 'ENOENT' });
  }
});

test('cleanup failure after the revision commit reports replacement without undoing it', async () => {
  const dir = await fs.realpath(await fixture());
  const taskDir = join(dir, 'clinx/tasks/change');
  const originalUnlink = fs.unlink;
  fs.unlink = async (path) => {
    if (
      String(path).includes('/revisions/.') &&
      !String(path).includes('.clinx-write-') &&
      String(path).endsWith('.tmp')
    )
      throw new Error('injected staged cleanup failure');
    return originalUnlink(path);
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(
      reviseTask(
        await openWorkspace(dir),
        'change',
        { ...contract(), outcome: 'Committed' },
        'fixture',
      ),
      /Contract replaced; revision cleanup incomplete.*injected staged cleanup failure/,
    );
  } finally {
    fs.unlink = originalUnlink;
    syncBuiltinESMExports();
  }
  assert.equal(
    JSON.parse(await fs.readFile(join(taskDir, 'contract.json'), 'utf8')).outcome,
    'Committed',
  );
  const names = await fs.readdir(join(taskDir, 'revisions'));
  assert.equal(names.filter((n) => n.endsWith('.json')).length, 1);
  assert.equal(names.filter((n) => n.endsWith('.tmp')).length, 1);
  await assert.rejects(fs.stat(join(dir, '.clinx/write.lock')), { code: 'ENOENT' });
});

test('an uncertain rename outcome retains history even if replacement became visible', async () => {
  for (const visible of [false, true]) {
    const dir = await fs.realpath(await fixture());
    const taskDir = join(dir, 'clinx/tasks/change');
    const current = join(taskDir, 'contract.json');
    const originalRename = fs.rename;
    fs.rename = async (from, to) => {
      if (to === current) {
        if (visible) await originalRename(from, to);
        throw Object.assign(new Error('injected I/O error'), { code: 'EIO' });
      }
      return originalRename(from, to);
    };
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        reviseTask(
          await openWorkspace(dir),
          'change',
          { ...contract(), outcome: 'Possibly replaced' },
          'fixture',
        ),
        /injected I\/O error.*Replacement outcome uncertain/,
      );
    } finally {
      fs.rename = originalRename;
      syncBuiltinESMExports();
    }
    assert.equal(
      JSON.parse(await fs.readFile(current, 'utf8')).outcome,
      visible ? 'Possibly replaced' : contract().outcome,
    );
    assert.equal((await fs.readdir(join(taskDir, 'revisions'))).length, 1);
  }
});
