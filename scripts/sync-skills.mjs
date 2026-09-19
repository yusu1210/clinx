import { readFile, writeFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Knowledge owns these rules; delivery carries identical self-contained copies.
export const sharedReferences = ['knowledge.md', 'code-intelligence.md', 'project-context.md'];
export async function syncSkills(root, write = false) {
  for (const name of sharedReferences) {
    const source = join(root, 'skills/clinx-knowledge/references', name);
    const target = join(root, 'skills/clinx-delivery/references', name);
    const expected = await readFile(source);
    let actual;
    try {
      actual = await readFile(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (actual?.equals(expected)) continue;
    if (!write) throw new Error(`Shared Skill reference differs: ${name}; run npm run skills:sync`);
    await writeFile(target, expected);
  }
}
if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => null)) ===
    (await realpath(fileURLToPath(import.meta.url)))
) {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--write'))
    throw new Error('Usage: node scripts/sync-skills.mjs [--write]');
  await syncSkills(fileURLToPath(new URL('../', import.meta.url)), process.argv[2] === '--write');
}
