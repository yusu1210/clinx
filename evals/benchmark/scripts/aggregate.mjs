import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const files = (await readdir(dir)).filter((f) => /^result-.*\.json$/.test(f)).sort();
const runs = [];
for (const file of files) runs.push(JSON.parse(await readFile(join(dir, file), 'utf8')));

const arms = ['baseline', 'skill', 'skill-cli'];
const scenarios = [...new Set(runs.map((r) => r.scenario))].sort();
const summary = [];
for (const scenario of scenarios) {
  for (const arm of arms) {
    const sample = runs.filter((r) => r.scenario === scenario && r.arm === arm);
    if (!sample.length) continue;
    const elapsed = sample
      .map((r) => (r.metrics.phase1ElapsedMs ?? 0) + (r.metrics.phase2ElapsedMs ?? 0))
      .filter((v) => v > 0);
    summary.push({
      scenario,
      arm,
      n: sample.length,
      passRate: sample.filter((r) => r.passed).length / sample.length,
      meanChecksPassed:
        sample.reduce((sum, r) => sum + r.passedChecks / r.totalChecks, 0) / sample.length,
      meanElapsedMs: elapsed.length ? elapsed.reduce((a, b) => a + b, 0) / elapsed.length : null,
      cliUseRate:
        arm === 'skill-cli' ? sample.filter((r) => r.metrics.cliUsed).length / sample.length : null,
      operationalFailureRate:
        sample.filter((r) =>
          [r.metrics.phase1AgentOutcome, r.metrics.phase2AgentOutcome]
            .filter(Boolean)
            .some((v) => v !== 'success'),
        ).length / sample.length,
    });
  }
}

const output = {
  version: 1,
  generatedAt: new Date().toISOString(),
  runs: runs.length,
  note: 'Descriptive matched-run summary only. Do not claim superiority from small n; retain per-run failures and inspect operational failures separately.',
  summary,
};
await writeFile(join(dir, 'aggregate.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
