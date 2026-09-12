import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture, cli, put, json, xml, copyExample } from './helpers.mjs';
import { MAX_FILE_BYTES, readBounded } from '../dist/files.js';
import { execute } from '../dist/runner.js';

test('preview executes nothing and creates no run', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = [process.execPath, '-e', 'throw Error("must not execute")'];
  });
  assert.equal(cli(dir, 'verify', 'change').status, 0);
  await assert.rejects(readFile(join(dir, '.clinx/write.lock')), { code: 'ENOENT' });
});
test('successful evidence replays read-only, then becomes stale after a source edit', async () => {
  const dir = await fixture();
  const first = cli(dir, 'verify', 'change', '--run');
  assert.equal(first.status, 0, first.err);
  assert.equal(first.out.verdict.decision, 'supported');
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', first.out.receipt).status, 0);
  await put(join(dir, 'src/input.txt'), 'new');
  const stale = cli(dir, 'reconcile', 'change', '--receipt', first.out.receipt);
  assert.equal(stale.status, 2);
  assert.equal(stale.out.verdict.applicability, 'stale');
});
for (const [name, code, expected] of [
  ['nonzero', 'process.exit(7)', 1],
  ['malformed', 'process.stdout.write("not xml")', 2],
  ['zero cases', 'process.stdout.write(\'<testsuite tests="0"/>\')', 2],
  [
    'skipped',
    'process.stdout.write(\'<testsuite><testcase name="s"><skipped/></testcase></testsuite>\')',
    2,
  ],
  [
    'wrong identity',
    'process.stdout.write(\'<testsuite><testcase classname="Wrong" name="works"/></testsuite>\')',
    2,
  ],
  ['timeout', 'setInterval(() => {}, 1000)', 2],
  [
    'XML failure despite exit zero',
    'process.stdout.write(\'<testsuite><testcase name="f"><failure/></testcase></testsuite>\')',
    1,
  ],
  ['truncated stdout', 'process.stdout.write("a".repeat(3*1024*1024))', 2],
])
  test(`${name} cannot become a supported claim`, async () => {
    const dir = await fixture((c) => {
      c.checks[0].command = [process.execPath, '-e', code];
      if (name === 'timeout') c.checks[0].timeoutMs = 150;
    });
    assert.equal(cli(dir, 'verify', 'change', '--run').status, expected);
  });
test('missing executable is unresolved, not a successful check', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = ['clinx-deliberately-nonexistent-tool'];
  });
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 2);
});
test('external declarations require opt-in before any check executes', async () => {
  const dir = await fixture((c) => {
    c.checks[0].sideEffects = 'external';
  });
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 3);
  // Only the synthetic local command is run; this tests policy without external effects.
  assert.equal(cli(dir, 'verify', 'change', '--run', '--allow-external').status, 0);
});
test('file JUnit must be newly produced, not an old passing report', async () => {
  const dir = await fixture((c) => {
    c.checks[0].result = {
      format: 'junit',
      from: 'files',
      paths: ['.clinx/report.xml'],
      expectedTests: ['C#works'],
    };
    c.checks[0].command = [
      process.execPath,
      '-e',
      `require('fs').writeFileSync('.clinx/report.xml', ${JSON.stringify(xml)})`,
    ];
  });
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 0);
  const c = JSON.parse(await readFile(join(dir, 'clinx.config.json'), 'utf8'));
  c.checks[0].command = [process.execPath, '-e', 'process.exit(0)'];
  await json(join(dir, 'clinx.config.json'), c);
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 2);
});
test('changed or missing artifacts invalidate a receipt', async () => {
  const dir = await fixture();
  const r = cli(dir, 'verify', 'change', '--run');
  const receipt = JSON.parse(await readFile(join(dir, r.out.receipt), 'utf8'));
  await put(
    join(dir, '.clinx/runs', receipt.runId, receipt.checks[0].artifacts[0].path),
    'tampered',
  );
  assert.equal(
    cli(dir, 'reconcile', 'change', '--receipt', r.out.receipt).out.verdict.applicability,
    'stale',
  );
});
test('a modified pass flag cannot override malformed saved test output', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = [process.execPath, '-e', 'process.stdout.write("not XML")'];
  });
  const r = cli(dir, 'verify', 'change', '--run');
  assert.equal(r.status, 2);
  const path = join(dir, r.out.receipt);
  const receipt = JSON.parse(await readFile(path, 'utf8'));
  receipt.checks[0].observation = 'pass';
  await json(path, receipt);
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', r.out.receipt).status, 2);
});
test('source mutation during execution makes the completed run stale', async () => {
  const dir = await fixture((c) => {
    c.checks[0].command = [
      process.execPath,
      '-e',
      `require('fs').writeFileSync('src/input.txt', 'edited'); process.stdout.write(${JSON.stringify(xml)})`,
    ];
  });
  const result = cli(dir, 'verify', 'change', '--run');
  assert.equal(result.status, 2);
  assert.equal(result.out.verdict.applicability, 'stale');
});
test('an input disappearing during execution preserves a receipt with unknown applicability', async () => {
  const dir = await fixture((c) => {
    c.sources[0].inputs = ['src/input.txt', 'clinx.config.json'];
    c.checks[0].command = [
      process.execPath,
      '-e',
      `require('fs').unlinkSync('src/input.txt'); process.stdout.write(${JSON.stringify(xml)})`,
    ];
  });
  const r = cli(dir, 'verify', 'change', '--run');
  assert.equal(r.status, 2);
  assert.equal(r.out.verdict.applicability, 'unknown');
  const receipt = JSON.parse(await readFile(join(dir, r.out.receipt), 'utf8'));
  assert.equal(receipt.sources[0].after, null);
  assert.equal(receipt.checks[0].execution, 'completed');
});
test('input/report escapes and symlinked inputs fail closed', async () => {
  const dir = await fixture((c) => {
    c.sources[0].inputs = ['../'];
  });
  assert.equal(cli(dir, 'verify', 'change', '--run').status, 3);
  const linkDir = await fixture();
  await symlink(join(linkDir, 'clinx.config.json'), join(linkDir, 'src/link'));
  assert.equal(cli(linkDir, 'verify', 'change', '--run').status, 3);
  const reportDir = await fixture((c) => {
    c.checks[0].result = { format: 'junit', from: 'files', paths: ['../escape.xml'] };
  });
  assert.equal(cli(reportDir, 'verify', 'change', '--run').status, 2);
});
test('referenced design changes invalidate current evidence', async () => {
  const dir = await fixture();
  await put(join(dir, 'design.md'), 'initial');
  const path = join(dir, 'clinx/tasks/change/contract.json');
  const t = JSON.parse(await readFile(path, 'utf8'));
  t.context = [{ path: 'design.md', why: 'Semantic contract detail' }];
  await json(path, t);
  const r = cli(dir, 'verify', 'change', '--run');
  assert.equal(r.status, 0);
  await put(join(dir, 'design.md'), 'changed');
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', r.out.receipt).status, 2);
});
test('an explicitly declared sibling source participates in freshness', async () => {
  const sibling = await fixture();
  const dir = await fixture((c) => {
    c.sources.push({ id: 'shared', path: sibling, inputs: ['src'] });
  });
  const r = cli(dir, 'verify', 'change', '--run');
  assert.equal(r.status, 0);
  await put(join(sibling, 'src/input.txt'), 'changed sibling');
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', r.out.receipt).status, 2);
});
test('abort records interruption and cannot be success', async () => {
  const dir = await fixture();
  const controller = new AbortController();
  const running = execute(
    [process.execPath, '-e', 'setInterval(() => {}, 1000)'],
    dir,
    5000,
    controller.signal,
  );
  setTimeout(() => controller.abort(), 80);
  assert.equal((await running).execution, 'interrupted');
});
test('escaped inherited pipes cannot hold a timed-out caller indefinitely', async () => {
  const dir = await fixture();
  const code =
    "const c=require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},15000)'],{detached:true,stdio:['ignore',1,2]}); console.log(c.pid); c.unref();";
  const result = await execute(
    [process.execPath, '-e', code],
    dir,
    // Allow runtime startup under a parallel suite; the 15 s escaped child must
    // still not hold the caller until its own exit.
    2000,
    new AbortController().signal,
  );
  const ownedPid = Number(result.stdout.toString().trim());
  try {
    assert.equal(result.execution, 'timed-out');
    assert.ok(result.durationMs < 6000, `Caller waited ${result.durationMs} ms`);
    assert.equal(result.outputTruncated, true);
    assert.ok(Number.isSafeInteger(ownedPid) && ownedPid > 0);
  } finally {
    if (Number.isSafeInteger(ownedPid) && ownedPid > 0) {
      try {
        process.kill(ownedPid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
});
test('real Node domain + HTTP example and negative control', async () => {
  const dir = await copyExample('node-picker');
  assert.equal(cli(dir, 'verify', 'eligible-picker', '--run').status, 0);
  assert.equal(
    cli(dir, 'verify', 'eligible-picker', '--claim', 'release-ready', '--run').status,
    2,
  );
  const file = join(dir, 'catalog.mjs');
  await put(file, (await readFile(file, 'utf8')).replace('item.stock > 0', 'item.stock >= 0'));
  assert.equal(cli(dir, 'verify', 'eligible-picker', '--run').status, 1);
});
test('native test output works without JUnit and preserves real assertion failures', async () => {
  const dir = await copyExample('node-picker');
  const path = join(dir, 'clinx.config.json');
  const config = JSON.parse(await readFile(path, 'utf8'));
  config.checks[0].command = [
    process.execPath,
    '--test',
    '--test-reporter=tap',
    'catalog.test.mjs',
  ];
  config.checks[0].result = { format: 'exit-code' };
  await json(path, config);
  const pass = cli(dir, 'verify', 'eligible-picker', '--run');
  assert.equal(pass.status, 0, pass.err);
  const receipt = JSON.parse(await readFile(join(dir, pass.out.receipt), 'utf8'));
  assert.equal(receipt.checks[0].summary, null, 'Do not invent a parsed test summary');
  const raw = join(dir, '.clinx/runs', receipt.runId, receipt.checks[0].artifacts[0].path);
  assert.match(await readFile(raw, 'utf8'), /TAP version 13/);
  assert.match(receipt.checks[0].reason, /no test or business assertion inferred/);
  const code = join(dir, 'catalog.mjs');
  await put(code, (await readFile(code, 'utf8')).replace('item.stock > 0', 'item.stock >= 0'));
  const fail = cli(dir, 'verify', 'eligible-picker', '--run');
  assert.equal(fail.status, 1, fail.err);
  assert.equal(fail.out.verdict.checks[0].observation, 'fail');
});

test('an accepted large report produces a compact readable receipt and preserves every testcase for reconciliation', async (t) => {
  const dir = await fixture((c) => {
    c.checks[0].command = [process.execPath, 'src/report.mjs'];
    c.checks[0].timeoutMs = 30000;
    c.checks[0].result = {
      format: 'junit',
      from: 'files',
      paths: ['report.xml'],
      minTests: 60000,
      expectedTests: [`C#59999-${'x'.repeat(84)}`],
    };
  });
  t.after(() => rm(dir, { recursive: true, force: true }));
  const producer = `import { writeFileSync } from 'node:fs';
const fail = false;
writeFileSync('report.xml', '<testsuite>' + Array.from({length: 60000}, (_, i) => '<testcase classname="C" name="' + i + '-${'x'.repeat(84)}' + (fail && i === 59999 ? '"><failure/></testcase>' : '"/>')).join('') + '</testsuite>');`;
  await put(join(dir, 'src/report.mjs'), producer);
  const result = cli(dir, 'verify', 'change', '--run');
  assert.equal(result.status, 0, result.err);
  const receiptBytes = await readBounded(join(dir, result.out.receipt));
  assert.ok(receiptBytes.length < 16384);
  const receipt = JSON.parse(receiptBytes);
  assert.deepEqual(receipt.checks[0].summary, {
    total: 60000,
    passed: 60000,
    failed: 0,
    skipped: 0,
  });
  const reportBytes = await readBounded(join(dir, 'report.xml'));
  assert.ok(reportBytes.length > 7 * 1024 * 1024 && reportBytes.length < MAX_FILE_BYTES);
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', result.out.receipt).status, 0);
  await put(
    join(dir, 'src/report.mjs'),
    producer.replace('const fail = false', 'const fail = true'),
  );
  const failed = cli(dir, 'verify', 'change', '--run');
  assert.equal(failed.status, 1, failed.err);
  const failedReceipt = JSON.parse(await readBounded(join(dir, failed.out.receipt)));
  assert.deepEqual(failedReceipt.checks[0].summary, {
    total: 60000,
    passed: 59999,
    failed: 1,
    skipped: 0,
  });
  assert.equal(cli(dir, 'reconcile', 'change', '--receipt', failed.out.receipt).status, 1);
});
