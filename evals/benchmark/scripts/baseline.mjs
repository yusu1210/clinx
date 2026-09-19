import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixture = fileURLToPath(new URL('../fixture/', import.meta.url));
export const repositories = ['api', 'policy', 'console', 'analytics'];
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Evaluator-owned source bytes, independent of candidate commits and Git config.
// No symlink traversal. Added/deleted files and file kinds also count as changes.
export async function snapshot(directory) {
  const files = Object.create(null);
  async function walk(path, prefix = '') {
    for (const name of (await readdir(path)).sort()) {
      if (name === '.git') continue;
      const key = prefix + name;
      const target = join(path, name);
      const stat = await lstat(target);
      if (stat.isSymbolicLink()) files[key] = `link:${await readlink(target)}`;
      else if (stat.isDirectory()) await walk(target, `${key}/`);
      else if (stat.isFile())
        files[key] = `file:${stat.mode & 0o111}:${digest(await readFile(target))}`;
      else files[key] = 'special';
    }
  }
  if (!(await lstat(directory)).isDirectory())
    throw new Error('Expected a real repository directory');
  await walk(directory);
  return files;
}

export function driftFile(repo, path, text) {
  if (repo === 'policy' && path === 'src/rules.mjs')
    return text.replace(
      'export function eligibleCampaigns',
      'export function listEligibleCampaigns',
    );
  if (repo === 'policy' && path === 'test/policy.test.mjs')
    return text
      .replace('eligibleCampaigns }', 'listEligibleCampaigns }')
      .replace('eligibleCampaigns({', 'listEligibleCampaigns({');
  if (repo === 'analytics' && path === 'events.json')
    return '{"events":["campaign-view","campaign-open","campaign-export"]}\n';
  return text;
}

export async function changes(project, repo, drift = false) {
  const expected = await snapshot(join(fixture, repo));
  if (drift) {
    for (const path of Object.keys(expected)) {
      const before = await readFile(join(fixture, repo, path), 'utf8');
      const after = driftFile(repo, path, before);
      if (before !== after) expected[path] = expected[path].replace(/[a-f0-9]{64}$/, digest(after));
    }
  }
  const actual = await snapshot(join(project, repo));
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    .sort()
    .filter((path) => expected[path] !== actual[path]);
}
