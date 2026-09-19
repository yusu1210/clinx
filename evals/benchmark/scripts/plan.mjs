import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { action, materials, scenarios, arms, validatePlan } from './identity.mjs';

const [root, output, selected = 'all', count = '1'] = process.argv.slice(2);
const repeats = Number(count);
if (!root || !output || !Number.isInteger(repeats) || repeats < 1 || repeats > 5)
  throw new Error('Usage: plan.mjs ROOT OUTPUT SCENARIO|all REPEATS:1..5');
const runs = [];
for (const scenario of selected === 'all' ? scenarios : [selected])
  for (const arm of arms)
    for (let rep = 1; rep <= repeats; rep++) runs.push({ scenario, arm, rep });
const plan = validatePlan({
  version: 1,
  experiment: {
    version: 1,
    id: process.env.BENCHMARK_ID,
    model: process.env.BENCHMARK_MODEL,
    effort: process.env.BENCHMARK_EFFORT,
    action,
    sourceRevision: process.env.BENCHMARK_REVISION,
    materials: await materials(resolve(root)),
  },
  runs,
});
await writeFile(resolve(output), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ include: runs }));
