import { chmod, lstat, mkdir, readdir, realpath } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { boundedPath, readBounded, writeNew } from './files.js';
import { CliError } from './output.js';
import { version } from './version.js';

const packageRoot = resolve(import.meta.dirname, '..');
export const exampleCatalog = [
  {
    name: 'noticeboard',
    path: 'evals/fixtures/noticeboard',
    description: 'Unfinished PRD with existing service and viewer; use the hands-on guide',
    requires: 'Node.js 22.16+',
  },
  {
    name: 'reading-list',
    path: 'examples/reading-list',
    description: 'Runnable browser/API/persistence example',
    requires: 'Node.js 22.16+',
  },
  {
    name: 'node-picker',
    path: 'examples/node-picker',
    description: 'Domain and HTTP verification with an unresolved release claim',
    requires: 'Node.js 22.16+',
  },
  {
    name: 'multi-source',
    path: 'examples/multi-source',
    description: 'Sibling-source coordination and input-bound verification',
    requires: 'Node.js 22.16+',
  },
  {
    name: 'maven-reactor',
    path: 'examples/maven-reactor',
    description: 'Multi-module verification and report freshness',
    requires: 'JDK 17+ and Maven',
  },
];
export function resources() {
  return {
    version,
    skill: join(packageRoot, 'skills/clinx-delivery'),
    templates: join(packageRoot, 'templates/workspace'),
    examples: join(packageRoot, 'examples'),
    schemas: join(packageRoot, 'schemas'),
    guides: join(packageRoot, 'docs'),
    note: 'Installed resources; templates are drafting aids, not verified project facts. Use example list / example copy to try a public synthetic case without a checkout.',
  };
}
export async function copyExample(name: string, destination: string) {
  const example = exampleCatalog.find((e) => e.name === name);
  if (!example) throw new CliError('USAGE', 'Unknown example: ' + name, 'Run clinx example list.');
  if (!destination.trim())
    throw new CliError(
      'USAGE',
      '--to must name a new directory',
      'Use an absent destination inside an existing parent directory.',
    );
  const lexical = resolve(destination);
  const parent = await realpath(dirname(lexical));
  const target = join(parent, basename(lexical));
  const source = await realpath(join(packageRoot, example.path));
  const files = new Map<string, { bytes: Buffer; executable: boolean }>();
  let total = 0;
  let visited = 0;
  const collect = async (directory: string) => {
    for (const entry of await readdir(await boundedPath(source, directory), {
      withFileTypes: true,
    })) {
      if (
        ['.git', '.clinx', '.agents', 'node_modules', 'target', 'coverage', '.DS_Store'].includes(
          entry.name,
        ) ||
        /^\.env(?:\.|$)/.test(entry.name)
      )
        continue;
      const path = directory === '.' ? entry.name : directory + '/' + entry.name;
      if (
        /(?:^|\/)clinx\/(?:install-backups|installation\.json|agent-entry\.md|skills)(?:\/|$)/.test(
          path,
        )
      )
        continue;
      if (/(?:^|\/)clinx\/tasks\/[^/]+\/(?:checkpoints|revisions)(?:\/|$)/.test(path)) continue;
      if (++visited > 512) throw new Error('Packaged example exceeds copy entry limit');
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) {
        const file = await boundedPath(source, path);
        const bytes = await readBounded(file);
        total += bytes.length;
        if (files.size >= 512 || total > 32 * 1024 * 1024)
          throw new Error('Packaged example exceeds copy limits');
        files.set(path, { bytes, executable: ((await lstat(file)).mode & 0o111) !== 0 });
      } else throw new Error('Unsupported packaged example entry: ' + path);
    }
  };
  await collect('.');
  try {
    await mkdir(target, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new CliError(
        'DESTINATION_EXISTS',
        'Example destination already exists: ' + target,
        'Choose a new directory; clinx never merges an example into existing work.',
      );
    throw error;
  }
  try {
    for (const [path, { bytes, executable }] of files) {
      const file = await boundedPath(target, path, true);
      await mkdir(dirname(file), { recursive: true, mode: 0o700 });
      await writeNew(await boundedPath(target, path, true), bytes);
      if (executable) await chmod(await boundedPath(target, path), 0o700);
    }
  } catch (error) {
    throw new CliError(
      'EXAMPLE_COPY_FAILED',
      'Example copy did not complete: ' + (error instanceof Error ? error.message : String(error)),
      'Inspect the partial copy at ' +
        target +
        '. It was retained for diagnosis; no example commands ran.',
    );
  }
  return {
    name,
    destination: target,
    files: files.size,
    requires: example.requires,
    executed: false,
    next:
      name === 'noticeboard'
        ? 'Read PRD.md and use the hands-on guide with clinx-delivery. This is an unfinished requirement, not an accepted implementation.'
        : 'Read the copied README before running project commands. No dependencies were installed; examples are synthetic, not production-ready scaffolds.',
  };
}
