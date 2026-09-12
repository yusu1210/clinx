import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { ParsedTests } from './schema.js';

type XmlNode = Record<string, unknown>;
const array = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
function object(value: unknown): XmlNode {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JUnit XML element');
  return value as XmlNode;
}
function count(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw new Error(`Invalid JUnit ${label}`);
  return Number(value);
}
function children(node: XmlNode, allowed: string[], label: string): void {
  for (const key of Object.keys(node)) {
    if (!key.startsWith('@_') && key !== '#text' && !allowed.includes(key))
      throw new Error(`Unsupported JUnit ${label} element: ${key}`);
  }
}
function metadata(node: XmlNode): void {
  for (const key of ['properties', 'system-out', 'system-err']) {
    for (const value of array(node[key])) {
      if (typeof value === 'string') continue;
      const element = object(value);
      children(element, key === 'properties' ? ['property'] : [], key);
      for (const property of array(element.property)) {
        if (typeof property !== 'string') children(object(property), [], 'property');
      }
    }
  }
}
export function parseJUnit(xml: string): ParsedTests {
  if (Buffer.byteLength(xml) > 8 * 1024 * 1024) throw new Error('JUnit XML is too large');
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml))
    throw new Error('DTD and entity declarations are forbidden');
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Malformed JUnit XML: ${valid.err.msg}`);
  const parsed = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
  }).parse(xml) as XmlNode;
  children(parsed, ['?xml', 'testsuite', 'testsuites'], 'root');
  const roots = array(parsed.testsuite);
  // Node's built-in reporter emits testcase directly under testsuites.
  for (const group of array(parsed.testsuites)) roots.push(object(group));
  if (roots.length === 0) throw new Error('No JUnit testsuite elements');
  if (roots.length !== 1) throw new Error('Expected one JUnit root element');
  const tests: ParsedTests['tests'] = [];
  const visit = (value: unknown, depth: number): number => {
    if (depth > 64) throw new Error('JUnit nesting is too deep');
    const suite = object(value);
    if (['error', 'failure', 'skipped'].some((key) => suite[key] !== undefined))
      throw new Error('JUnit suite-level failure or skip cannot be treated as passing');
    children(
      suite,
      ['testsuite', 'testsuites', 'testcase', 'properties', 'system-out', 'system-err'],
      'suite',
    );
    metadata(suite);
    let total = 0;
    const direct = array(suite.testcase);
    for (const item of direct) {
      const testcase = object(item);
      children(
        testcase,
        ['failure', 'error', 'skipped', 'properties', 'system-out', 'system-err'],
        'testcase',
      );
      metadata(testcase);
      if (testcase['@_status'] !== undefined && testcase['@_status'] !== 'run')
        throw new Error(
          'Unsupported JUnit testcase status; explicit skip/failure elements are required',
        );
      if (testcase['@_result'] !== undefined && testcase['@_result'] !== 'completed')
        throw new Error('Unsupported JUnit testcase result');
      const name = testcase['@_name'];
      if (typeof name !== 'string' || name.length === 0)
        throw new Error('JUnit testcase is missing a name');
      const classname = testcase['@_classname'] ?? suite['@_name'] ?? '';
      if (typeof classname !== 'string') throw new Error('Invalid testcase classname');
      const status =
        testcase.failure !== undefined || testcase.error !== undefined
          ? 'fail'
          : testcase.skipped !== undefined
            ? 'skip'
            : 'pass';
      tests.push({ id: `${classname}#${name}`, status });
      total++;
    }
    for (const child of array(suite.testsuite)) total += visit(child, depth + 1);
    for (const child of array(suite.testsuites)) total += visit(child, depth + 1);
    const declared = count(suite['@_tests'], 'tests');
    if (declared !== undefined && declared !== total)
      throw new Error(`JUnit count mismatch: declared ${declared}, observed ${total}`);
    const failures = count(suite['@_failures'], 'failures') ?? 0;
    const errors = count(suite['@_errors'], 'errors') ?? 0;
    const skipped = count(suite['@_skipped'], 'skipped') ?? 0;
    if ((count(suite['@_disabled'], 'disabled') ?? 0) > 0)
      throw new Error('Disabled tests cannot be treated as passing');
    if (failures + errors > total || skipped > total)
      throw new Error('JUnit counters exceed test count');
    // Some producers record suite-level errors with no failed testcase. Never silently drop them.
    const recent = tests.slice(tests.length - total);
    if (failures + errors > recent.filter((t) => t.status === 'fail').length)
      throw new Error('JUnit reports failure counters without corresponding failed cases');
    if (skipped > recent.filter((t) => t.status === 'skip').length)
      throw new Error('JUnit reports skipped counters without corresponding skipped cases');
    return total;
  };
  for (const root of roots) visit(root, 0);
  if (new Set(tests.map((t) => t.id)).size !== tests.length)
    throw new Error('Duplicate JUnit testcase IDs; use unambiguous names');
  return summarize(tests);
}
export function summarize(tests: ParsedTests['tests']): ParsedTests {
  return {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'pass').length,
    failed: tests.filter((t) => t.status === 'fail').length,
    skipped: tests.filter((t) => t.status === 'skip').length,
    tests,
  };
}
export function mergeJUnit(parts: ParsedTests[]): ParsedTests {
  const tests = parts.flatMap((p) => p.tests);
  if (new Set(tests.map((t) => t.id)).size !== tests.length)
    throw new Error('Duplicate testcase IDs across JUnit reports');
  return summarize(tests);
}
