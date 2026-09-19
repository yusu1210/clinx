import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const arms = ['baseline', 'skill', 'skill-cli'];
const allowedScenarios = ['campaign-cross-repo', 'campaign-resume-drift', 'campaign-confirmation'];
const plan = JSON.parse(await readFile(join(dir, 'run-plan.json'), 'utf8'));
if (!Array.isArray(plan) || !plan.length)
  throw new Error('run-plan.json must contain the predeclared scenario/arm/rep entries');
const names = new Set();
for (const entry of plan) {
  if (
    !allowedScenarios.includes(entry.scenario) ||
    !arms.includes(entry.arm) ||
    !Number.isInteger(entry.rep) ||
    entry.rep < 1
  )
    throw new Error('Invalid planned run');
  entry.file = `result-${entry.scenario}-${entry.arm}-${entry.rep}.json`;
  if (names.has(entry.file)) throw new Error('Duplicate planned run');
  names.add(entry.file);
}
const unexpectedFiles = (await readdir(dir))
  .filter((f) => /^result-.*\.json$/.test(f) && !names.has(f))
  .sort();
const runs = [];
for (const entry of plan) {
  try {
    const result = JSON.parse(await readFile(join(dir, entry.file), 'utf8'));
    if (
      result.version !== 2 ||
      result.scenario !== entry.scenario ||
      result.arm !== entry.arm ||
      ![true, false, null].includes(result.passed)
    )
      throw new Error('Result identity or verdict does not match the planned run');
    if (result.evaluation === 'operational-failure') {
      if (
        result.passed !== null ||
        typeof result.operationalFailure !== 'string' ||
        !result.operationalFailure.trim() ||
        result.passedChecks !== null ||
        result.totalChecks !== null
      )
        throw new Error('Operational failure must retain unknown acceptance and counts');
    } else {
      if (
        !Array.isArray(result.checks) ||
        !result.checks.length ||
        result.checks.some((c) => ![true, false, null].includes(c.pass))
      )
        throw new Error('Missing or invalid acceptance observations');
      const passed = result.checks.some((c) => c.pass === false)
        ? false
        : result.checks.some((c) => c.pass === null)
          ? null
          : true;
      if (
        result.passed !== passed ||
        result.totalChecks !== result.checks.length ||
        result.passedChecks !== result.checks.filter((c) => c.pass === true).length ||
        result.evaluation !== (passed === null ? 'unresolved' : passed ? 'passed' : 'failed')
      )
        throw new Error('Verdict or counts contradict acceptance observations');
    }
    runs.push({ ...entry, result, state: 'recorded' });
  } catch (error) {
    runs.push({
      ...entry,
      result: null,
      state: error.code === 'ENOENT' ? 'missing' : 'invalid',
      reason: String(error),
    });
  }
}
const scenarios = [...new Set(plan.map((r) => r.scenario))].sort();
const summary = [];
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const duration = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
for (const scenario of scenarios) {
  for (const arm of arms) {
    const sample = runs.filter((r) => r.scenario === scenario && r.arm === arm);
    if (!sample.length) continue;
    const results = sample.filter((r) => r.result).map((r) => r.result);
    const phases = scenario === 'campaign-cross-repo' ? ['phase1'] : ['phase1', 'phase2'];
    const elapsed = results
      .map((r) => phases.map((p) => r.metrics?.[`${p}ElapsedMs`]))
      .filter((times) => times.every(duration))
      .map((times) => times.reduce((a, b) => a + b, 0));
    const fractions = results
      .filter(
        (r) =>
          Number.isInteger(r.totalChecks) &&
          r.totalChecks > 0 &&
          Number.isInteger(r.passedChecks) &&
          r.passedChecks >= 0 &&
          r.passedChecks <= r.totalChecks,
      )
      .map((r) => r.passedChecks / r.totalChecks);
    const outcomes = sample.map(({ result: r }) => {
      if (!r) return 'unknown';
      if (r.operationalFailure) return 'failure';
      const values = phases.map((p) => r.metrics?.[`${p}AgentOutcome`]);
      if (values.some((v) => ['failure', 'cancelled', 'timed_out', 'skipped'].includes(v)))
        return 'failure';
      return values.every((v) => v === 'success') ? 'success' : 'unknown';
    });
    const passed = results.filter((r) => r.passed === true).length;
    const failed = results.filter((r) => r.passed === false).length;
    const unknown = sample.length - passed - failed;
    const cli = results.map((r) => r.metrics?.cliUsed).filter((v) => typeof v === 'boolean');
    summary.push({
      scenario,
      arm,
      planned: sample.length,
      recorded: results.length,
      passed,
      failed,
      unknown,
      passRate: unknown ? null : passed / sample.length,
      confirmedPassRate: passed / sample.length,
      meanChecksPassed: mean(fractions),
      checkSamples: fractions.length,
      meanElapsedMs: mean(elapsed),
      elapsedSamples: elapsed.length,
      cliUseRate:
        arm === 'skill-cli' && cli.length === sample.length
          ? cli.filter(Boolean).length / cli.length
          : null,
      operationalFailures: outcomes.filter((v) => v === 'failure').length,
      operationalUnknown: outcomes.filter((v) => v === 'unknown').length,
      operationalFailureRate: outcomes.includes('unknown')
        ? null
        : outcomes.filter((v) => v === 'failure').length / sample.length,
    });
  }
}

const output = {
  version: 2,
  generatedAt: new Date().toISOString(),
  planned: runs.length,
  records: runs.map(({ result: _result, ...record }) => record),
  unexpectedFiles,
  note: 'Descriptive matched-run summary only. Missing/invalid/unresolved runs stay unknown, never zero-duration successes. confirmedPassRate uses all planned runs as its denominator; passRate is unknown until all verdicts exist. Means report their known sample counts. Unexpected files are excluded, not silently merged. No superiority claim follows from small n.',
  summary,
};
await writeFile(join(dir, 'aggregate.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
