import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  readlink,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
async function dependencyRoot(name) {
  let directory = dirname(require.resolve(name));
  while (true) {
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (manifest.name === name) return directory;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot locate runtime dependency: ${name}`);
    directory = parent;
  }
}
const requests = {
  greenfield: `Build a small local reading-list web application from scratch. A reader can submit a book title and author and see the saved list; a librarian can mark a recommendation as read. Readers must not be able to perform that librarian action by calling the API directly. Changes must survive a server restart. Include a usable browser interface with validation, empty/error/success feedback. Demo identities are acceptable for this local demonstrator, but distinguish them from production authentication. Use existing Node, no third-party dependencies. Bind only to loopback and use isolated test data. Include and run executable tests against the real HTTP boundary and persistence. Verify actual browser behavior when available. Deliver start/use/stop instructions, actual verification and limitations. No account administration, cloud integration or extra features.`,
  brownfield: `Extend this existing picker with an optional category filter through its HTTP API. When present, category is an exact case-sensitive match; rows and total must describe the same eligible filtered set before pagination. A missing category keeps existing behavior. Unknown categories return an empty set. An explicitly empty category is invalid. Existing eligibility and server-owned tenant isolation must remain intact. Update original synthetic test data as needed and run relevant tests. No UI, persistence, pricing, new service or deployment is requested. Deliver the scoped change, verification and limitations.`,
  'cold-start': `Implement the requirement in PRD.md using the supplied service and viewer project directories. No engineering map or task configuration is provided. Discover the relevant existing code, instructions and actual execution path. Deliver the implemented behavior, real verification, use/stop instructions and remaining boundaries.`,
  'bulk-reset': `Implement PRD.md in the supplied preference application. Discover the existing operation and gateway capabilities. Keep the requested scope, run meaningful verification, and deliver the change, concrete invocation/recovery instructions and remaining boundaries.`,
};
const scenario = process.argv[2];
const variant = process.argv[3] ?? 'skill';
if (
  ![3, 4].includes(process.argv.length) ||
  !Object.hasOwn(requests, scenario ?? '') ||
  !['baseline', 'skill', 'recorded'].includes(variant)
) {
  process.stderr.write(
    'Usage: node evals/prepare.mjs greenfield|brownfield|cold-start|bulk-reset [baseline|skill|recorded]\n',
  );
  process.exitCode = 3;
} else {
  const output = await mkdtemp(join(tmpdir(), `clinx-eval-${scenario}-`));
  const workspace = join(output, 'project');
  const skill = variant === 'baseline' ? null : join(output, 'clinx-delivery');
  await mkdir(workspace);
  if (skill) await cp(join(root, 'skills/clinx-delivery'), skill, { recursive: true });
  if (scenario === 'brownfield') {
    for (const file of ['catalog.mjs', 'http.mjs', 'catalog.test.mjs'])
      await cp(join(root, 'examples/node-picker', file), join(workspace, file));
    await cp(join(root, 'evals/fixtures/picker/README.md'), join(workspace, 'README.md'));
  }
  if (scenario === 'cold-start') {
    await cp(join(root, 'evals/fixtures/noticeboard'), workspace, { recursive: true });
  }
  if (scenario === 'bulk-reset') {
    await cp(join(root, 'evals/fixtures/bulk-reset'), workspace, { recursive: true });
  }
  let cli = null;
  if (variant === 'recorded') {
    // Keep runnable support separate from evaluator/reference implementations.
    // Dependencies are shared read-only by protocol, not isolated by a sandbox.
    const bundle = join(output, 'tools/clinx');
    await mkdir(bundle, { recursive: true });
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    for (const path of [
      'bin',
      'templates',
      'skills',
      'schemas',
      'package.json',
      'LICENSE',
      ...manifest.files.filter((p) => p.startsWith('dist/') && !p.includes('*')),
      ...(await readdir(join(root, 'dist')))
        .filter((p) => p.endsWith('.js.map'))
        .map((p) => `dist/${p}`),
    ]) {
      await mkdir(join(bundle, path, '..'), { recursive: true });
      await cp(join(root, path), join(bundle, path), { recursive: true });
    }
    // Resolve each dependency from this installation, including hoisted layouts.
    // Never expose the whole package tree, which also contains evaluators/answers.
    for (const name of Object.keys(manifest.dependencies)) {
      const target = join(bundle, 'node_modules', name);
      await mkdir(dirname(target), { recursive: true });
      await symlink(await dependencyRoot(name), target, 'dir');
    }
    cli = join(bundle, 'bin/clinx.mjs');
  }
  const method = skill ? 'Read the provided clinx-delivery/SKILL.md and relevant references. ' : '';
  const cliInstruction = cli
    ? `You may use the reviewed CLI through node ${JSON.stringify(cli)} to retain task/evidence records when useful. Treat the tools directory and its shared dependencies as read-only. `
    : '';
  const request = `${requests[scenario]}\n\nWork only in the provided project. ${method}${cliInstruction}Use existing tools and reviewed project-local build/test procedures; do not install global tools, contact external services, use private data, push or deploy. Stop processes you own when finished.\n`;
  await writeFile(join(output, 'request.md'), request, { flag: 'wx' });
  const hashes = {};
  const hashFiles = async (dir, prefix = '') => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isSymbolicLink())
        hashes[name] = { sharedReadOnlyLink: await readlink(join(dir, entry.name)) };
      else if (entry.isDirectory()) await hashFiles(join(dir, entry.name), name + '/');
      else
        hashes[name] = createHash('sha256')
          .update(await readFile(join(dir, entry.name)))
          .digest('hex');
    }
  };
  await hashFiles(output);
  await writeFile(
    join(output, 'initial-inputs.json'),
    JSON.stringify({ version: 1, scenario, variant, hashes }, null, 2) + '\n',
    { flag: 'wx' },
  );
  process.stdout.write(
    JSON.stringify(
      {
        scenario,
        variant,
        workspace,
        skill,
        cli,
        request: join(output, 'request.md'),
        inputs: join(output, 'initial-inputs.json'),
        executed: false,
        next: 'Give only request, project and Skill to an authorized agent. No agent, model or command has been launched.',
      },
      null,
      2,
    ) + '\n',
  );
}
