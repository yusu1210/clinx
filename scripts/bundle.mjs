import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertPublicFile } from './release-scan.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output' || !args[1].trim()))
  throw new Error('Usage: npm run bundle -- [--output NEW_DIRECTORY]');
if (!/^[a-z0-9-]+$/.test(manifest.name) || !/^[0-9A-Za-z.-]+$/.test(manifest.version))
  throw new Error('Unsafe release artifact name');
const destination = resolve(
  args[1] ?? join(root, 'artifacts', `${manifest.name}-${manifest.version}`),
);
// Never replace an existing release candidate. Each directory is one reviewed bundle.
await mkdir(resolve(destination, '..'), { recursive: true });
await mkdir(destination, { mode: 0o700 });
const run = (command, argv) => {
  const result = spawnSync(command, argv, {
    cwd: root,
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stderr || result.error || result.stdout}`);
  return result.stdout;
};
const [pack] = JSON.parse(
  run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination]),
);
// Stage only reviewed packaged Skill files; never archive a whole mutable local folder.
const stage = await mkdtemp(join(tmpdir(), 'clinx-skill-bundle-'));
for (const file of pack.files) {
  const content = await assertPublicFile(join(root, file.path), file.path);
  if (run('tar', ['-xOf', join(destination, pack.filename), 'package/' + file.path]) !== content)
    throw new Error(
      'Source changed while bundling: ' + file.path + '; prepare a new candidate after inspection',
    );
  if (/^skills\/clinx-(delivery|knowledge)\//.test(file.path)) {
    const path = join(stage, file.path.slice('skills/'.length));
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
  }
}
const files = [pack.filename];
for (const name of ['clinx-delivery', 'clinx-knowledge']) {
  const archive = `${name}-${manifest.version}.tar.gz`;
  run('tar', ['-czf', join(destination, archive), '-C', stage, name]);
  files.push(archive);
}
const checksums = await Promise.all(
  files.map(
    async (file) =>
      `${createHash('sha256')
        .update(await readFile(join(destination, file)))
        .digest('hex')}  ${basename(file)}`,
  ),
);
await writeFile(join(destination, 'SHA256SUMS'), checksums.join('\n') + '\n', {
  flag: 'wx',
  mode: 0o600,
});
process.stdout.write(
  `Prepared local release candidate: ${destination}\n${[...files, 'SHA256SUMS'].map((file) => `  ${file}`).join('\n')}\nNo upload, tag, registry publication or global installation was performed.\nChecksums establish byte integrity, not publisher authenticity.\n`,
);
