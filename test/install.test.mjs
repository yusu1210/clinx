import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, symlink, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, cli, put, json } from './helpers.mjs';
import { sha256 } from '../dist/files.js';

const entry = 'clinx/agent-entry.md';
const skill = '.agents/skills/clinx-delivery/SKILL.md';
const record = 'clinx/installation.json';
const fresh = () => mkdtemp(join(tmpdir(), 'clinx-lifecycle-'));
const saved = async (dir) => JSON.parse(await readFile(join(dir, record), 'utf8'));
// Use current runtime with earlier assets/version; this is not a historical release replay.
async function simulatedPriorPackage() {
  const directory = await fresh();
  for (const name of ['bin', 'dist', 'skills', 'templates'])
    await cp(join(root, name), join(directory, name), { recursive: true });
  await symlink(join(root, 'node_modules'), join(directory, 'node_modules'));
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  await json(join(directory, 'package.json'), { ...manifest, version: '0.1.0-test.0' });
  await put(join(directory, 'skills/clinx-delivery/SKILL.md'), 'Earlier packaged skill\n');
  await put(join(directory, 'skills/clinx-delivery/retired.md'), 'Earlier packaged reference\n');
  await put(join(directory, 'templates/workspace', entry), 'Earlier packaged entry\n');
  return directory;
}
const runOld = (packageRoot, dir) =>
  spawnSync(
    process.execPath,
    [
      join(packageRoot, 'bin/clinx.mjs'),
      'init',
      '--root',
      dir,
      '--agent',
      'codex',
      '--apply',
      '--json',
    ],
    { encoding: 'utf8', timeout: 15000 },
  );

test('install records created ownership without taking over identical existing files', async () => {
  const dir = await fresh();
  const original = await readFile(join(root, 'templates/workspace', entry));
  await put(join(dir, entry), original);
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  const installation = await saved(dir);
  assert.equal(installation.files.find((f) => f.path === entry).owned, false);
  assert.equal(installation.files.find((f) => f.path === skill).owned, true);
  for (const file of installation.files)
    assert.equal(sha256(await readFile(join(dir, file.path))), file.sha256);
  assert.equal(cli(dir, 'skill', 'status').out.matchesPackage, true);
  const before = await readFile(join(dir, record), 'utf8');
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  assert.equal(await readFile(join(dir, record), 'utf8'), before);
  assert.equal(cli(dir, 'init', '--apply').status, 0);
});
test('Skill upgrades preserve the installed baseline of a simulated prior package', async () => {
  const old = await simulatedPriorPackage();
  const dir = await fresh();
  const installed = runOld(old, dir);
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal((await saved(dir)).packageVersion, '0.1.0-test.0');
  const before = await readFile(join(dir, record));
  const status = cli(dir, 'skill', 'status');
  assert.equal(status.out.installedVersion, '0.1.0-test.0');
  assert.equal(status.out.matchesPackage, false);
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 3);
  const preview = cli(dir, 'skill', 'update');
  assert.equal(preview.status, 0, preview.err);
  assert.ok(preview.out.files.some((f) => f.path === skill && f.status === 'update'));
  assert.ok(preview.out.files.some((f) => f.path.endsWith('/retired.md') && f.status === 'remove'));
  assert.deepEqual(await readFile(join(dir, record)), before);
  const result = cli(dir, 'skill', 'update', '--apply');
  assert.equal(result.status, 0, result.err);
  assert.equal(
    await readFile(join(dir, result.out.backup, skill), 'utf8'),
    'Earlier packaged skill\n',
  );
  assert.deepEqual(await readFile(join(dir, result.out.backup, record)), before);
  assert.equal(cli(dir, 'skill', 'status').out.matchesPackage, true);
  const again = cli(dir, 'skill', 'update', '--apply');
  assert.equal(again.status, 0, again.err);
  assert.equal(again.out.backup, null);
});
test('modified managed files block every planned update and removal, without force', async () => {
  const old = await simulatedPriorPackage();
  const dir = await fresh();
  assert.equal(runOld(old, dir).status, 0);
  await put(join(dir, skill), 'Local edit that must survive');
  const before = await readFile(join(dir, record));
  const status = cli(dir, 'skill', 'status');
  assert.equal(status.out.files.find((f) => f.path === skill).local, 'modified');
  for (const action of ['update', 'remove']) {
    const preview = cli(dir, 'skill', action);
    assert.ok(preview.out.files.some((f) => f.path === skill && f.status === 'conflict'));
    const result = cli(dir, 'skill', action, '--apply');
    assert.equal(result.status, 3);
    assert.equal(JSON.parse(result.err).code, 'INSTALLATION_CONFLICT');
    assert.equal(await readFile(join(dir, entry), 'utf8'), 'Earlier packaged entry\n');
    assert.equal(await readFile(join(dir, skill), 'utf8'), 'Local edit that must survive');
    assert.deepEqual(await readFile(join(dir, record)), before);
  }
  assert.equal(cli(dir, 'skill', 'update', '--apply', '--force').status, 3);
});
test('removal preserves user files, task data and original files in recoverable backups', async () => {
  const dir = await fresh();
  const borrowed = await readFile(join(root, 'templates/workspace', entry));
  await put(join(dir, entry), borrowed);
  await put(join(dir, 'AGENTS.md'), 'Existing rules');
  assert.equal(cli(dir, 'init', '--agent', 'codex', '--apply').status, 0);
  await put(join(dir, '.agents/skills/clinx-delivery/local.md'), 'Unmanaged note');
  await put(join(dir, 'clinx/tasks/user/notes.md'), 'Task data');
  const before = await readFile(join(dir, record));
  assert.equal(cli(dir, 'skill', 'remove').out.applied, false);
  assert.deepEqual(await readFile(join(dir, record)), before);
  const result = cli(dir, 'skill', 'remove', '--apply');
  assert.equal(result.status, 0, result.err);
  assert.deepEqual(
    await readdir(join(dir, '.agents/skills/clinx-delivery')).then((names) =>
      names.filter((n) => n.endsWith('.md')),
    ),
    ['local.md'],
  );
  assert.deepEqual(await readFile(join(dir, entry)), borrowed);
  assert.equal(await readFile(join(dir, 'AGENTS.md'), 'utf8'), 'Existing rules');
  assert.equal(await readFile(join(dir, 'clinx/tasks/user/notes.md'), 'utf8'), 'Task data');
  assert.equal(cli(dir, 'skill', 'status').out.managed, false);
  assert.deepEqual(await readFile(join(dir, result.out.backup, record)), before);
  assert.match(await readFile(join(dir, result.out.backup, skill), 'utf8'), /name: clinx-delivery/);
});
test('missing managed files can be restored, while unmanaged files are never silently adopted', async () => {
  const dir = await fresh();
  await put(join(dir, entry), await readFile(join(root, 'templates/workspace', entry)));
  cli(dir, 'init', '--agent', 'codex', '--apply');
  await unlink(join(dir, skill));
  await put(join(dir, entry), 'User-owned change');
  const update = cli(dir, 'skill', 'update', '--apply');
  assert.equal(update.status, 0, update.err);
  assert.equal(await readFile(join(dir, entry), 'utf8'), 'User-owned change');
  assert.equal(cli(dir, 'skill', 'status').out.matchesPackage, false);
  assert.match(await readFile(join(dir, skill), 'utf8'), /name: clinx-delivery/);
});
test('unmanaged, corrupt, escaping, duplicate and symlinked installation records fail safely', async () => {
  const dir = await fresh();
  assert.equal(cli(dir, 'skill', 'status').out.managed, false);
  assert.equal(cli(dir, 'skill', 'update', '--apply').status, 3);
  assert.deepEqual(await readdir(dir), []);
  cli(dir, 'init', '--agent', 'codex', '--apply');
  const original = await saved(dir);
  for (const path of [
    'AGENTS.md',
    '../outside',
    '.agents/skills/clinx-delivery/../outside',
    '.agents/skills/clinx-delivery/./SKILL.md',
  ]) {
    await json(join(dir, record), { ...original, files: [{ ...original.files[0], path }] });
    assert.equal(cli(dir, 'skill', 'remove', '--apply').status, 3);
    assert.match(await readFile(join(dir, skill), 'utf8'), /name: clinx-delivery/);
  }
  await json(join(dir, record), { ...original, files: [original.files[0], original.files[0]] });
  assert.equal(cli(dir, 'skill', 'status').status, 3);
  await put(join(dir, record), '{"private":"do-not-print-me"');
  assert.doesNotMatch(cli(dir, 'skill', 'status').err, /do-not-print-me/);
  await json(join(dir, record), original);
  await unlink(join(dir, skill));
  await symlink(join(root, 'skills/clinx-delivery/SKILL.md'), join(dir, skill));
  assert.equal(cli(dir, 'skill', 'update', '--apply').status, 3);
});
test('write failures roll back completed changes without discarding original backups', async () => {
  const old = await simulatedPriorPackage();
  const dir = await fresh();
  assert.equal(runOld(old, dir).status, 0);
  const original = await readFile(join(dir, record));
  const hook = join(await fresh(), 'fault.mjs');
  await put(
    hook,
    `import {promises as fs} from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; const rename = fs.rename; let failed = false; fs.rename = async (from,to) => { if (!failed && to.endsWith('/clinx/agent-entry.md')) { failed = true; throw new Error('injected storage failure'); } return rename(from,to); }; syncBuiltinESMExports();`,
  );
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      hook,
      join(root, 'bin/clinx.mjs'),
      'skill',
      'update',
      '--root',
      dir,
      '--apply',
      '--json',
    ],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(result.status, 3);
  assert.equal(JSON.parse(result.stderr).code, 'INSTALLATION_WRITE_FAILED');
  assert.equal(await readFile(join(dir, skill), 'utf8'), 'Earlier packaged skill\n');
  assert.deepEqual(await readFile(join(dir, record)), original);
  assert.equal(cli(dir, 'skill', 'update', '--apply').status, 0);
});
