import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, validateTask } from '../dist/schema.js';
import { parseJUnit, mergeJUnit } from '../dist/junit.js';
import { config, contract, xml, fixture, cli } from './helpers.mjs';

test('strict schemas reject typos and cross-reference errors', () => {
  assert.throws(() => validateConfig({ ...config(), cheks: [] }));
  const withoutInputs = config();
  delete withoutInputs.sources[0].inputs;
  assert.throws(() => validateConfig(withoutInputs));
  const c = config();
  c.checks[0].source = 'missing';
  assert.throws(() => validateConfig(c));
  const t = contract();
  t.obligations[0].checks = ['missing'];
  assert.throws(() => validateTask(t, validateConfig(config())));
});
test('claim must have obligations and default must exist', () => {
  const t = contract();
  t.claims.push('production');
  assert.throws(() => validateTask(t, validateConfig(config())));
  t.claims.pop();
  t.defaultClaim = 'absent';
  assert.throws(() => validateTask(t, validateConfig(config())));
});
test('duplicate check, source, obligation and expected case IDs are rejected', () => {
  for (const key of ['checks', 'sources']) {
    const c = config();
    c[key].push(c[key][0]);
    assert.throws(() => validateConfig(c));
  }
  const c = config();
  c.checks[0].result.expectedTests = ['x', 'x'];
  assert.throws(() => validateConfig(c));
  const t = contract();
  t.obligations.push(t.obligations[0]);
  assert.throws(() => validateTask(t, validateConfig(config())));
});
test('JUnit parses standard, nested, Node and escaped identities', () => {
  assert.equal(parseJUnit(xml).passed, 1);
  assert.equal(parseJUnit(`<testsuites>${xml}</testsuites>`).passed, 1);
  assert.equal(
    parseJUnit('<testsuites><testcase classname="test" name="a &amp; b"/></testsuites>').tests[0]
      .id,
    'test#a & b',
  );
  assert.equal(parseJUnit(`<testsuite tests="1">${xml}</testsuite>`).total, 1);
});
test('JUnit failure and skipped observations are distinct', () => {
  const r = parseJUnit(
    '<testsuite tests="2" failures="1" skipped="1"><testcase name="a"><failure>bad</failure></testcase><testcase name="b"><skipped/></testcase></testsuite>',
  );
  assert.equal(r.failed, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.passed, 0);
});
for (const [name, value] of Object.entries({
  malformed: '<testsuite>',
  dtd: '<!DOCTYPE x [<!ENTITY a "x">]><testsuite/>',
  missingName: '<testsuite><testcase time="0"/></testsuite>',
  wrongCount: '<testsuite tests="9"><testcase name="x"/></testsuite>',
  suiteFailure: '<testsuite tests="1" errors="1"><testcase name="x"/></testsuite>',
  suiteErrorElement:
    '<testsuite tests="1"><error message="setup failed"/><testcase name="x"/></testsuite>',
  suiteFailureElement: '<testsuite tests="1"><failure/><testcase name="x"/></testsuite>',
  suiteSkippedElement:
    '<testsuites><skipped/><testsuite><testcase name="x"/></testsuite></testsuites>',
  negative: '<testsuite tests="-1"/>',
  duplicate: '<testsuite><testcase name="x"/><testcase name="x"/></testsuite>',
  aggregateFailure: `<testsuites tests="1" failures="1">${xml}</testsuites>`,
  notRun: '<testsuite><testcase name="x" status="notrun"/></testsuite>',
  disabled: '<testsuite disabled="1"><testcase name="x"/></testsuite>',
  suppressed: '<testsuite><testcase name="x" result="suppressed"/></testsuite>',
}))
  test(`JUnit rejects ${name}`, () => assert.throws(() => parseJUnit(value)));
test('JUnit rejects duplicate identities across report files', () =>
  assert.throws(() => mergeJUnit([parseJUnit(xml), parseJUnit(xml)])));
test('suite-level errors cannot produce a supported CLI claim', async () => {
  const dir = await fixture((c) => {
    const report = xml.replace('</testsuite>', '<error message="setup failed"/></testsuite>');
    c.checks[0].command = [
      process.execPath,
      '-e',
      `process.stdout.write(${JSON.stringify(report)})`,
    ];
  });
  const result = cli(dir, 'verify', 'change', '--run');
  assert.equal(result.status, 2);
  assert.equal(result.out.verdict.decision, 'unresolved');
  assert.equal(result.out.verdict.checks[0].observation, 'inconclusive');
});

for (const element of ['failure', 'error', 'skipped']) {
  test(`nested JUnit groups preserve ${element} observations`, async () => {
    const report = `<testsuites>${xml}<testsuites><testsuite name="nested"><testcase name="bad"><${element}/></testcase></testsuite></testsuites></testsuites>`;
    const parsed = parseJUnit(report);
    assert.equal(parsed.total, 2);
    assert.equal(parsed[element === 'skipped' ? 'skipped' : 'failed'], 1);
    const dir = await fixture((c) => {
      c.checks[0].command = [
        process.execPath,
        '-e',
        `process.stdout.write(${JSON.stringify(report)})`,
      ];
    });
    const run = cli(dir, 'verify', 'change', '--run');
    assert.equal(run.status, element === 'skipped' ? 2 : 1, run.err);
    assert.notEqual(run.out.verdict.decision, 'supported');
    assert.equal(cli(dir, 'reconcile', 'change', '--receipt', run.out.receipt).status, run.status);
  });
}

test('unsupported JUnit structure cannot hide failed or unexecuted tests', () => {
  for (const report of [
    `<testsuites>${xml}<wrapper><testcase name="bad"><failure/></testcase></wrapper></testsuites>`,
    '<testsuite><testcase name="x"><rerunFailure/></testcase></testsuite>',
    '<testsuite><testcase name="x"><result status="failed"/></testcase></testsuite>',
    `<testsuites>${xml}<properties><testcase name="bad"><skipped/></testcase></properties></testsuites>`,
    `<testsuites tests="1">${xml}<testsuites>${xml.replace('works', 'other')}</testsuites></testsuites>`,
    `<wrapper>${xml}</wrapper>${xml}`,
    `${xml}${xml.replace('works', 'other')}`,
  ])
    assert.throws(() => parseJUnit(report), undefined, report);
});

test('supported JUnit metadata is not interpreted as outcome text', () => {
  const report =
    '<testsuite name="suite"><properties><property name="word" value="failure"/></properties><testcase name="x"><properties/><system-out><![CDATA[<failure> is sample text]]></system-out></testcase><system-err>skipped is a log word</system-err></testsuite>';
  assert.equal(parseJUnit(report).passed, 1);
});
