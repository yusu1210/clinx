import { mkdtemp, mkdir, writeFile, realpath, lstat, opendir, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { checkpoints, scenario } from './scenario.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashes = (files) =>
  Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, hash(bytes)]));
const isGuidance = (path) =>
  path === 'README.md' || (path.startsWith('docs/') && path.endsWith('.md'));
const maxBytes = 1024 * 1024;

// Reads data only. Reject links/special files and bound input before parsing or copying.
async function readRegular(path) {
  if (!(await lstat(path)).isFile()) throw new Error('Expected a regular evaluation file');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('Evaluation file exceeds limits');
    const bytes = Buffer.alloc(maxBytes + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = await handle.read(bytes, size, bytes.length - size, null);
      if (read.bytesRead === 0) break;
      size += read.bytesRead;
    }
    if (size > maxBytes) throw new Error('Evaluation file exceeds limits');
    return bytes.subarray(0, size);
  } finally {
    await handle.close();
  }
}

async function snapshot(workspace) {
  const files = Object.create(null);
  let entries = 0,
    bytes = 0;
  async function visit(path, prefix = '', depth = 0) {
    if (depth > 8 || !(await lstat(path)).isDirectory())
      throw new Error('Invalid evaluation directory');
    const dir = await opendir(path);
    for await (const entry of dir) {
      if (++entries > 128) throw new Error('Evaluation entry limit exceeded');
      const name = prefix + entry.name;
      const target = join(path, entry.name);
      if (entry.isDirectory()) await visit(target, name + '/', depth + 1);
      else {
        const content = await readRegular(target);
        bytes += content.length;
        if (bytes > maxBytes) throw new Error('Evaluation snapshot exceeds limits');
        files[name] = content;
      }
    }
  }
  await visit(workspace);
  return files;
}

// Creates a fresh checkpoint; never rewrites the previous workspace or executes its code.
export async function prepareKnowledge(after) {
  let checkpoint = checkpoints[0],
    previous,
    priorFiles;
  if (after !== undefined) {
    if (typeof after !== 'string' || !after.trim() || basename(after) !== 'evaluator.json')
      throw new Error('Expected the previous evaluator.json path');
    const previousRoot = await realpath(dirname(resolve(after)));
    const manifest = JSON.parse(await readRegular(join(previousRoot, 'evaluator.json')));
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
      throw new Error('Invalid knowledge evaluation record');
    const index = checkpoints.indexOf(manifest.checkpoint);
    if (manifest.exercise !== 'clinx-knowledge' || manifest.version !== 1 || index < 0)
      throw new Error('Invalid knowledge evaluation record');
    if (index === checkpoints.length - 1)
      throw new Error('Final checkpoint; review delivery instead of advancing');
    priorFiles = await snapshot(join(previousRoot, 'project'));
    const expected = scenario(manifest.checkpoint).files;
    const protectedPaths = Object.keys(expected).filter((path) => !isGuidance(path));
    for (const path of protectedPaths)
      if (!priorFiles[path]?.equals(Buffer.from(expected[path])))
        throw new Error(`Protected input changed: ${path}`);
    for (const path of Object.keys(priorFiles))
      if (!Object.hasOwn(expected, path) && !isGuidance(path))
        throw new Error(`Out-of-scope file: ${path}`);
    if (
      manifest.checkpoint === 'retrieval' &&
      JSON.stringify(Object.entries(hashes(priorFiles)).sort()) !==
        JSON.stringify(Object.entries(manifest.baseline ?? {}).sort())
    )
      throw new Error('Read-only retrieval changed files');
    checkpoint = checkpoints[index + 1];
    previous = {
      evaluator: join(previousRoot, 'evaluator.json'),
      checkpoint: manifest.checkpoint,
      hashes: hashes(priorFiles),
    };
  }
  const spec = scenario(checkpoint);
  const files = Object.fromEntries(
    Object.entries(spec.files).map(([path, text]) => [path, Buffer.from(text)]),
  );
  if (priorFiles) {
    // Preserve corrections, additions and deletions exactly; never reset poor guidance.
    for (const path of Object.keys(files)) if (isGuidance(path)) delete files[path];
    for (const [path, bytes] of Object.entries(priorFiles))
      if (isGuidance(path)) files[path] = bytes;
  }
  const root = await mkdtemp(join(tmpdir(), 'clinx-knowledge-eval-'));
  const workspace = join(root, 'project');
  for (const [path, content] of Object.entries(files)) {
    const target = join(workspace, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
  }
  const baseline = hashes(files);
  const changed = priorFiles
    ? [...new Set([...Object.keys(priorFiles), ...Object.keys(files)])]
        .filter(
          (path) =>
            hash(priorFiles[path] ?? '') !== hash(files[path] ?? '') ||
            Object.hasOwn(priorFiles, path) !== Object.hasOwn(files, path),
        )
        .sort()
    : [];
  const evaluator = {
    exercise: 'clinx-knowledge',
    version: 1,
    checkpoint,
    status: 'prepared-not-evaluated',
    baseline,
    protected: Object.keys(files).filter(
      (path) =>
        checkpoint === 'retrieval' ||
        (checkpoint === 'delivery'
          ? ['policy.md', 'consumers.json', 'runtime.json'].includes(path) ||
            path.startsWith('history/')
          : !isGuidance(path)),
    ),
    previous: previous ?? null,
    transition: changed,
    criteria: spec.criteria,
    retiredClaims: spec.retiredClaims,
    limits:
      'Preparation and source integrity are not agent grades. Stop writers before advancing. Keep evaluator records, snapshots and criteria outside candidate access. This is file separation, not a sandbox. Review responses, traces, applicability and authority independently; no delivery gain is inferred.',
  };
  if (priorFiles)
    await writeFile(
      join(root, 'previous-snapshot.json'),
      JSON.stringify(
        Object.fromEntries(
          Object.entries(priorFiles).map(([path, bytes]) => [path, bytes.toString('base64')]),
        ),
        null,
        2,
      ) + '\n',
      { flag: 'wx' },
    );
  for (const [name, text] of Object.entries({
    'evaluator.json': JSON.stringify(evaluator, null, 2),
    'request.txt': spec.request,
    'retrieval-request.txt': spec.retrievalRequest,
  }))
    await writeFile(join(root, name), text + '\n', { flag: 'wx' });
  return {
    workspace,
    request: spec.request,
    retrievalRequest: spec.retrievalRequest,
    evaluator: join(root, 'evaluator.json'),
  };
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => null)) ===
    (await realpath(fileURLToPath(import.meta.url)))
) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--after' || !args[1].trim()))
    throw new Error('Usage: node evals/knowledge/prepare.mjs [--after EVALUATOR_JSON]');
  console.log(JSON.stringify(await prepareKnowledge(args[1]), null, 2));
}
