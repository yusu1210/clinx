import { realpath } from 'node:fs/promises';
import {
  boundedPath,
  canonical,
  compareText,
  createFingerprintBudget,
  fingerprint,
  readJson,
  sha256,
  sourceRoots,
} from './files.js';
import {
  validateConfig,
  type TaskContract,
  type Check,
  type FileRef,
  type VerificationDefinition,
} from './schema.js';
export async function openWorkspace(root: string) {
  root = await realpath(root);
  let input: unknown;
  try {
    input = await readJson(await boundedPath(root, 'clinx.config.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new Error(
        'No clinx.config.json. The Skill works without configuration; for CLI records, first declare reviewed source inputs and checks.',
      );
    throw error;
  }
  const config = validateConfig(input);
  return {
    root,
    config,
  };
}
export type Workspace = Awaited<ReturnType<typeof openWorkspace>>;
export function taskSources(p: Workspace, task: TaskContract) {
  return p.config.sources
    .filter((s) => !task.sources || task.sources.includes(s.id))
    .sort((a, b) => compareText(a.id, b.id));
}
export async function resolveFileRef(p: Workspace, ref: FileRef) {
  if (!ref.source) return boundedPath(p.root, ref.path);
  const source = p.config.sources.find((s) => s.id === ref.source);
  if (!source) throw new Error(`Unknown file source: ${ref.source}`);
  const roots = await sourceRoots(p.root, { ...p.config, sources: [source] });
  return boundedPath(roots.get(source.id)!, ref.path);
}
export function verificationDefinition(
  p: Workspace,
  task: TaskContract,
  checks?: Check[],
): VerificationDefinition {
  const ids = new Set(task.obligations.flatMap((o) => ('checks' in o ? o.checks : [])));
  return {
    sources: taskSources(p, task),
    checks: checks ?? p.config.checks.filter((c) => ids.has(c.id)),
  };
}
export function digestDefinition(definition: VerificationDefinition) {
  return sha256(
    canonical({
      sources: [...definition.sources].sort((a, b) => compareText(a.id, b.id)),
      checks: definition.checks.map(({ description: _description, ...check }) => check),
    }),
  );
}
export function definitionDigest(p: Workspace, task: TaskContract, checks?: Check[]) {
  return digestDefinition(verificationDefinition(p, task, checks));
}
export async function fingerprintSources(p: Workspace, task: TaskContract) {
  const sources = taskSources(p, task);
  const roots = await sourceRoots(p.root, { ...p.config, sources });
  const budget = createFingerprintBudget();
  const fingerprints = [];
  // Scan sequentially so a multi-source task cannot multiply open files and memory use.
  for (const s of sources) {
    fingerprints.push({
      id: s.id,
      ...(await fingerprint(roots.get(s.id)!, s, budget)),
    });
  }
  return fingerprints;
}
