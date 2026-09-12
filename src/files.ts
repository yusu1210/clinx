import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  stat,
  unlink,
} from 'node:fs/promises';
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Config, Source } from './schema.js';

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
export function inside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}
export async function boundedPath(root: string, input: string, missing = false): Promise<string> {
  const base = await realpath(root);
  const target = resolve(base, input);
  if (!inside(base, target)) throw new Error(`Path escapes source root: ${input}`);
  let current = base;
  for (const part of relative(base, target).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`Symlink paths are not supported: ${input}`);
    } catch (error) {
      if (missing && (error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
  }
  return target;
}
export async function readBounded(file: string, limit = MAX_FILE_BYTES): Promise<Buffer> {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > MAX_FILE_BYTES)
    throw new Error('Invalid read limit');
  // Nonblocking open lets fstat reject FIFOs before a writer can stall the reader.
  const handle = await open(
    file,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw new Error(`Not a regular bounded file: ${file}`);
    // One extra byte detects growth without allocating the maximum for every file.
    const buffer = Buffer.alloc(info.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const result = await handle.read(buffer, size, buffer.length - size, null);
      if (result.bytesRead === 0) break;
      size += result.bytesRead;
    }
    if (size > limit) throw new Error(`File exceeds ${limit} bytes: ${file}`);
    if (size !== info.size) throw new Error(`File changed while reading: ${file}`);
    return buffer.subarray(0, size);
  } finally {
    await handle.close();
  }
}
export async function readJson(file: string): Promise<unknown> {
  return JSON.parse((await readBounded(file)).toString('utf8'));
}
export async function writeNew(file: string, value: string | Uint8Array): Promise<void> {
  if (Buffer.byteLength(value) > MAX_FILE_BYTES)
    throw new Error(`File exceeds ${MAX_FILE_BYTES} bytes: ${file}`);
  // Publish only complete bytes. A same-directory hard link atomically claims a new
  // name without overwriting a concurrent writer, unlike rename. A crash can leave
  // a temporary file; readers must never treat it as a completed record.
  const temporary = join(dirname(file), `.clinx-write-${randomUUID()}.tmp`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    try {
      await handle.writeFile(value);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await link(temporary, file);
  } finally {
    await unlink(temporary);
  }
}
export async function sourceRoots(root: string, config: Config): Promise<Map<string, string>> {
  const roots = new Map<string, string>();
  for (const source of config.sources) {
    // Explicit source paths may name sibling repositories. Paths within them may not escape.
    const location = await realpath(resolve(root, source.path));
    if (!(await stat(location)).isDirectory())
      throw new Error(`Not a source directory: ${source.id}`);
    roots.set(source.id, location);
  }
  if (new Set(roots.values()).size !== roots.size)
    throw new Error('Sources must not alias the same directory');
  return roots;
}
export async function fingerprint(
  root: string,
  source: Source,
): Promise<{ digest: string; files: number }> {
  root = await realpath(root);
  const entries = new Map<string, string>();
  const visited = new Set<string>();
  let total = 0;
  const excluded = source.exclude.map((p) => resolve(root, p));
  if (excluded.some((p) => !inside(root, p) || p === root))
    throw new Error('Exclusions must be below the source root');
  const visit = async (file: string): Promise<void> => {
    if (excluded.some((p) => inside(p, file))) return;
    if (visited.has(file)) return;
    visited.add(file);
    if (visited.size > 50000)
      throw new Error('Input scope too large; declare focused source inputs');
    const rel = relative(root, file).split(sep).join('/');
    const info = await lstat(file, { bigint: true });
    if (info.isSymbolicLink()) throw new Error(`Cannot fingerprint symlink input: ${rel}`);
    if (info.isDirectory()) {
      entries.set(`${rel}/`, 'directory');
      for (const child of (await readdir(file)).sort()) await visit(join(file, child));
    } else if (info.isFile()) {
      if (entries.has(rel)) return;
      const content = await readBounded(file);
      const after = await lstat(file, { bigint: true });
      if (info.mtimeNs !== after.mtimeNs || info.size !== after.size || info.ino !== after.ino)
        throw new Error(`Input changed while reading: ${rel}`);
      total += content.length;
      if (total > 128 * 1024 * 1024)
        throw new Error('Input scope too large; declare focused source inputs');
      entries.set(rel, `${info.mode & 0o111n}:${sha256(content)}`);
    } else throw new Error(`Unsupported input type: ${rel}`);
  };
  for (const input of source.inputs) {
    const file = await boundedPath(root, input);
    if (excluded.some((p) => inside(p, file)))
      throw new Error(`Explicit input is excluded: ${source.id}:${input}`);
    await visit(file);
  }
  const files = [...entries.keys()].filter((p) => !p.endsWith('/')).length;
  if (files === 0) throw new Error(`${source.id}: input scope contains no files`);
  return {
    digest: sha256(canonical([...entries].sort(([a], [b]) => a.localeCompare(b, 'en')))),
    files,
  };
}
export async function findExecutable(command: string, cwd: string): Promise<string | null> {
  const candidates = command.includes(sep)
    ? [isAbsolute(command) ? command : `${cwd}${sep}${command}`]
    : (process.env.PATH ?? '/usr/bin:/bin')
        .split(delimiter)
        .map((p) => `${isAbsolute(p) ? p : `${cwd}${sep}${p}`}${sep}${command}`);
  for (const candidate of candidates) {
    try {
      if (!(await stat(candidate)).isFile()) continue;
      await access(candidate, constants.X_OK);
      // A symlink's invocation path can select a runtime or tool personality.
      // Resolve PATH relative to the child cwd, but never replace the selected path.
      return candidate;
    } catch {
      /* Not present/executable: report a capability gap, never install. */
    }
  }
  return null;
}
export async function makePrivateDir(root: string, path: string): Promise<string> {
  const target = await boundedPath(root, path, true);
  await mkdir(target, { recursive: true, mode: 0o700 });
  await boundedPath(root, path);
  return target;
}
export async function withLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const dir = await makePrivateDir(root, '.clinx');
  const lock = join(dir, 'write.lock');
  try {
    await writeNew(lock, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error(
        'Another clinx writer holds .clinx/write.lock. If it crashed, inspect the PID and remove only that lock after confirming no writer remains.',
      );
    throw error;
  }
  try {
    return await action();
  } finally {
    await unlink(lock);
  }
}
