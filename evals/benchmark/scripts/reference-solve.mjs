import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const project = resolve(process.argv[2]);
const policy = await readFile(join(project, 'policy/src/rules.mjs'), 'utf8');
const ownerName = policy.includes('export function listEligibleCampaigns')
  ? 'listEligibleCampaigns'
  : 'eligibleCampaigns';

let query = await readFile(join(project, 'api/src/query.mjs'), 'utf8');
if (ownerName === 'listEligibleCampaigns')
  query = query.replaceAll('eligibleCampaigns', 'listEligibleCampaigns');
if (!query.includes('tier, page = 1')) {
  query = query
    .replace(
      /export function queryCampaigns\(\{ tenant, region, page = 1, size = 20 \}\) \{/,
      'export function queryCampaigns({ tenant, region, tier, page = 1, size = 20 }) {',
    )
    .replace(
      /const eligible = (?:eligibleCampaigns|listEligibleCampaigns)\(\{ tenant, region \}\);\n  const start/,
      `const eligible = ${ownerName}({ tenant, region });\n  const filtered = tier === undefined ? eligible : eligible.filter((campaign) => campaign.tier === tier);\n  const start`,
    )
    .replace(
      'rows: eligible.slice(start, start + size).map(publicCampaign),\n    total: eligible.length',
      'rows: filtered.slice(start, start + size).map(publicCampaign),\n    total: filtered.length',
    );
}
await writeFile(join(project, 'api/src/query.mjs'), query);

let server = await readFile(join(project, 'api/src/server.mjs'), 'utf8');
if (!server.includes('const hasTier =')) {
  server = server
    .replace(
      "const size = positiveInt(url.searchParams.get('size'), 20);",
      "const size = positiveInt(url.searchParams.get('size'), 20);\n    const hasTier = url.searchParams.has('tier');\n    const tier = hasTier ? url.searchParams.get('tier') : undefined;",
    )
    .replace(
      "if (typeof tenant !== 'string' || typeof region !== 'string' || page === null || size === null || size > 50) {",
      "if (typeof tenant !== 'string' || typeof region !== 'string' || page === null || size === null || size > 50 || tier === '') {",
    )
    .replace(
      'const result = queryCampaigns({ tenant, region, page, size });',
      'const result = queryCampaigns({ tenant, region, tier, page, size });',
    );
}
await writeFile(join(project, 'api/src/server.mjs'), server);

let client = await readFile(join(project, 'console/src/client.mjs'), 'utf8');
if (!client.includes('size = 20, tier')) {
  client = client
    .replace(
      'export function campaignUrl(baseUrl, { page = 1, size = 20 } = {}) {',
      'export function campaignUrl(baseUrl, { page = 1, size = 20, tier } = {}) {',
    )
    .replace(
      "url.searchParams.set('size', String(size));\n  return url;",
      "url.searchParams.set('size', String(size));\n  if (tier !== undefined) url.searchParams.set('tier', tier);\n  return url;",
    )
    .replace(
      '{ tenant, region, page = 1, size = 20 } = {},',
      '{ tenant, region, page = 1, size = 20, tier } = {},',
    )
    .replace(
      'return fetchImpl(campaignUrl(baseUrl, { page, size }), {',
      'return fetchImpl(campaignUrl(baseUrl, { page, size, tier }), {',
    );
}
await writeFile(join(project, 'console/src/client.mjs'), client);
