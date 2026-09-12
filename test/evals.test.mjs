import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './helpers.mjs';

test('evaluation preparation copies raw inputs without starting an agent or leaking expected answers', async () => {
  for (const scenario of ['greenfield', 'brownfield']) {
    const result = spawnSync(process.execPath, ['evals/prepare.mjs', scenario], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const prepared = JSON.parse(result.stdout);
    assert.equal(prepared.executed, false);
    const request = await readFile(prepared.request, 'utf8');
    assert.ok(request.length > 200);
    assert.doesNotMatch(request, /expected answer|fix the predicate|evaluator criteria/);
    const skill = await readFile(join(prepared.skill, 'SKILL.md'), 'utf8');
    assert.equal(skill, await readFile(join(root, 'skills/clinx-delivery/SKILL.md'), 'utf8'));
    assert.ok(JSON.parse(await readFile(prepared.inputs, 'utf8')).hashes['request.md']);
    const files = await readdir(prepared.workspace);
    if (scenario === 'greenfield') assert.deepEqual(files, []);
    else {
      assert.ok(files.includes('catalog.mjs'));
      assert.ok(!files.includes('.clinx'));
      assert.ok(!files.includes('clinx'));
      assert.ok(!files.includes('clinx.config.json'));
      assert.equal(
        await readFile(join(prepared.workspace, 'catalog.mjs'), 'utf8'),
        await readFile(join(root, 'examples/node-picker/catalog.mjs'), 'utf8'),
      );
    }
  }
});
test('evaluation arms receive identical raw projects without clinx task guidance', async () => {
  for (const scenario of ['brownfield', 'cold-start', 'bulk-reset']) {
    let raw;
    for (const variant of ['baseline', 'skill', 'recorded']) {
      const result = spawnSync(process.execPath, ['evals/prepare.mjs', scenario, variant], {
        cwd: root,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const prepared = JSON.parse(result.stdout);
      const inputs = JSON.parse(await readFile(prepared.inputs, 'utf8'));
      const projectFiles = Object.fromEntries(
        Object.entries(inputs.hashes).filter(([p]) => p.startsWith('project/')),
      );
      if (raw) assert.deepEqual(projectFiles, raw);
      raw = projectFiles;
      assert.ok(!Object.keys(projectFiles).some((p) => /clinx|contract\.json|scenarios/.test(p)));
      if (scenario === 'brownfield')
        assert.doesNotMatch(
          await readFile(join(prepared.workspace, 'README.md'), 'utf8'),
          /clinx|obligation|receipt/i,
        );
      if (prepared.cli) {
        assert.ok(prepared.cli.includes('/tools/clinx/bin/'));
        assert.ok(
          !Object.keys(inputs.hashes).some((p) => /tools\/clinx\/(evals|examples|src)\//.test(p)),
        );
        const help = spawnSync(process.execPath, [prepared.cli, '--help'], { encoding: 'utf8' });
        assert.equal(help.status, 0, help.stderr);
      }
    }
  }
});
