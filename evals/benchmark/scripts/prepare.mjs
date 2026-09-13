import { cp, mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = resolve(process.argv[2] ?? '.');
const scenario = process.argv[3];
const arm = process.argv[4];
const output = resolve(process.argv[5] ?? './benchmark-run');

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

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
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
  // Copy only runtime/package material, never evals/reference solutions/hidden graders.
  const runtime = join(project, '.benchmark/clinx-runtime');
  await mkdir(runtime, { recursive: true });
  for (const p of ['bin', 'dist', 'schemas', 'templates', 'skills', 'package.json', 'LICENSE']) {
    await cp(join(repoRoot, p), join(runtime, p), { recursive: true });
  }
  // The workflow runs npm ci in the source checkout first. Copy the two runtime dependency
  // trees plus their transitive package metadata into the isolated candidate workspace.
  const pkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
  const install = join(project, '.benchmark/tools');
  await mkdir(install, { recursive: true });
  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      install,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-save',
      runtime,
    ],
    { cwd: project, stdio: 'ignore' },
  );
  await mkdir(join(project, '.benchmark/bin'), { recursive: true });
  await writeFile(
    join(project, '.benchmark/bin/clinx'),
    `#!/bin/sh
set -eu
base="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
printf '%s\\n' "$*" >> "$base/clinx-usage.log"
exec "$base/tools/node_modules/.bin/clinx" "$@"
`,
  );
  await chmod(join(project, '.benchmark/bin/clinx'), 0o700);
}

const treatment =
  arm === 'baseline'
    ? ''
    : arm === 'skill'
      ? '\nRead `.benchmark/clinx-delivery/SKILL.md` and only the references that are relevant to the next action.\n'
      : '\nRead `.benchmark/clinx-delivery/SKILL.md` and only relevant references. The reviewed clinx CLI is available at `.benchmark/bin/clinx`; use it only when it materially helps this task, not because it is present.\n';

let request;
if (scenario === 'campaign-cross-repo') {
  request = `Implement PRD.md across the supplied projects. Discover the real current flow and existing capabilities before adding concepts. Complete the full requested behavior, run relevant existing and new tests, verify the real HTTP path and the console consumer, and report actual verification and remaining limits. Do not deploy.${treatment}`;
} else if (scenario === 'campaign-resume-drift') {
  request = `This is work package one for PRD.md. Investigate the current multi-project flow and implement the backend/API portion with meaningful tests. Do not modify the console project yet. Do not deploy. Leave a concise handoff in your final response for a fresh engineer who will continue later.${treatment}`;
} else {
  request = `Investigate PRD.md and the supplied projects and propose the technical design. You may run existing read-only/local baseline checks, but do not modify source code or tests and do not implement the feature yet. Ask me to confirm the design before implementation. Do not deploy.${treatment}`;
}
await writeFile(join(project, 'request.md'), request + '\n');
await writeFile(
  join(output, 'benchmark-meta.json'),
  JSON.stringify({ version: 1, scenario, arm }, null, 2) + '\n',
);

console.log(JSON.stringify({ scenario, arm, project, output }, null, 2));
