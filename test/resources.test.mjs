import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, stat, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { root, put } from './helpers.mjs';

async function isolatedResources() {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-resource-package-'));
  await cp(join(root, 'dist'), join(dir, 'dist'), { recursive: true });
  await cp(join(root, 'package.json'), join(dir, 'package.json'));
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  const source = join(dir, 'examples/multi-source');
  await mkdir(source, { recursive: true });
  return { dir, source, module: await import(pathToFileURL(join(dir, 'dist/resources.js')).href) };
}

test('example copy excludes nested local state and retains executable wrapper behavior', async () => {
  const { dir, source, module } = await isolatedResources();
  await put(join(source, 'workspace/PRD.md'), 'An original requirement');
  await put(join(source, 'service/mvnw'), '#!/bin/sh\nexit 0\n');
  await chmod(join(source, 'service/mvnw'), 0o755);
  for (const path of [
    'workspace/clinx/installation.json',
    'workspace/clinx/agent-entry.md',
    'workspace/clinx/install-backups/old/SKILL.md',
    'workspace/clinx/skills/clinx-delivery/SKILL.md',
    'workspace/.agents/skills/clinx-delivery/SKILL.md',
    'workspace/clinx/tasks/change/checkpoints/00000001.json',
    'workspace/clinx/tasks/change/revisions/old.json',
    'service/.env.local',
    'service/.clinx/runs/local.json',
  ])
    await put(join(source, path), 'local-only');
  const target = join(dir, 'copy');
  const copied = await module.copyExample('multi-source', target);
  assert.equal(copied.files, 2);
  assert.equal(copied.executed, false);
  assert.deepEqual((await readdir(join(target, 'workspace'))).sort(), ['PRD.md']);
  assert.deepEqual(await readdir(join(target, 'service')), ['mvnw']);
  assert.equal((await stat(join(target, 'service/mvnw'))).mode & 0o700, 0o700);
  assert.equal(await readFile(join(target, 'service/mvnw'), 'utf8'), '#!/bin/sh\nexit 0\n');
});

test('example copy bounds empty directory trees and rejects symlinks before writing', async () => {
  const { dir, source, module } = await isolatedResources();
  const outside = join(dir, 'outside.txt');
  await put(outside, 'not-an-example');
  await symlink(outside, join(source, 'linked.txt'));
  await assert.rejects(
    module.copyExample('multi-source', join(dir, 'copy')),
    /Unsupported packaged example/,
  );
  await assert.rejects(stat(join(dir, 'copy')), { code: 'ENOENT' });
  const other = await isolatedResources();
  for (let index = 0; index < 513; index++) await mkdir(join(other.source, String(index)));
  await assert.rejects(
    other.module.copyExample('multi-source', join(other.dir, 'copy')),
    /copy entry limit/,
  );
  await assert.rejects(stat(join(other.dir, 'copy')), { code: 'ENOENT' });
});
