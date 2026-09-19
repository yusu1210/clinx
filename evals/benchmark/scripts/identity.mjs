import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest, snapshot } from './baseline.mjs';

export const action = 'openai/codex-action@86365089eb2b84e0a8fb0717b304f8bdcb13b20e';
export const scenarios = ['campaign-cross-repo', 'campaign-resume-drift', 'campaign-confirmation'];
export const arms = ['baseline', 'skill', 'skill-cli'];
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const canonical = (value) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
export const same = (a, b) => canonical(a) === canonical(b);

// Evaluator inputs, including prompt/transition/grader code and the distributable
// runtime. Candidate output and machine-local absolute paths are never included.
export async function materials(root) {
  const tree = async (path) => digest(canonical(await snapshot(join(root, path))));
  const runtime = {};
  for (const path of [
    'bin',
    'dist',
    'src',
    'schemas',
    'templates',
    'skills',
    'docs',
    'examples',
    'evals/fixtures',
  ])
    runtime[path] = await tree(path);
  for (const path of ['package.json', 'npm-shrinkwrap.json', 'LICENSE'])
    runtime[path] = digest(await readFile(join(root, path)));
  // Match prepare's locked production closure, excluding dev dependencies.
  const lock = JSON.parse(await readFile(join(root, 'npm-shrinkwrap.json'), 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path || entry.dev) continue;
    if (
      !path.startsWith('node_modules/') ||
      path.split('/').some((p) => p === '..' || p === '.') ||
      entry.link
    )
      throw new Error('Unsupported runtime dependency path');
    runtime[path] = await tree(path);
  }
  return {
    fixture: await tree('evals/benchmark/fixture'),
    evaluator: digest(
      canonical({
        scripts: await tree('evals/benchmark/scripts'),
        workflow: await tree('evals/benchmark/workflow'),
      }),
    ),
    deliverySkill: await tree('skills/clinx-delivery'),
    runtime: digest(canonical(runtime)),
  };
}
export function validateExperiment(e) {
  if (
    !e ||
    e.version !== 1 ||
    !e.id?.trim() ||
    !e.model?.trim() ||
    !e.effort?.trim() ||
    e.action !== action ||
    !/^[a-f0-9]{40}$/.test(e.sourceRevision) ||
    !['fixture', 'evaluator', 'deliverySkill', 'runtime'].every((k) => sha(e.materials?.[k]))
  )
    throw new Error('Invalid experiment identity');
}
export function validatePlan(plan) {
  if (plan?.version !== 1 || !Array.isArray(plan.runs) || !plan.runs.length)
    throw new Error('Expected a versioned experiment plan with runs');
  validateExperiment(plan.experiment);
  const seen = new Set();
  for (const run of plan.runs) {
    if (
      !scenarios.includes(run.scenario) ||
      !arms.includes(run.arm) ||
      !Number.isInteger(run.rep) ||
      run.rep < 1
    )
      throw new Error('Invalid planned run');
    const key = `${run.scenario}/${run.arm}/${run.rep}`;
    if (seen.has(key)) throw new Error('Duplicate planned run');
    seen.add(key);
  }
  return plan;
}
export function validateProvenance(result, entry, experiment) {
  const p = result.provenance;
  if (
    !p ||
    !same(p.experiment, experiment) ||
    p.rep !== entry.rep ||
    p.scenario !== entry.scenario ||
    p.arm !== entry.arm ||
    !sha(p.baseInputSha256) ||
    !sha(p.inputSha256) ||
    !sha(p.promptSha256)
  )
    throw new Error('Result experiment, inputs or repetition does not match the plan');
}
