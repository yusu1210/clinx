import { lstat, readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { digest, repositories } from './baseline.mjs';

// Evaluator-only capture. No fixed task layout, symlink traversal or CLI dependency.
// Source repositories are checked separately for the design-only boundary.
const excluded = new Set([
  ...repositories,
  '.git',
  '.benchmark',
  '.agents',
  '.clinx',
  'node_modules',
  'tools',
]);
const limits = { entries: 4096, files: 256, bytes: 2 * 1024 * 1024 };

export async function captureDesignRecords(project) {
  const files = [];
  let entries = 0;
  let bytes = 0;
  async function walk(directory, prefix = '') {
    for (const name of (await readdir(directory)).sort()) {
      if (++entries > limits.entries) throw new Error('Design record entry limit exceeded');
      if (excluded.has(name)) continue;
      const path = join(directory, name);
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) continue;
      const relative = prefix + name;
      if (stat.isDirectory()) await walk(path, relative + '/');
      else if (stat.isFile() && ['.md', '.txt', '.json'].includes(extname(name))) {
        if (files.length >= limits.files || bytes + stat.size > limits.bytes)
          throw new Error('Design record size limit exceeded');
        const content = await readFile(path);
        bytes += content.length;
        if (bytes > limits.bytes) throw new Error('Design record size limit exceeded');
        files.push({ path: relative, sha256: digest(content), text: content.toString('utf8') });
      }
    }
  }
  await walk(project);
  return { version: 1, files };
}
