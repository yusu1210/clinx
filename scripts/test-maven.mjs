import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { copyExample, json } from '../test/helpers.mjs';
import { project } from '../dist/project.js';
import { verify } from '../dist/verify.js';

const dir = await copyExample('maven-reactor');
process.stdout.write(`Testing an isolated Maven reactor: ${dir}\n`);
const run = await verify(await project(dir), 'shared-policy');
if (run.verdict.decision !== 'supported') {
  process.stderr.write(`Inspect ${join(dir, run.receipt)} and sibling stdout/stderr logs\n`);
  throw new Error(JSON.stringify(run.verdict));
}
const receipt = JSON.parse(await readFile(join(dir, run.receipt), 'utf8'));
assert.equal(receipt.checks[0].summary.passed, 3);
assert.equal(receipt.checks[0].summary.skipped, 0);
const config = JSON.parse(await readFile(join(dir, 'clinx.config.json'), 'utf8'));
config.checks[0].command = [process.execPath, '-e', 'process.exit(0)'];
await json(join(dir, 'clinx.config.json'), config);
const control = await verify(await project(dir), 'shared-policy');
assert.equal(control.verdict.decision, 'unresolved');
process.stdout.write(
  'PASS: 3 named tests across 2 Maven modules; unchanged-report negative control rejected.\n',
);
