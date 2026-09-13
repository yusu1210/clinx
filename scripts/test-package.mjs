import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, delimiter, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { root } from '../test/helpers.mjs';
import { createRequire } from 'node:module';
import { assertPublicFile, releaseFindings } from './release-scan.mjs';

const temp = await mkdtemp(join(tmpdir(), 'clinx-package-'));
const run = (command, args, cwd) => {
  if (command.endsWith('/.bin/clinx') && !args.includes('--version') && !args.includes('--help'))
    args = [...args, '--json'];
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  return result.stdout;
};
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--tarball' || !args[1].trim()))
  throw new Error('Usage: npm run test:package -- [--tarball PATH]');
// An explicit candidate is tested without repacking or modifying its bytes.
const built = args.length
  ? null
  : JSON.parse(
      run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], root),
    )[0];
const tarball = args.length ? resolve(args[1]) : join(temp, built.filename);
const digest = async () =>
  createHash('sha256')
    .update(await readFile(tarball))
    .digest('hex');
const beforeDigest = await digest();
const members = run('tar', ['-tzf', tarball], temp)
  .trim()
  .split('\n')
  .filter((path) => !path.endsWith('/'));
assert.equal(new Set(members).size, members.length, 'Duplicate archive members');
for (const path of members)
  assert.ok(
    path.startsWith('package/') &&
      path.split('/').every((part) => part && part !== '.' && part !== '..') &&
      !path.includes('\\'),
    'Unsafe archive member',
  );
const pack = { files: members.map((path) => ({ path: path.slice('package/'.length) })) };
for (const file of pack.files) {
  assert.deepEqual(releaseFindings(file.path, ''), [], file.path);
}
assert.ok(pack.files.some((f) => f.path === 'templates/workspace/clinx.config.json'));
assert.ok(pack.files.some((f) => f.path === 'skills/clinx-delivery/SKILL.md'));
assert.ok(pack.files.some((f) => f.path === 'npm-shrinkwrap.json'));
for (const path of [
  'skills/clinx-delivery/references/delivery.md',
  'skills/clinx-delivery/references/runtime.md',
  'skills/clinx-delivery/references/collaboration.md',
  'docs/en/collaboration.md',
  'docs/zh-CN/collaboration.md',
  'docs/en/hands-on.md',
  'docs/zh-CN/hands-on.md',
  'docs/en/workspace.md',
  'docs/zh-CN/workspace.md',
  'examples/multi-source/workspace/knowledge/system-map.md',
  'examples/multi-source/workspace/clinx/tasks/visible-notices/prd.md',
  'examples/multi-source/workspace/clinx/tasks/visible-notices/design.md',
  'skills/clinx-delivery/references/integration.md',
  'skills/clinx-delivery/LICENSE',
  'templates/workspace/clinx/system-map.md',
  'templates/workspace/clinx/local-guide.md',
  'templates/workspace/clinx/task-brief.md',
  'examples/reading-list/server.mjs',
  'examples/reading-list/public/app.js',
  'examples/reading-list/public/index.html',
  'examples/reading-list/public/style.css',
  'examples/reading-list/test/http.test.mjs',
  'evals/prepare.mjs',
  'evals/grade-cold-start.mjs',
  'evals/grade-bulk-reset.mjs',
  'evals/fixtures/bulk-reset/PRD.md',
  'evals/fixtures/bulk-reset/gateway.mjs',
  'evals/fixtures/noticeboard/service/src/server.mjs',
  'skills/clinx-delivery/references/cold-start.md',
  'schemas/evidence-input.schema.json',
])
  assert.ok(
    pack.files.some((f) => f.path === path),
    `Missing packaged asset: ${path}`,
  );
run(
  'npm',
  [
    'install',
    '--prefix',
    temp,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--registry=https://registry.npmjs.org',
    tarball,
  ],
  temp,
);
const binary = join(temp, 'node_modules/.bin/clinx');
const installed = join(temp, 'node_modules/clinx');
for (const file of pack.files) await assertPublicFile(join(installed, file.path), file.path);
const copyPackagedExample = async (name) => {
  const dir = await mkdtemp(join(tmpdir(), `clinx-package-${name}-`));
  await cp(join(installed, 'examples', name), dir, { recursive: true });
  return dir;
};
const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
const assertLockedRuntime = async (packageRoot) => {
  const lock = JSON.parse(await readFile(join(packageRoot, 'npm-shrinkwrap.json'), 'utf8'));
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path || entry.dev) continue;
    const boundary = path.lastIndexOf('node_modules/');
    const name = path.slice(boundary + 'node_modules/'.length);
    const require = createRequire(join(packageRoot, path.slice(0, boundary), 'package.json'));
    let actual;
    // Inspect npm's installed metadata without importing dependencies or requiring
    // a package.json subpath export (libraries need not expose that subpath).
    for (const base of require.resolve.paths(name) ?? []) {
      try {
        actual = JSON.parse(await readFile(join(base, name, 'package.json'), 'utf8'));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    assert.ok(actual, `Missing locked runtime dependency: ${name}`);
    assert.equal(
      actual.version,
      entry.version,
      `Installed version differs from release lock: ${name}`,
    );
  }
};
await assertLockedRuntime(installed);
assert.equal(run(binary, ['--version'], temp).trim(), manifest.version);
assert.equal(manifest.exports['.'], undefined);
assert.ok(!pack.files.some((f) => /^dist\/index\./.test(f.path)));
for (const file of pack.files.filter((f) => /^dist\/.*\.js$/.test(f.path))) {
  assert.ok(
    pack.files.some((f) => f.path === `${file.path}.map`),
    `Missing source map: ${file.path}`,
  );
  const map = JSON.parse(await readFile(join(installed, `${file.path}.map`), 'utf8'));
  for (const source of map.sources) await readFile(join(installed, 'dist', source));
}
const fixture = await copyPackagedExample('node-picker');
const verified = JSON.parse(
  run(binary, ['--root', fixture, 'verify', 'eligible-picker', '--run'], temp),
);
assert.equal(verified.verdict.decision, 'supported');
const multi = await copyPackagedExample('multi-source');
const workspace = join(multi, 'workspace');
const coordinated = JSON.parse(
  run(binary, ['verify', 'visible-notices', '--root', workspace, '--run'], temp),
);
assert.equal(coordinated.verdict.decision, 'supported');
const resumed = JSON.parse(run(binary, ['context', 'visible-notices', '--root', workspace], temp));
assert.equal(resumed.index[0].source, 'service');
assert.equal(resumed.index[0].available, true);
assert.equal(resumed.index.find((item) => item.path === 'knowledge/system-map.md').available, true);
assert.equal(
  JSON.parse(
    run(
      binary,
      ['reconcile', 'visible-notices', '--root', workspace, '--receipt', coordinated.receipt],
      temp,
    ),
  ).verdict.decision,
  'supported',
);
const fullstack = await copyPackagedExample('reading-list');
const inspection = JSON.parse(run(binary, ['inspect', '--root', fullstack], temp));
assert.equal(inspection.executed, false);
assert.ok(inspection.candidates.some((c) => c.command.join(' ') === 'npm run start'));
const product = JSON.parse(
  run(binary, ['verify', 'reading-list', '--root', fullstack, '--run'], temp),
);
assert.equal(product.verdict.decision, 'supported');
const observation = join(temp, 'observation.json');
const task = JSON.parse(
  await readFile(join(fullstack, 'clinx/tasks/reading-list/contract.json'), 'utf8'),
);
await writeFile(
  observation,
  JSON.stringify({
    obligations: [task.obligations[0].id],
    observedAt: new Date().toISOString(),
    observer: 'package smoke test',
    method: 'tool',
    target: { identity: 'isolated package installation', revision: 'local package fixture' },
    outcome: 'inconclusive',
    summary: 'Packaging-only attachment, not browser verification',
    artifacts: [
      {
        path: product.receipt,
        description: 'Actual local verification receipt',
      },
    ],
    limitations: ['Not an independent attestation or real-target observation'],
  }),
);
run(
  binary,
  ['evidence', 'attach', 'reading-list', '--root', fullstack, '--file', observation],
  temp,
);
const attachments = JSON.parse(
  run(binary, ['evidence', 'list', 'reading-list', '--root', fullstack], temp),
);
assert.equal(attachments.records[0].integrity, 'intact');
assert.equal(attachments.records[0].localBinding, 'matches');
const prepared = JSON.parse(
  run(process.execPath, [join(installed, 'evals/prepare.mjs'), 'greenfield'], temp),
);
assert.equal(prepared.executed, false);
assert.deepEqual(await readdir(prepared.workspace), []);
const cold = JSON.parse(
  run(process.execPath, [join(installed, 'evals/prepare.mjs'), 'cold-start', 'baseline'], temp),
);
assert.equal(cold.skill, null);
assert.deepEqual((await readdir(cold.workspace)).sort(), ['PRD.md', 'service', 'viewer']);
const recorded = JSON.parse(
  run(process.execPath, [join(installed, 'evals/prepare.mjs'), 'cold-start', 'recorded'], temp),
);
assert.equal(run(process.execPath, [recorded.cli, '--version'], temp).trim(), manifest.version);
const toolRoot = join(recorded.cli, '../..');
assert.deepEqual(
  (await readdir(join(toolRoot, 'node_modules'))).sort(),
  Object.keys(manifest.dependencies).sort(),
);
const recordedInputs = JSON.parse(await readFile(recorded.inputs, 'utf8'));
assert.ok(
  !Object.keys(recordedInputs.hashes).some((path) =>
    /tools\/clinx\/(evals|examples|src)\//.test(path),
  ),
);
assert.equal(
  JSON.parse(
    run(process.execPath, [recorded.cli, 'inspect', '--root', recorded.workspace, '--json'], temp),
  ).executed,
  false,
);
const bulk = JSON.parse(
  run(process.execPath, [join(installed, 'evals/prepare.mjs'), 'bulk-reset', 'baseline'], temp),
);
assert.equal(bulk.skill, null);
assert.equal(
  await readFile(join(bulk.workspace, 'application.mjs'), 'utf8'),
  await readFile(join(installed, 'evals/fixtures/bulk-reset/application.mjs'), 'utf8'),
);
run(process.execPath, ['--test', 'existing.test.mjs'], bulk.workspace);
const { gradeBulkReset } = await import(join(installed, 'evals/grade-bulk-reset.mjs'));
assert.equal((await gradeBulkReset(bulk.workspace)).passed, false);
const onboarding = await mkdtemp(join(tmpdir(), 'clinx-package-init-'));
run(binary, ['--root', onboarding, 'init', '--agent', 'codex', '--apply'], temp);
assert.ok((await readdir(join(onboarding, '.agents/skills/clinx-delivery'))).includes('SKILL.md'));
assert.equal(
  await readFile(
    join(onboarding, '.agents/skills/clinx-delivery/references/collaboration.md'),
    'utf8',
  ),
  await readFile(join(installed, 'skills/clinx-delivery/references/collaboration.md'), 'utf8'),
);
assert.ok(!(await readdir(onboarding)).includes('clinx.config.json'));
assert.equal(
  await readFile(join(onboarding, '.agents/skills/clinx-delivery/LICENSE'), 'utf8'),
  await readFile(join(installed, 'LICENSE'), 'utf8'),
);
assert.ok(
  (await readdir(join(onboarding, '.agents/skills/clinx-delivery/references'))).includes(
    'delivery.md',
  ),
);
const unconfigured = await mkdtemp(join(tmpdir(), 'clinx-package-inspect-'));
assert.equal(JSON.parse(run(binary, ['inspect', '--root', unconfigured], temp)).configured, false);
assert.deepEqual(await readdir(unconfigured), []);

// Exercise the user's real executable name, with an isolated npm global prefix.
// This does not touch the user's global tools or require the source checkout at runtime.
const prefix = join(temp, 'isolated-prefix');
run(
  'npm',
  [
    'install',
    '--global',
    '--prefix',
    prefix,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--registry=https://registry.npmjs.org',
    tarball,
  ],
  temp,
);
const installedCommand = (args, cwd = temp) => {
  const result = spawnSync('clinx', args, {
    cwd,
    env: { ...process.env, PATH: join(prefix, 'bin') + delimiter + process.env.PATH },
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  return result.stdout;
};
await assertLockedRuntime(join(prefix, 'lib/node_modules/clinx'));
assert.equal(installedCommand(['--version']).trim(), manifest.version);
assert.match(installedCommand(['task', 'add', '--help']), /Usage: clinx task add/);
assert.match(installedCommand(['inspect'], unconfigured), /Workspace:/);
assert.equal(JSON.parse(installedCommand(['inspect', '--json'], unconfigured)).configured, false);
const practice = join(temp, 'new user practice');
assert.equal(
  JSON.parse(installedCommand(['example', 'copy', 'noticeboard', '--to', practice, '--json']))
    .executed,
  false,
);
installedCommand(['init', '--agent', 'codex', '--apply'], practice);
assert.equal(
  JSON.parse(installedCommand(['skill', 'status', '--json'], practice)).matchesPackage,
  true,
);
installedCommand(['skill', 'update', '--apply'], practice);
installedCommand(['skill', 'remove', '--apply'], practice);
assert.equal(JSON.parse(installedCommand(['skill', 'status', '--json'], practice)).managed, false);
assert.ok((await readdir(practice)).includes('PRD.md'));
assert.ok(!(await readdir(practice)).includes('package.json'));
const productCopy = join(temp, 'copied-product');
installedCommand(['example', 'copy', 'reading-list', '--to', productCopy]);
assert.equal(
  JSON.parse(installedCommand(['verify', 'reading-list', '--run', '--json'], productCopy)).verdict
    .decision,
  'supported',
);
assert.equal(await digest(), beforeDigest, 'Candidate tarball changed during verification');
process.stdout.write(
  `PASS: isolated local/global-prefix installs, PATH command, help/text/JSON, example copying, static inspection, packaged full-stack verification, attachment round-trip, raw cold-start preparation and Skill lifecycle (${pack.files.length} files).\nTested tarball: ${tarball}\nSHA-256: ${beforeDigest}\n`,
);
