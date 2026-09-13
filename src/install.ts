import { randomUUID } from 'node:crypto';
import { readdir, realpath, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  boundedPath,
  compareText,
  makePrivateDir,
  readBounded,
  sha256,
  withLock,
  writeNew,
} from './files.js';
import { CliError } from './output.js';
import { version } from './version.js';

const packageAsset = (...parts: string[]) => join(import.meta.dirname, '..', ...parts);
const recordPath = 'clinx/installation.json';
const entryPath = 'clinx/agent-entry.md';
type Agent = 'codex' | 'generic';
const skillPath = (agent: Agent) =>
  agent === 'codex' ? '.agents/skills/clinx-delivery' : 'clinx/skills/clinx-delivery';
const fileSchema = z
  .object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), owned: z.boolean() })
  .strict();
const installationSchema = z
  .object({
    schemaVersion: z.literal(1),
    agent: z.enum(['codex', 'generic']),
    packageVersion: z.string().min(1).max(100),
    files: z.array(fileSchema).min(1).max(256),
  })
  .strict();
type Installation = z.infer<typeof installationSchema>;
type Change = {
  path: string;
  status: 'create' | 'identical' | 'update' | 'remove' | 'missing' | 'preserve' | 'conflict';
  owned: boolean;
  before: Buffer | null;
  after: Buffer | null;
};

async function optionalFile(root: string, path: string): Promise<Buffer | null> {
  try {
    return await readBounded(await boundedPath(root, path, true));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
async function installation(root: string) {
  const bytes = await optionalFile(root, recordPath);
  if (!bytes) return { bytes, record: null };
  let input: unknown;
  try {
    input = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new CliError(
      'INSTALLATION_INVALID',
      'Invalid installation record',
      'Inspect clinx/installation.json locally; do not delete it to bypass ownership checks.',
    );
  }
  const record = installationSchema.parse(input);
  const prefix = skillPath(record.agent) + '/';
  if (
    new Set(record.files.map((f) => f.path)).size !== record.files.length ||
    record.files.some(
      (f) =>
        f.path !== entryPath &&
        (!f.path.startsWith(prefix) ||
          !f.path
            .slice(prefix.length)
            .split('/')
            .every((part) => /^[a-zA-Z0-9_.-]+$/.test(part) && part !== '.' && part !== '..')),
    )
  )
    throw new CliError(
      'INSTALLATION_INVALID',
      'Invalid installation ownership paths',
      'Only the Skill tree and clinx/agent-entry.md may be managed.',
    );
  return { bytes, record };
}
async function assets(agent: Agent) {
  const files = new Map<string, Buffer>();
  files.set(entryPath, await readBounded(packageAsset('templates', 'workspace', entryPath)));
  const collect = async (from: string, to: string) => {
    for (const item of (await readdir(from, { withFileTypes: true })).sort((a, b) =>
      compareText(a.name, b.name),
    )) {
      if (item.isDirectory()) await collect(join(from, item.name), to + '/' + item.name);
      else if (item.isFile())
        files.set(to + '/' + item.name, await readBounded(join(from, item.name)));
      else throw new Error('Unsupported packaged asset');
    }
  };
  await collect(packageAsset('skills', 'clinx-delivery'), skillPath(agent));
  return files;
}

async function plan(root: string, action: 'init' | 'update' | 'remove', agent?: Agent) {
  const saved = await installation(root);
  if (action !== 'init' && !saved.record)
    throw new CliError(
      'INSTALLATION_MISSING',
      'No managed Skill installation',
      'Use clinx init for a new installation. Existing unrecorded files remain user-owned; do not fabricate an ownership record.',
    );
  agent ??= saved.record?.agent ?? 'generic';
  if (saved.record && saved.record.agent !== agent)
    throw new CliError(
      'INSTALLATION_CONFLICT',
      'A different Skill placement is already managed',
      'Keep the existing placement, or review skill remove before initializing another placement.',
    );
  const packaged = await assets(agent);
  const previous = new Map(saved.record?.files.map((f) => [f.path, f]) ?? []);
  const changes: Change[] = [];
  const next: Installation = { schemaVersion: 1, agent, packageVersion: version, files: [] };
  const paths = [...new Set([...packaged.keys(), ...previous.keys()])].sort(compareText);
  for (const path of paths) {
    const before = await optionalFile(root, path);
    const desired = packaged.get(path) ?? null;
    const tracked = previous.get(path);
    const owned = tracked?.owned ?? (action !== 'remove' && before === null);
    const intact = before !== null && tracked?.sha256 === sha256(before);
    let status: Change['status'];
    let after = before;
    if (action === 'remove') {
      status = !tracked?.owned ? 'preserve' : !before ? 'missing' : intact ? 'remove' : 'conflict';
      if (status === 'remove') after = null;
    } else if (action === 'init') {
      status = !desired
        ? 'preserve'
        : before?.equals(desired)
          ? 'identical'
          : before
            ? 'conflict'
            : 'create';
      if (status === 'create') after = desired;
    } else if (!desired) {
      status = !tracked?.owned ? 'preserve' : !before ? 'missing' : intact ? 'remove' : 'conflict';
      if (status === 'remove') after = null;
    } else if (before?.equals(desired)) status = 'identical';
    else if (tracked && !tracked.owned) status = 'preserve';
    else if (!before) {
      status = 'create';
      after = desired;
    } else if (intact) {
      status = 'update';
      after = desired;
    } else status = 'conflict';
    changes.push({ path, status, owned, before, after });
    if (action !== 'remove' && desired)
      next.files.push({
        path,
        sha256: !owned && tracked ? tracked.sha256 : sha256(desired),
        owned,
      });
  }
  // init cannot reset an earlier ownership baseline or implicitly upgrade.
  if (action === 'init' && saved.record) {
    if (
      saved.record.packageVersion !== version ||
      changes.some((c) => c.status !== 'identical' && c.status !== 'preserve')
    )
      throw new CliError(
        'INSTALLATION_EXISTS',
        'Skill installation already exists',
        'Run clinx skill status, then clinx skill update to review the packaged changes.',
      );
  }
  return { saved, agent, changes, next: action === 'init' && saved.record ? saved.record : next };
}

const equal = (a: Buffer | null, b: Buffer | null) =>
  a === null ? b === null : b !== null && a.equals(b);
async function replace(root: string, path: string, before: Buffer | null, after: Buffer | null) {
  if (!equal(await optionalFile(root, path), before))
    throw new CliError(
      'INSTALLATION_CHANGED',
      'File changed during operation: ' + path,
      'Stop concurrent editors/writers, inspect the file and preview again.',
    );
  if (equal(before, after)) return;
  if (!after) {
    await unlink(await boundedPath(root, path));
    return;
  }
  await makePrivateDir(root, dirname(path));
  if (!before) {
    await writeNew(await boundedPath(root, path, true), after);
    return;
  }
  const staged = path + '.' + randomUUID() + '.tmp';
  await writeNew(await boundedPath(root, staged, true), after);
  try {
    if (!equal(await optionalFile(root, path), before))
      throw new Error('File changed during operation: ' + path);
    await rename(await boundedPath(root, staged), await boundedPath(root, path));
  } finally {
    try {
      await unlink(await boundedPath(root, staged, true));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
function rejectConflicts(changes: Change[]) {
  const conflicts = changes.filter((c) => c.status === 'conflict');
  if (conflicts.length)
    throw new CliError(
      'INSTALLATION_CONFLICT',
      'Existing files differ; nothing written: ' + conflicts.map((c) => c.path).join(', '),
      'Review the preview and merge or move the intended files manually. There is no force-overwrite option.',
    );
}
async function applyPlan(root: string, action: 'init' | 'update' | 'remove', agent?: Agent) {
  // Fail before creating a lock if the preview already has conflicts.
  rejectConflicts((await plan(root, action, agent)).changes);
  return withLock(root, async () => {
    const p = await plan(root, action, agent);
    rejectConflicts(p.changes);
    const afterRecord =
      action === 'remove'
        ? null
        : Buffer.from(JSON.stringify(installationSchema.parse(p.next), null, 2) + '\n');
    const changes = [
      ...p.changes.filter((c) => !equal(c.before, c.after)),
      { path: recordPath, before: p.saved.bytes, after: afterRecord },
    ].filter((c) => !equal(c.before, c.after));
    const backup = changes.some((c) => c.before) ? 'clinx/install-backups/' + randomUUID() : null;
    if (backup) {
      for (const change of changes.filter((c) => c.before)) {
        await makePrivateDir(root, backup + '/' + dirname(change.path));
        await writeNew(await boundedPath(root, backup + '/' + change.path, true), change.before!);
      }
      await writeNew(
        await boundedPath(root, backup + '/operation.json', true),
        JSON.stringify(
          {
            action,
            files: changes.map((c) => ({
              path: c.path,
              before: c.before ? sha256(c.before) : null,
              after: c.after ? sha256(c.after) : null,
            })),
          },
          null,
          2,
        ),
      );
    }
    const completed: typeof changes = [];
    try {
      for (const change of changes) {
        await replace(root, change.path, change.before, change.after);
        completed.push(change);
      }
    } catch (error) {
      const unrestored: string[] = [];
      for (const change of completed.reverse()) {
        try {
          await replace(root, change.path, change.after, change.before);
        } catch {
          unrestored.push(change.path);
        }
      }
      throw new CliError(
        'INSTALLATION_WRITE_FAILED',
        'Installation write failed: ' + (error instanceof Error ? error.message : String(error)),
        (unrestored.length
          ? 'Restore after inspection: ' + unrestored.join(', ') + '. '
          : 'Completed file changes were rolled back. ') +
          (backup
            ? 'Original files are in ' + backup + '. '
            : 'Inspect any remaining empty directories. ') +
          'A crash or concurrent external writer requires manual reconciliation.',
      );
    }
    return { p, backup };
  });
}
async function operate(
  root: string,
  action: 'init' | 'update' | 'remove',
  apply: boolean,
  agent?: Agent,
) {
  root = await realpath(root);
  const { p, backup } = apply
    ? await applyPlan(root, action, agent)
    : { p: await plan(root, action, agent), backup: null };
  return {
    action,
    applied: apply,
    root,
    origin: { name: 'clinx', version },
    agent: p.agent,
    installedVersion: apply
      ? action === 'remove'
        ? null
        : p.next.packageVersion
      : (p.saved.record?.packageVersion ?? null),
    installationRecord: recordPath,
    backup,
    files: p.changes.map(({ path, status, owned }) => ({ path, status, owned })),
    next:
      action === 'remove'
        ? 'Only unchanged managed files are removed on apply. Backups, unmanaged files, task records, configuration and host instructions remain. The CLI itself stays installed.'
        : 'Use clinx-delivery with the PRD and project paths. Skill files are not proof of host discovery or project readiness. No configuration, map, guide or task was generated. Use existing tools; let the agent prepare reviewed inputs and checks only when CLI records help. Add .clinx/ and clinx/install-backups/ to your existing private-output ignore policy.',
  };
}
export const init = (root: string, agent: Agent | undefined, apply: boolean) =>
  operate(root, 'init', apply, agent);
export async function manageSkill(
  root: string,
  action: 'status' | 'update' | 'remove',
  apply = false,
) {
  if (action !== 'status') return operate(root, action, apply);
  root = await realpath(root);
  const { record } = await installation(root);
  if (!record)
    return {
      root,
      managed: false,
      packageVersion: version,
      installedVersion: null,
      next: 'No installation record. Existing Skill files, if any, are user-owned. Run clinx init to preview a new installation; this command does not inspect host discovery.',
    };
  const packaged = await assets(record.agent);
  const files = [];
  for (const path of [...new Set([...packaged.keys(), ...record.files.map((f) => f.path)])].sort(
    compareText,
  )) {
    const current = await optionalFile(root, path);
    const tracked = record.files.find((f) => f.path === path);
    const desired = packaged.get(path);
    files.push({
      path,
      owned: tracked?.owned ?? false,
      local: !current
        ? 'missing'
        : !tracked
          ? 'unmanaged'
          : sha256(current) === tracked.sha256
            ? 'unchanged'
            : 'modified',
      matchesPackage: desired ? (current?.equals(desired) ?? false) : current === null,
    });
  }
  return {
    root,
    managed: true,
    agent: record.agent,
    packageVersion: version,
    installedVersion: record.packageVersion,
    matchesPackage: files.every((f) => f.matchesPackage),
    files,
    next: 'Use skill update to preview bundled changes. This is a local ownership record, not an attestation or a check of host discovery. Never edit recorded hashes to bypass conflicts.',
  };
}
