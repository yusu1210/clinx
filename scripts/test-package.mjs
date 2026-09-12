import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { root } from '../test/helpers.mjs';
import { assertPublicFile, releaseFindings } from './release-scan.mjs';

const temp = await mkdtemp(join(tmpdir(), 'clinx-package-'));
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
  return result.stdout;
};
const pack = JSON.parse(
  run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], root),
)[0];
for (const file of pack.files) {
  assert.deepEqual(releaseFindings(file.path, ''), [], file.path);
}
assert.ok(pack.files.some((f) => f.path === 'templates/project/clinx.config.json'));
assert.ok(pack.files.some((f) => f.path === 'skills/clinx-delivery/SKILL.md'));
for (const path of [
  'skills/clinx-delivery/references/delivery.md',
  'skills/clinx-delivery/references/runtime.md',
  'skills/clinx-delivery/references/collaboration.md',
  'docs/collaboration.md',
  'docs/collaboration.zh-CN.md',
  'skills/clinx-delivery/references/integration.md',
  'skills/clinx-delivery/LICENSE',
  'templates/project/clinx/system-map.md',
  'templates/project/clinx/local-guide.md',
  'templates/project/clinx/task-brief.md',
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
    join(temp, pack.filename),
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
  JSON.parse(run(process.execPath, [recorded.cli, 'inspect', '--root', recorded.workspace], temp))
    .executed,
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
process.stdout.write(
  `PASS: tarball install, executable, static inspection, packaged Node/full-stack examples, attachment round-trip, raw cold-start preparation and Skill onboarding (${pack.files.length} files).\n`,
);
