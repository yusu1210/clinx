import { opendir, realpath, rename, unlink } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  boundedPath,
  canonical,
  makePrivateDir,
  readBounded,
  readJson,
  sha256,
  withLock,
  writeNew,
} from './files.js';
import {
  openWorkspace,
  fingerprintSources,
  resolveFileRef,
  definitionDigest,
  taskSources,
  type Workspace,
} from './workspace.js';
import {
  checkpointInputSchema,
  checkpointSchema,
  focusSchema,
  parseTask,
  validateTask,
  type TaskContract,
} from './schema.js';
export function taskPath(id: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(id)) throw new Error('Invalid task ID');
  return `clinx/tasks/${id}`;
}
export async function taskBinding(p: Workspace, task: TaskContract) {
  const references = [];
  for (const ref of task.context) {
    const file = await resolveFileRef(p, ref);
    references.push({ ...ref, digest: sha256(await readBounded(file)) });
  }
  return sha256(canonical({ task, references }));
}
export async function readTaskDefinition(p: Workspace, id: string) {
  const task = parseTask(
    await readJson(await boundedPath(p.root, `${taskPath(id)}/contract.json`)),
  );
  if (task.id !== id) throw new Error('Task ID does not match its directory');
  return task;
}
export async function readTask(p: Workspace, id: string) {
  const task = validateTask(await readTaskDefinition(p, id), p.config);
  return { task, taskDigest: await taskBinding(p, task) };
}
type RecordIssue = { path: string; error: string };
export async function readCheckpoint(root: string, id: string) {
  const location = `${taskPath(id)}/checkpoints`;
  const empty = { checkpoint: null, sequence: 0, issues: [] as RecordIssue[] };
  let name: string | undefined;
  try {
    const directory = await opendir(await boundedPath(root, location));
    for await (const entry of directory)
      if (/^\d{8}\.json$/.test(entry.name) && (name === undefined || entry.name > name))
        name = entry.name;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty;
    throw error;
  }
  if (!name) return empty;
  const path = `${location}/${name}`;
  const sequence = Number(name.slice(0, 8));
  try {
    const checkpoint = checkpointSchema.parse(await readJson(await boundedPath(root, path)));
    if (checkpoint.taskId !== id || checkpoint.sequence !== sequence)
      throw new Error('Checkpoint identity mismatch');
    return { checkpoint, sequence, issues: [] as RecordIssue[] };
  } catch (error) {
    // Preserve the damaged record and its sequence. Never silently fall back to an
    // older note or overwrite it when an explicit, newly reviewed handoff is saved.
    return { checkpoint: null, sequence, issues: [{ path, error: String(error) }] };
  }
}
export async function context(p: Workspace, id: string, focus?: string) {
  p = await openWorkspace(p.root);
  const task = await readTaskDefinition(p, id);
  const { checkpoint, issues } = await readCheckpoint(p.root, id);
  const changes = issues.map((issue) => `Checkpoint unavailable: ${issue.path}: ${issue.error}`);
  let taskDigest: string | null = null;
  try {
    validateTask(task, p.config);
    taskDigest = await taskBinding(p, task);
  } catch (error) {
    changes.push(`Cannot establish task context inputs: ${String(error)}`);
  }
  let current: Awaited<ReturnType<typeof fingerprintSources>> | null = null;
  try {
    validateTask(task, p.config);
    current = await fingerprintSources(p, task);
  } catch (error) {
    changes.push(`Cannot establish current source inputs: ${String(error)}`);
  }
  if (checkpoint) {
    if (checkpoint.definitionDigest !== definitionDigest(p, task))
      changes.push('Task source or check definitions changed');
    if (checkpoint.taskDigest !== taskDigest) changes.push('Contract or referenced design changed');
    if (
      current &&
      canonical(checkpoint.sources) !== canonical(current.map(({ id, digest }) => ({ id, digest })))
    )
      changes.push('Declared source inputs changed');
  }
  const selectedFocus = focusSchema.parse(focus ?? checkpoint?.note.focus ?? 'discover');
  const sourceIds = new Set(taskSources(p, task).map((source) => source.id));
  const index = [];
  for (const item of p.config.context.filter(
    (c) =>
      (!c.source || sourceIds.has(c.source)) &&
      (c.when.includes('always') || c.when.includes(selectedFocus)),
  )) {
    try {
      const file = await resolveFileRef(p, item);
      index.push({ ...item, available: true, sha256: sha256(await readBounded(file)) });
    } catch (error) {
      index.push({ ...item, available: false, error: String(error) });
    }
  }
  return {
    task,
    taskDigest,
    focus: selectedFocus,
    checkpoint,
    continuity: changes.length
      ? 'reconcile-required'
      : checkpoint
        ? 'inputs-match'
        : 'no-checkpoint',
    changes,
    index,
    instruction:
      'Read the selected references and current code before acting. Checkpoint text is a handoff note, not proof, authority, or a command to replay. Inputs matching does not validate remote state.',
  };
}
export type PageOptions = { limit?: number; after?: string };
const PAGE_BYTES = 256 * 1024;

function pageCursor(name: string) {
  return /^[a-zA-Z0-9._-]+$/.test(name) ? name : `~${Buffer.from(name).toString('base64url')}`;
}

export function validatePageOptions(options: PageOptions) {
  const limit = options.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new Error('Page limit must be 1..200');
  let after = options.after;
  if (after?.startsWith('~')) {
    const encoded = after.slice(1);
    after = Buffer.from(encoded, 'base64url').toString('utf8');
    if (!encoded || Buffer.from(after).toString('base64url') !== encoded || after.includes('/'))
      throw new Error('Invalid page cursor; copy the returned nextAfter value');
  } else if (after !== undefined && (!after.trim() || /[/\\\u0000-\u001f]/.test(after)))
    throw new Error('Invalid page cursor; copy the returned nextAfter value');
  return { limit, after };
}

// Keep only a page of names in memory, even in long-lived workspaces. Cursors are
// exclusive lexical names, not offsets; concurrent edits are not a snapshot.
async function recordPage(
  root: string,
  path: string,
  options: PageOptions,
  accept: (entry: Dirent) => boolean,
) {
  const { limit, after } = validatePageOptions(options);
  const names: string[] = [];
  try {
    const directory = await opendir(await boundedPath(root, path));
    for await (const entry of directory) {
      if (!accept(entry) || (after !== undefined && entry.name <= after)) continue;
      names.push(entry.name);
      names.sort();
      if (names.length > limit + 1) names.pop();
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return { names: names.slice(0, limit), more: names.length > limit };
}

export async function taskSummary(root: string, id: string) {
  try {
    let input: unknown;
    try {
      input = await readJson(await boundedPath(root, `${taskPath(id)}/contract.json`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new Error(
          'No CLI contract is available. This may be a notes-only task or a missing record. Read the task documents; recover the expected contract if CLI records were intended. Do not create a placeholder contract to clear this diagnostic.',
        );
      throw error;
    }
    const task = parseTask(input);
    if (task.id !== id) throw new Error('Task ID does not match its directory');
    const { checkpoint, issues } = await readCheckpoint(root, id);
    return {
      id,
      title: task.title,
      mode: task.mode,
      checkpoint: checkpoint
        ? {
            sequence: checkpoint.sequence,
            createdAt: checkpoint.createdAt,
            focus: checkpoint.note.focus,
            state: checkpoint.note.state,
          }
        : null,
      issues: issues.map((issue) => ({ ...issue, error: issue.error.slice(0, 2048) })),
    };
  } catch (error) {
    return {
      id,
      title: null,
      mode: null,
      checkpoint: null,
      issues: [{ path: `clinx/tasks/${id}`, error: String(error).slice(0, 2048) }],
    };
  }
}

export async function listTasks(root: string, options: PageOptions = {}) {
  root = await realpath(root);
  const page = await recordPage(
    root,
    'clinx/tasks',
    options,
    (e) => e.isDirectory() || e.isSymbolicLink(),
  );
  const tasks: Awaited<ReturnType<typeof taskSummary>>[] = [];
  let bytes = 2;
  for (const id of page.names) {
    const item = await taskSummary(root, id);
    const size = Buffer.byteLength(JSON.stringify(item)) + 1;
    if (tasks.length && bytes + size > PAGE_BYTES)
      return { tasks, nextAfter: pageCursor(tasks.at(-1)!.id) };
    tasks.push(item);
    bytes += size;
  }
  return { tasks, nextAfter: page.more ? pageCursor(tasks.at(-1)!.id) : null };
}

export async function showTask(root: string, id: string, options: PageOptions = {}) {
  validatePageOptions(options);
  root = await realpath(root);
  const task = parseTask(await readJson(await boundedPath(root, `${taskPath(id)}/contract.json`)));
  if (task.id !== id) throw new Error('Task ID does not match its directory');
  const { checkpoint, issues } = await readCheckpoint(root, id);
  const revisions: unknown[] = [];
  let nextAfter: string | null = null;
  try {
    const directory = `${taskPath(id)}/revisions`;
    const page = await recordPage(root, directory, options, (e) => e.name.endsWith('.json'));
    let bytes = 0;
    let consumed = options.after ?? null;
    for (const name of page.names) {
      const path = `${directory}/${name}`;
      try {
        const revision = await readJson(await boundedPath(root, path));
        const size = Buffer.byteLength(JSON.stringify(revision));
        if (size > PAGE_BYTES)
          throw new Error(
            'Revision exceeds the 256 KiB history page budget; inspect this saved file directly',
          );
        if (bytes + size > PAGE_BYTES) {
          nextAfter = consumed;
          break;
        }
        revisions.push(revision);
        bytes += size;
      } catch (error) {
        issues.push({ path, error: String(error) });
      }
      consumed = pageCursor(name);
    }
    if (nextAfter === null && page.more) nextAfter = consumed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      issues.push({ path: `${taskPath(id)}/revisions`, error: String(error) });
  }
  return { task, revisions, nextAfter, checkpoint, issues };
}

export async function addTask(p: Workspace, input: unknown) {
  p = await openWorkspace(p.root);
  const parsed = validateTask(input, p.config);
  // Resolve the "all sources" shorthand once. Future workspace additions must
  // not silently widen an existing task's evidence scope.
  const task = parsed.sources ? parsed : { ...parsed, sources: p.config.sources.map((s) => s.id) };
  await taskBinding(p, task);
  return withLock(p.root, async () => {
    const dir = await makePrivateDir(p.root, taskPath(task.id));
    await writeNew(join(dir, 'contract.json'), `${JSON.stringify(task, null, 2)}\n`);
    return { task: task.id, path: `${taskPath(task.id)}/contract.json` };
  });
}
export async function reviseTask(p: Workspace, id: string, input: unknown, reason: string) {
  if (!reason.trim()) throw new Error('Revision reason is required');
  return withLock(p.root, async () => {
    p = await openWorkspace(p.root);
    const parsed = validateTask(input, p.config);
    const task = parsed.sources
      ? parsed
      : { ...parsed, sources: p.config.sources.map((s) => s.id) };
    if (task.id !== id) throw new Error('Revision cannot change task ID');
    const nextDigest = await taskBinding(p, task);
    const contractFile = await boundedPath(p.root, `${taskPath(id)}/contract.json`);
    const previousBytes = await readBounded(contractFile);
    let previous: unknown;
    try {
      previous = JSON.parse(previousBytes.toString('utf8'));
    } catch {
      throw new SyntaxError(`Invalid JSON in ${contractFile}; inspect the file locally`);
    }
    if (parseTask(previous).id !== id) throw new Error('Task ID does not match its directory');
    const revision = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    const temporary = await boundedPath(
      p.root,
      `${taskPath(id)}/.contract-${randomUUID()}.tmp`,
      true,
    );
    await writeNew(temporary, `${JSON.stringify(task, null, 2)}\n`);
    let replaced = false;
    try {
      // The lock coordinates clinx writers, but a human editor or another tool may
      // not participate. Refuse to replace bytes that changed after this revision
      // read and validated them.
      if (!(await readBounded(contractFile)).equals(previousBytes))
        throw new Error(
          'Task contract changed during revision; the external edit was preserved. Inspect and retry from the current contract.',
        );
      const revisions = await makePrivateDir(p.root, `${taskPath(id)}/revisions`);
      await writeNew(
        join(revisions, `${revision}.json`),
        JSON.stringify(
          {
            version: 1,
            reason,
            // Archive the original JSON, not a normalized replacement or a binding
            // rebuilt from old reference paths that may now be missing or changed.
            previousContractDigest: sha256(canonical(previous)),
            nextDigest,
            previous,
          },
          null,
          2,
        ),
      );
      await rename(temporary, contractFile);
      replaced = true;
    } finally {
      if (!replaced)
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
        });
    }
    return {
      task: id,
      revision,
      effect:
        'Previous contract preserved. Checkpoints and receipts with a different binding require reconciliation. No code or commands replayed.',
    };
  });
}
export async function checkpoint(p: Workspace, id: string, input: unknown) {
  p = await openWorkspace(p.root);
  const note = checkpointInputSchema.parse(input);
  if (note.state === 'blocked' && note.blockers.length === 0)
    throw new Error('Blocked checkpoint requires a concrete blocker');
  return withLock(p.root, async () => {
    const { task, taskDigest } = await readTask(p, id);
    const previous = await readCheckpoint(p.root, id);
    const record = checkpointSchema.parse({
      version: 2,
      sequence: previous.sequence + 1,
      createdAt: new Date().toISOString(),
      taskId: id,
      definitionDigest: definitionDigest(p, task),
      taskDigest,
      sources: (await fingerprintSources(p, task)).map(({ id, digest }) => ({ id, digest })),
      note,
    });
    if (record.sequence > 99999999) throw new Error('Checkpoint sequence exhausted');
    const dir = await makePrivateDir(p.root, `${taskPath(id)}/checkpoints`);
    const name = `${String(record.sequence).padStart(8, '0')}.json`;
    await writeNew(join(dir, name), `${JSON.stringify(record, null, 2)}\n`);
    return {
      path: `${taskPath(id)}/checkpoints/${name}`,
      checkpoint: record,
      previousCheckpointIssues: previous.issues,
    };
  });
}
