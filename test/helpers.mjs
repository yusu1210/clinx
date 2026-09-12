import { mkdtemp, mkdir, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const bin = join(root, 'bin/clinx.mjs');
export const json = (path, data) => put(path, JSON.stringify(data, null, 2));
export async function put(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}
export const xml =
  '<testsuite name="unit" tests="1"><testcase classname="C" name="works"/></testsuite>';
export const config = () => ({
  version: 1,
  name: 'fixture',
  sources: [{ id: 'main', path: '.', inputs: ['src', 'clinx.config.json'] }],
  checks: [
    {
      id: 'unit',
      source: 'main',
      description: 'fixture',
      command: [process.execPath, '-e', `process.stdout.write(${JSON.stringify(xml)})`],
      result: { format: 'junit', from: 'stdout', expectedTests: ['C#works'] },
    },
  ],
});
export const contract = () => ({
  version: 1,
  id: 'change',
  title: 'Fixture change',
  outcome: 'Observe expected behavior',
  mode: 'implementation',
  scope: ['Synthetic source'],
  defaultClaim: 'local',
  claims: ['local'],
  obligations: [
    { id: 'behavior', description: 'expected behavior', claims: ['local'], checks: ['unit'] },
  ],
});
export async function fixture(edit) {
  const dir = await mkdtemp(join(tmpdir(), 'clinx-test-'));
  const c = config();
  if (edit) edit(c);
  await json(join(dir, 'clinx.config.json'), c);
  await put(join(dir, 'src/input.txt'), 'baseline');
  await json(join(dir, 'clinx/tasks/change/contract.json'), contract());
  return dir;
}
export function cli(dir, ...args) {
  // A child CLI is a fresh invocation, not a worker of this test runner.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, [bin, '--root', dir, ...args], {
    encoding: 'utf8',
    timeout: 15000,
    env,
  });
  if (run.error) throw run.error;
  return { status: run.status, out: run.stdout ? JSON.parse(run.stdout) : null, err: run.stderr };
}
export async function copyExample(name) {
  const dir = await mkdtemp(join(tmpdir(), `clinx-${name}-`));
  await cp(join(root, 'examples', name), dir, {
    recursive: true,
    filter: (p) => !p.split('/').some((n) => n === '.clinx' || n === 'target'),
  });
  return dir;
}
