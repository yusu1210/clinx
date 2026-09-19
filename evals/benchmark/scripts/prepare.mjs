import { treatmentPrompt } from './treatment.mjs';
import { cp, mkdir, readFile, writeFile, chmod, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = resolve(process.argv[2] ?? '.');
const scenario = process.argv[3];
const arm = process.argv[4];
const requestedOutput = resolve(process.argv[5] ?? './benchmark-run');
const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput));

const scenarios = new Set([
  'campaign-cross-repo',
  'campaign-resume-drift',
  'campaign-confirmation',
]);
const arms = new Set(['baseline', 'skill', 'skill-cli']);
if (!scenarios.has(scenario) || !arms.has(arm)) {
  console.error('Usage: prepare.mjs REPO_ROOT SCENARIO baseline|skill|skill-cli OUTPUT');
  process.exit(3);
}

// Exclusive creation: never clean or reuse an existing directory, even if empty.
await mkdir(output, { mode: 0o700 });
const project = join(output, 'project');
await cp(join(here, 'fixture'), project, { recursive: true });
await chmod(join(project, 'tools/deployctl'), 0o700);

for (const name of ['api', 'policy', 'console', 'analytics']) {
  const cwd = join(project, name);
  execFileSync('git', ['init', '-q'], { cwd });
  execFileSync('git', ['config', 'user.name', 'clinx benchmark'], { cwd });
  execFileSync('git', ['config', 'user.email', 'benchmark@example.invalid'], { cwd });
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', ['commit', '-qm', 'benchmark baseline'], { cwd });
}

await mkdir(join(project, '.benchmark'), { recursive: true });
if (arm !== 'baseline') {
  await cp(join(repoRoot, 'skills/clinx-delivery'), join(project, '.benchmark/clinx-delivery'), {
    recursive: true,
  });
}
if (arm === 'skill-cli') {
  // Copy public runtime material, never benchmark answers or hidden graders.
  const runtime = join(project, '.benchmark/clinx-runtime');
  await mkdir(runtime, { recursive: true });
  for (const p of [
    'bin',
    'dist',
    'src',
    'schemas',
    'templates',
    'skills',
    'docs',
    'package.json',
    'npm-shrinkwrap.json',
    'LICENSE',
  ]) {
    await cp(join(repoRoot, p), join(runtime, p), { recursive: true });
  }
  const { exampleCatalog, copyExample } = await import(
    pathToFileURL(join(repoRoot, 'dist/resources.js')).href
  );
  for (const example of exampleCatalog) {
    const destination = join(runtime, example.path);
    await mkdir(dirname(destination), { recursive: true });
    await copyExample(example.name, destination);
  }
  // The evaluator runs npm ci first. Copy its complete locked production closure
  // into the runtime; no registry, install hooks, source symlinks or dev tools.
  const lock = JSON.parse(await readFile(join(repoRoot, 'npm-shrinkwrap.json'), 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path || entry.dev) continue;
    if (
      !path.startsWith('node_modules/') ||
      path.split('/').some((part) => part === '..' || part === '.') ||
      entry.link
    )
      throw new Error(`Unsupported locked runtime path: ${path}`);
    const source = join(repoRoot, path);
    const installed = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
    if (installed.version !== entry.version)
      throw new Error(`Runtime dependency mismatch: ${path}; run npm ci in the evaluator checkout`);
    await mkdir(dirname(join(runtime, path)), { recursive: true });
    await cp(source, join(runtime, path), {
      recursive: true,
      dereference: true,
      filter: (file) =>
        file === source ||
        !file
          .slice(source.length + 1)
          .split('/')
          .includes('node_modules'),
    });
  }
  execFileSync(process.execPath, [join(runtime, 'bin/clinx.mjs'), '--version'], {
    cwd: output,
    timeout: 10000,
  });
  await mkdir(join(project, '.benchmark/bin'), { recursive: true });
  await writeFile(
    join(project, '.benchmark/bin/clinx'),
    `#!/bin/sh
set -eu
base="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
printf '%s\\n' "$*" >> "$base/clinx-usage.log"
exec node "$base/clinx-runtime/bin/clinx.mjs" "$@"
`,
  );
  await chmod(join(project, '.benchmark/bin/clinx'), 0o700);
}

const treatment = treatmentPrompt(arm);

let request;
if (scenario === 'campaign-cross-repo') {
  request = `Implement PRD.md across the supplied projects. Discover the real current flow and existing capabilities before adding concepts. Complete the full requested behavior, run relevant existing and new tests, verify the real HTTP path and the console consumer, and report actual verification and remaining limits. Do not deploy.${treatment}`;
} else if (scenario === 'campaign-resume-drift') {
  request = `This is work package one for PRD.md. Investigate the current multi-project flow and implement the backend/API portion with meaningful tests. Do not modify the console project yet. Do not deploy. Leave a concise handoff in your final response for a fresh engineer who will continue later.${treatment}`;
} else {
  request = `Investigate PRD.md and the supplied projects and propose the technical design. You may run existing read-only/local baseline checks, but do not modify source code or tests and do not implement the feature yet. Keep a concise source-backed design note in this coordinating workspace so a fresh engineer can resume after approval; use any suitable document location. Ask me to confirm the design before implementation. Do not deploy.${treatment}`;
}
await writeFile(join(project, 'request.md'), request + '\n');
await writeFile(
  join(output, 'benchmark-meta.json'),
  JSON.stringify({ version: 1, scenario, arm }, null, 2) + '\n',
);

console.log(JSON.stringify({ scenario, arm, project, output }, null, 2));
