import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { assertPublicFile } from './release-scan.mjs';
import { checkTranslations } from './translations.mjs';
import { syncSkills } from './sync-skills.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  configSchema,
  taskSchema,
  receiptSchema,
  checkpointSchema,
  checkpointInputSchema,
  evidenceSchema,
  evidenceInputSchema,
} from '../dist/schema.js';
import { z } from 'zod';

const root = fileURLToPath(new URL('../', import.meta.url));
const omit = new Set([
  'node_modules',
  '.git',
  '.clinx',
  'dist',
  'artifacts',
  'target',
  'coverage',
  '.DS_Store',
]);
let count = 0;
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (omit.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const content = await assertPublicFile(path, relative(root, path));
    count++;
    if (!path.endsWith('.md')) continue;
    const markdownPath = relative(root, path);
    let inFence = false;
    let previousHeading = 0;
    let h1Count = 0;
    for (const [index, line] of content.split('\n').entries()) {
      if (/^```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const heading = /^(#{1,6})\s+/.exec(line);
      if (!heading) continue;
      const level = heading[1].length;
      if (level === 1) h1Count++;
      assert.ok(
        previousHeading === 0 || level <= previousHeading + 1,
        `${markdownPath}:${index + 1}: heading level skips from ${previousHeading} to ${level}`,
      );
      previousHeading = level;
    }
    assert.ok(!inFence, `${markdownPath}: unclosed fenced code block`);
    assert.equal(h1Count, 1, `${markdownPath}: expected exactly one level-one heading`);
    if (
      /(^|\/)(?:README|CONTRIBUTING|SECURITY|CHANGELOG)\.zh-CN\.md$/.test(markdownPath) ||
      markdownPath.startsWith('docs/zh-CN/')
    ) {
      assert.doesNotMatch(
        content,
        /\*\*[^*\n]+：\*\*/,
        `${markdownPath}: keep the Chinese colon outside bold text`,
      );
    }
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^[a-z]+:/i.test(link)) continue;
      await access(resolve(dirname(path), link));
    }
  }
};
await walk(root);
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(manifest.name, 'clinx');
assert.equal(manifest.bin.clinx, 'bin/clinx.mjs');
const lock = JSON.parse(await readFile(join(root, 'npm-shrinkwrap.json'), 'utf8'));
assert.equal(lock.name, manifest.name);
assert.equal(lock.version, manifest.version);
assert.equal(lock.packages[''].version, manifest.version);
assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
assert.ok(
  !(await readdir(root)).includes('package-lock.json'),
  'Keep one publishable dependency lock',
);
for (const path of ['.github/workflows/ci.yml', 'evals/benchmark/workflow/agent-benchmark.yml']) {
  const workflow = await readFile(join(root, path), 'utf8');
  const actions = [...workflow.matchAll(/\buses:\s+([^\s]+)/g)].map((match) => match[1]);
  assert.ok(actions.length > 0, `Expected pinned Actions in ${path}`);
  for (const action of actions)
    assert.match(action, /^[^@\s]+@[a-f0-9]{40}$/, `Pin Actions to a full commit in ${path}`);
  assert.equal(
    (workflow.match(/uses:\s+actions\/checkout@/g) ?? []).length,
    (workflow.match(/persist-credentials:\s+false/g) ?? []).length,
    `Every checkout must disable persisted credentials in ${path}`,
  );
}
const translatedPairs = await checkTranslations(root);
const runtimeModules = (await readdir(join(root, 'src'))).filter((name) => name.endsWith('.ts'));
for (const name of runtimeModules)
  assert.ok(
    manifest.files.includes(`dist/${name.slice(0, -3)}.js`),
    `Runtime module missing from package: ${name}`,
  );
// Runtime modules should have one-way ownership. Checking emitted JavaScript avoids
// rejecting type-only relationships that TypeScript removes from the actual module graph.
const runtimeGraph = new Map();
for (const source of runtimeModules) {
  const module = source.slice(0, -3) + '.js';
  const content = await readFile(join(root, 'dist', module), 'utf8');
  runtimeGraph.set(
    module,
    [...content.matchAll(/(?:\bfrom\s+|^\s*import\s*)['"](\.\/[^'"]+\.js)['"]/gm)]
      .map((match) => match[1].slice(2))
      .filter((dependency) => runtimeModules.includes(dependency.replace(/\.js$/, '.ts'))),
  );
}
const visiting = new Set();
const visited = new Set();
const moduleStack = [];
function assertAcyclic(module) {
  if (visited.has(module)) return;
  if (visiting.has(module)) {
    const start = moduleStack.indexOf(module);
    assert.fail(`Runtime import cycle: ${[...moduleStack.slice(start), module].join(' -> ')}`);
  }
  visiting.add(module);
  moduleStack.push(module);
  for (const dependency of runtimeGraph.get(module) ?? []) assertAcyclic(dependency);
  moduleStack.pop();
  visiting.delete(module);
  visited.add(module);
}
for (const module of runtimeGraph.keys()) assertAcyclic(module);
for (const [name, schema] of Object.entries({
  config: configSchema,
  task: taskSchema,
  receipt: receiptSchema,
  checkpoint: checkpointSchema,
  'checkpoint-input': checkpointInputSchema,
  evidence: evidenceSchema,
  'evidence-input': evidenceInputSchema,
})) {
  const actual = JSON.parse(await readFile(join(root, 'schemas', `${name}.schema.json`), 'utf8'));
  assert.deepEqual(actual, z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' }));
}
await syncSkills(root);
for (const name of ['clinx-delivery', 'clinx-knowledge']) {
  const skill = await readFile(join(root, `skills/${name}/SKILL.md`), 'utf8');
  assert.ok(skill.startsWith(`---\nname: ${name}\ndescription: `));
  assert.match(skill, /\nlicense: MIT\n/);
  assert.equal(
    await readFile(join(root, `skills/${name}/LICENSE`), 'utf8'),
    await readFile(join(root, 'LICENSE'), 'utf8'),
  );
  assert.ok(skill.split('\n').length < 160, 'Keep Skill entry concise');
  const metadata = await readFile(join(root, `skills/${name}/agents/openai.yaml`), 'utf8');
  assert.ok(metadata.includes('$' + name));
}
const text = z.string().trim().min(1);
const scenario = z
  .object({
    id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    request: text,
    prepare: text.optional(),
    fixture: text.optional(),
    evaluatorSetup: text.optional(),
    evaluate: z.array(text).min(1),
  })
  .strict()
  .refine((s) => Boolean(s.prepare) !== Boolean(s.fixture), 'Choose preparation or fixture');
const scenarios = z
  .object({
    version: z.literal(1),
    status: z.literal('protocol-not-a-measured-agent-benchmark'),
    scenarios: z.array(scenario).min(1),
  })
  .strict()
  .parse(JSON.parse(await readFile(join(root, 'evals/scenarios.json'), 'utf8')));
assert.equal(new Set(scenarios.scenarios.map((s) => s.id)).size, scenarios.scenarios.length);
for (const scenario of scenarios.scenarios) {
  if (scenario.fixture) await access(resolve(root, scenario.fixture));
  if (scenario.prepare)
    assert.match(
      scenario.prepare,
      /^node evals\/prepare\.mjs (greenfield|brownfield|cold-start|bulk-reset)$/,
    );
}
process.stdout.write(
  `PASS: ${count} authored/generated source files checked; local Markdown links, ${translatedPairs} translation byte bindings, schema sync, Skill metadata and basic private-material heuristics.\n`,
);
