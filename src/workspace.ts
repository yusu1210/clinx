import { readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  asset,
  readCheckpoint,
  readTask,
  fingerprintSources,
  project,
  taskBinding,
  taskPath,
  type Project,
} from './project.js';
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
import { checkpointInputSchema, checkpointSchema, parseTask, validateTask } from './schema.js';
import { version } from './version.js';

export async function init(root: string, agent: 'codex' | 'generic', apply: boolean) {
  const files = new Map<string, Buffer>();
  const collect = async (from: string, to: string) => {
    for (const item of await readdir(from, { withFileTypes: true })) {
      if (item.isDirectory()) await collect(join(from, item.name), `${to}/${item.name}`);
      else if (item.isFile())
        files.set(`${to}/${item.name}`, await readBounded(join(from, item.name)));
      else throw new Error('Unsupported packaged asset');
    }
  };
  files.set(
    'clinx/agent-entry.md',
    await readBounded(asset('templates', 'project', 'clinx', 'agent-entry.md')),
  );
  await collect(
    asset('skills', 'clinx-delivery'),
    agent === 'codex' ? '.agents/skills/clinx-delivery' : 'clinx/skills/clinx-delivery',
  );
  const entries: { path: string; status: 'create' | 'identical' | 'conflict' }[] = [];
  for (const [path, content] of files) {
    const target = await boundedPath(root, path, true);
    let status: 'create' | 'identical' | 'conflict' = 'create';
    try {
      status = content.equals(await readBounded(target)) ? 'identical' : 'conflict';
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    entries.push({ path, status });
  }
  if (apply) {
    if (entries.some((e) => e.status === 'conflict'))
      throw new Error(
        'Existing files differ; nothing written. Review the preview and merge the intended changes manually.',
      );
    await withLock(root, async () => {
      for (const entry of entries.filter((e) => e.status === 'create')) {
        await makePrivateDir(root, dirname(entry.path));
        await writeNew(await boundedPath(root, entry.path, true), files.get(entry.path)!);
      }
    });
  }
  return {
    applied: apply,
    origin: { name: 'clinx', version },
    agent,
    files: entries,
    next: 'Read clinx/agent-entry.md and the Skill. No configuration, map, guide or task was generated. Use existing project tools; declare reviewed inputs and checks only if CLI records are useful. Existing host instructions and tools were not modified.',
  };
}
export async function addTask(p: Project, input: unknown) {
  p = await project(p.root);
  const task = validateTask(input, p.config);
  await taskBinding(p.root, task);
  return withLock(p.root, async () => {
    const dir = await makePrivateDir(p.root, taskPath(task.id));
    await writeNew(join(dir, 'contract.json'), `${JSON.stringify(task, null, 2)}\n`);
    return { task: task.id, path: `${taskPath(task.id)}/contract.json` };
  });
}
export async function reviseTask(p: Project, id: string, input: unknown, reason: string) {
  if (!reason.trim()) throw new Error('Revision reason is required');
  return withLock(p.root, async () => {
    p = await project(p.root);
    const task = validateTask(input, p.config);
    if (task.id !== id) throw new Error('Revision cannot change task ID');
    const nextDigest = await taskBinding(p.root, task);
    const previous = await readJson(await boundedPath(p.root, `${taskPath(id)}/contract.json`));
    if (parseTask(previous).id !== id) throw new Error('Task ID does not match its directory');
    const revisions = await makePrivateDir(p.root, `${taskPath(id)}/revisions`);
    const revision = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
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
    const temporary = await boundedPath(
      p.root,
      `${taskPath(id)}/.contract-${randomUUID()}.tmp`,
      true,
    );
    await writeNew(temporary, `${JSON.stringify(task, null, 2)}\n`);
    await rename(temporary, await boundedPath(p.root, `${taskPath(id)}/contract.json`));
    return {
      task: id,
      revision,
      effect:
        'Previous contract preserved. Checkpoints and receipts with a different binding require reconciliation. No code or commands replayed.',
    };
  });
}
export async function checkpoint(p: Project, id: string, input: unknown) {
  p = await project(p.root);
  const note = checkpointInputSchema.parse(input);
  if (note.state === 'blocked' && note.blockers.length === 0)
    throw new Error('Blocked checkpoint requires a concrete blocker');
  return withLock(p.root, async () => {
    const { taskDigest } = await readTask(p, id);
    const previous = await readCheckpoint(p.root, id);
    const record = checkpointSchema.parse({
      version: 1,
      sequence: previous.sequence + 1,
      createdAt: new Date().toISOString(),
      taskId: id,
      configDigest: p.configDigest,
      taskDigest,
      sources: (await fingerprintSources(p)).map(({ id, digest }) => ({ id, digest })),
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
