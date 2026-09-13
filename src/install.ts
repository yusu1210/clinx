import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { boundedPath, makePrivateDir, readBounded, withLock, writeNew } from './files.js';
import { version } from './version.js';
const packageAsset = (...parts: string[]) => join(import.meta.dirname, '..', ...parts);
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
    await readBounded(packageAsset('templates', 'workspace', 'clinx', 'agent-entry.md')),
  );
  await collect(
    packageAsset('skills', 'clinx-delivery'),
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
