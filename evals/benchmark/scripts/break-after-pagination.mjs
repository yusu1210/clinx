import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const project = resolve(process.argv[2]);
const path = join(project, 'api/src/query.mjs');
let code = await readFile(path, 'utf8');
code = code.replace(
  'const filtered = tier === undefined ? eligible : eligible.filter((campaign) => campaign.tier === tier);\n  const start = (page - 1) * size;\n  return {\n    rows: filtered.slice(start, start + size).map(publicCampaign),\n    total: filtered.length',
  'const start = (page - 1) * size;\n  const pageRows = eligible.slice(start, start + size);\n  const filtered = tier === undefined ? pageRows : pageRows.filter((campaign) => campaign.tier === tier);\n  return {\n    rows: filtered.map(publicCampaign),\n    total: tier === undefined ? eligible.length : filtered.length',
);
await writeFile(path, code);
