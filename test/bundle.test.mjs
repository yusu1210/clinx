import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { root, put } from './helpers.mjs';

test('release bundles preserve exact packaged Skill bytes and never overwrite a candidate', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'clinx-bundle-test-'));
  const destination = join(parent, 'candidate');
  const run = (command, args) =>
    spawnSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 12 * 1024 * 1024,
    });
  const script = join(root, 'scripts/bundle.mjs');
  const built = run(process.execPath, [script, '--output', destination]);
  assert.equal(built.status, 0, built.stderr || built.stdout);
  assert.match(built.stdout, /No upload, tag, registry publication or global installation/);
  const checksums = await readFile(join(destination, 'SHA256SUMS'), 'utf8');
  const files = checksums
    .trim()
    .split('\n')
    .map((line) => {
      assert.match(line, /^[a-f0-9]{64}  [a-z0-9.-]+$/);
      const [hash, file] = line.split('  ');
      return { hash, file };
    });
  assert.equal(files.length, 3);
  assert.deepEqual(
    (await readdir(destination)).sort(),
    [...files.map(({ file }) => file), 'SHA256SUMS'].sort(),
  );
  for (const { hash, file } of files)
    assert.equal(
      createHash('sha256')
        .update(await readFile(join(destination, file)))
        .digest('hex'),
      hash,
    );
  const cli = join(destination, files.find(({ file }) => file.endsWith('.tgz')).file);
  const list = (archive) => {
    const result = run('tar', ['-tzf', archive]);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout
      .trim()
      .split('\n')
      .filter((path) => !path.endsWith('/'))
      .sort();
  };
  for (const name of ['clinx-delivery', 'clinx-knowledge']) {
    const skill = join(
      destination,
      files.find(({ file }) => file.startsWith(name + '-') && file.endsWith('.tar.gz')).file,
    );
    const expected = list(cli)
      .filter((path) => path.startsWith(`package/skills/${name}/`))
      .map((path) => path.slice('package/skills/'.length));
    assert.deepEqual(list(skill), expected);
    assert.ok(expected.includes(name + '/LICENSE'));
    assert.ok(expected.includes(name + '/references/knowledge.md'));
    for (const path of expected) {
      const a = run('tar', ['-xOf', cli, 'package/skills/' + path]);
      const b = run('tar', ['-xOf', skill, path]);
      assert.equal(a.status, 0, a.stderr);
      assert.equal(b.status, 0, b.stderr);
      assert.equal(a.stdout, b.stdout, path);
    }
  }
  const repeated = run(process.execPath, [script, '--output', destination]);
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /EEXIST/);
  assert.equal(await readFile(join(destination, 'SHA256SUMS'), 'utf8'), checksums);
  for (const args of [['--output', ''], ['--unknown', 'value'], ['--output']])
    assert.match(run(process.execPath, [script, ...args]).stderr, /Usage:/);
});

test('release bundling refuses packaged local state before producing a shareable bundle', async () => {
  const isolated = await mkdtemp(join(tmpdir(), 'clinx-contaminated-bundle-'));
  await mkdir(join(isolated, 'scripts'));
  for (const file of ['bundle.mjs', 'release-scan.mjs'])
    await cp(join(root, 'scripts', file), join(isolated, 'scripts', file));
  await put(
    join(isolated, 'package.json'),
    JSON.stringify({
      name: 'clinx',
      version: '0.0.0-test',
      private: true,
      type: 'module',
      files: ['examples', 'skills'],
    }),
  );
  const local = 'examples/demo/workspace/clinx/installation.json';
  await put(join(isolated, local), JSON.stringify({ localOnly: true }));
  await put(join(isolated, 'skills/clinx-delivery/SKILL.md'), 'Original public instructions');
  const destination = join(isolated, 'candidate');
  const result = spawnSync(
    process.execPath,
    [join(isolated, 'scripts/bundle.mjs'), '--output', destination],
    {
      cwd: isolated,
      encoding: 'utf8',
      timeout: 120000,
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Public-file review required: .*installation\.json \[local-skill-installation\]/,
  );
  assert.ok(!result.stdout.includes('Prepared local release candidate'));
  await assert.rejects(stat(join(destination, 'SHA256SUMS')), { code: 'ENOENT' });
  await assert.rejects(stat(join(destination, 'clinx-delivery-0.0.0-test.tar.gz')), {
    code: 'ENOENT',
  });
  // Failed local artifacts remain for inspection, never receive release checksums or upload.
  assert.deepEqual(await readdir(destination), ['clinx-0.0.0-test.tgz']);
});
