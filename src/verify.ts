import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import {
  boundedPath,
  canonical,
  makePrivateDir,
  readBounded,
  readJson,
  sha256,
  sourceRoots,
  withLock,
  writeNew,
} from './files.js';
import {
  openWorkspace,
  fingerprintSources,
  taskSources,
  definitionDigest,
  verificationDefinition,
  digestDefinition,
  type Workspace,
} from './workspace.js';
import { readTask, readTaskDefinition, taskBinding } from './task.js';
import { version, evidenceProtocolVersion } from './version.js';
import { assessTests, runCheck } from './runner.js';
import { mergeJUnit, parseJUnit } from './junit.js';
import {
  receiptSchema,
  unique,
  validateDefinition,
  validateTask,
  type CheckReceipt,
  type Receipt,
  type TaskContract,
  type Verdict,
} from './schema.js';

function selected(task: TaskContract, claim: string) {
  if (!task.claims.includes(claim)) throw new Error(`Unknown claim: ${claim}`);
  return task.obligations.filter((o) => o.claims.includes(claim));
}
function planChecks(p: Workspace, task: TaskContract, id: string, requestedClaim?: string) {
  const claim = requestedClaim ?? task.defaultClaim;
  const obligations = selected(task, claim);
  const ids = new Set(obligations.flatMap((o) => ('checks' in o ? o.checks : [])));
  return {
    taskId: id,
    claim,
    obligations,
    sources: taskSources(p, task),
    checks: p.config.checks.filter((c) => ids.has(c.id)),
    warning:
      'Review argv, scripts they invoke, source scope, and side effects. --run executes trusted project commands with your OS permissions, not in a sandbox.',
  };
}
export async function previewChecks(p: Workspace, id: string, requestedClaim?: string) {
  p = await openWorkspace(p.root);
  const { task } = await readTask(p, id);
  return planChecks(p, task, id, requestedClaim);
}
export async function verify(p: Workspace, id: string, claim?: string, allowExternal = false) {
  p = await openWorkspace(p.root);
  if (process.platform === 'win32')
    throw new Error(
      'Execution currently supports macOS and Linux only; the methodology and Skill are platform independent',
    );
  return withLock(p.root, async () => {
    // Select the executable plan only after acquiring the writer lock. A preview is
    // advisory; a concurrent task revision must never leave execution using old argv
    // or an old side-effect classification.
    p = await openWorkspace(p.root);
    const { task, taskDigest } = await readTask(p, id);
    const plan = planChecks(p, task, id, claim);
    if (!allowExternal && plan.checks.some((c) => c.sideEffects === 'external'))
      throw new Error(
        'External checks require task-specific authority and --allow-external; no commands were executed',
      );
    const roots = await sourceRoots(p.root, { ...p.config, sources: taskSources(p, task) });
    const before = await fingerprintSources(p, task);
    const runId = randomUUID();
    const runDir = await makePrivateDir(p.root, `.clinx/runs/${runId}`);
    const receipt: Receipt = {
      version: 2,
      protocolVersion: evidenceProtocolVersion,
      clinxVersion: version,
      runId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      trust: 'local-execution-not-attested',
      definitionDigest: definitionDigest(p, task, plan.checks),
      definition: verificationDefinition(p, task, plan.checks),
      taskDigest,
      claim: plan.claim,
      runtime: { node: process.version, platform: process.platform, arch: process.arch },
      sources: [],
      checks: [],
    };
    const controller = new AbortController();
    const interrupt = () => controller.abort();
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    try {
      for (const check of plan.checks) {
        const started = performance.now();
        try {
          receipt.checks.push(
            await runCheck(check, roots.get(check.source)!, runDir, controller.signal),
          );
        } catch (error) {
          receipt.checks.push({
            id: check.id,
            execution: 'unknown',
            exitCode: null,
            signal: null,
            durationMs: performance.now() - started,
            observation: 'inconclusive',
            reason: `Execution state could not be established: ${String(error)}. Inspect any effects before retrying.`,
            outputTruncated: false,
            summary: null,
            artifacts: [],
          });
        }
      }
      // Preserve execution evidence even if an input disappears or becomes unreadable.
      // Null is unknown, never a fabricated successful snapshot.
      let after: Awaited<ReturnType<typeof fingerprintSources>> = [];
      try {
        after = await fingerprintSources(p, task);
      } catch {
        /* Reconciliation reports the current gap. */
      }
      receipt.sources = before.map((s) => ({
        id: s.id,
        before: s.digest,
        after: after.find((a) => a.id === s.id)?.digest ?? null,
        files: s.files,
      }));
      receipt.finishedAt = new Date().toISOString();
      await writeNew(
        join(runDir, 'receipt.json'),
        `${JSON.stringify(receiptSchema.parse(receipt), null, 2)}\n`,
      );
    } finally {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
    const receiptPath = `.clinx/runs/${runId}/receipt.json`;
    return { receipt: receiptPath, verdict: await reconcile(p, id, receiptPath, plan.claim) };
  });
}
export async function reconcile(
  p: Workspace,
  id: string,
  receiptPath: string,
  requestedClaim?: string,
): Promise<Verdict> {
  // Callers may retain an old Workspace object across an execution or a long pause.
  p = await openWorkspace(p.root);
  const task = await readTaskDefinition(p, id);
  const claim = requestedClaim ?? task.defaultClaim;
  const obligations = selected(task, claim);
  const file = await boundedPath(p.root, receiptPath);
  const receipt = receiptSchema.parse(await readJson(file));
  unique(
    receipt.checks.map((c) => c.id),
    'receipt checks',
  );
  unique(
    receipt.sources.map((s) => s.id),
    'receipt sources',
  );
  const reasons: string[] = [];
  let taskDigest: string | null = null;
  try {
    validateTask(task, p.config);
    taskDigest = await taskBinding(p, task);
  } catch (error) {
    reasons.push(`Cannot establish task context inputs: ${String(error)}`);
  }
  const supportedProtocol = receipt.protocolVersion === evidenceProtocolVersion;
  if (!supportedProtocol) reasons.push('Unsupported evidence interpretation protocol');
  const ids = new Set(obligations.flatMap((o) => ('checks' in o ? o.checks : [])));
  const checks = p.config.checks.filter((c) => ids.has(c.id));
  if (receipt.definitionDigest !== definitionDigest(p, task, checks))
    reasons.push('Task source or selected check definitions differ from this run');
  let validDefinition = true;
  try {
    validateDefinition(receipt.definition);
    if (receipt.definitionDigest !== digestDefinition(receipt.definition))
      throw new Error('Saved verification definition digest mismatch');
    if (
      canonical(receipt.definition.checks.map((c) => c.id)) !==
      canonical(receipt.checks.map((c) => c.id))
    )
      throw new Error('Saved check definitions do not match execution records');
    if (
      canonical(receipt.definition.sources.map((s) => s.id).sort()) !==
      canonical(receipt.sources.map((s) => s.id).sort())
    )
      throw new Error('Saved source definitions do not match input records');
  } catch (error) {
    validDefinition = false;
    reasons.push(`Cannot interpret saved verification definition: ${String(error)}`);
  }
  if (receipt.taskDigest !== taskDigest)
    reasons.push('Contract or referenced design differs from this run');
  if (receipt.claim !== claim) reasons.push('Receipt was produced for a different claim');
  let current: Awaited<ReturnType<typeof fingerprintSources>> = [];
  let unknown =
    taskDigest === null ||
    !supportedProtocol ||
    !validDefinition ||
    receipt.sources.some((s) => s.after === null);
  try {
    validateTask(task, p.config);
    current = await fingerprintSources(p, task);
  } catch (error) {
    unknown = true;
    reasons.push(`Cannot fingerprint current inputs: ${String(error)}`);
  }
  if (
    canonical(receipt.sources.map((s) => s.id).sort()) !==
    canonical(current.map((s) => s.id).sort())
  )
    reasons.push('Source set differs');
  for (const source of receipt.sources) {
    if (
      source.before !== source.after ||
      current.find((s) => s.id === source.id)?.digest !== source.after
    )
      reasons.push(`Source changed: ${source.id}`);
  }
  const observations = new Map<string, CheckReceipt['observation']>();
  const details = new Map<string, Verdict['checks'][number]>();
  for (const check of receipt.checks) {
    unique(
      check.artifacts.map((a) => a.path),
      'receipt artifact paths',
    );
    const contents = new Map<string, Buffer>();
    for (const artifact of check.artifacts) {
      try {
        const data = await readBounded(await boundedPath(dirname(file), artifact.path));
        if (sha256(data) !== artifact.sha256) reasons.push(`Artifact changed: ${artifact.path}`);
        contents.set(artifact.path, data);
      } catch {
        reasons.push(`Artifact unavailable: ${artifact.path}`);
      }
    }
    // Recompute observations from saved artifacts, not a mutable "pass" field.
    const definition =
      supportedProtocol && validDefinition
        ? receipt.definition.checks.find((c) => c.id === check.id)
        : undefined;
    let observed: CheckReceipt['observation'] = 'inconclusive';
    let reason =
      check.execution === 'completed'
        ? `Missing check definition or saved stdout/stderr: ${check.reason}`
        : `Execution ${check.execution}: ${check.reason}`;
    if (
      definition &&
      check.execution === 'completed' &&
      contents.has(`${check.id}.stdout`) &&
      contents.has(`${check.id}.stderr`)
    ) {
      if (check.exitCode !== 0 || check.signal !== null) {
        observed = 'fail';
        reason = `Command exited ${check.exitCode}, signal ${check.signal}; inspect saved stderr/stdout`;
      } else if (definition.result.format === 'exit-code') {
        observed = 'pass';
        reason = 'Command exited zero; no test or business assertion inferred';
      } else if (!(definition.result.from === 'stdout' && check.outputTruncated)) {
        try {
          const reports =
            definition.result.from === 'stdout'
              ? [`${check.id}.stdout`]
              : definition.result.paths.map((_, i) => `${check.id}.${i}.xml`);
          const summary = mergeJUnit(
            reports.map((path) => {
              const data = contents.get(path);
              if (!data) throw new Error('Missing saved report');
              return parseJUnit(data.toString('utf8'));
            }),
          );
          const assessment = assessTests(definition, summary);
          observed = assessment.observation;
          reason = assessment.reason;
        } catch (error) {
          reason = `Cannot interpret saved test evidence: ${String(error)}`;
        }
      } else {
        reason = 'Output truncated; cannot establish complete JUnit results';
      }
    }
    // Freshness of file reports was observed only by the runner. Re-parsing an old
    // copied report cannot override a failed/inconclusive observation from that run.
    if (check.observation !== 'pass' && observed === 'pass') {
      observed = check.observation;
      reason = `Original run was ${check.observation}: ${check.reason}`;
    }
    observations.set(check.id, observed);
    details.set(check.id, {
      id: check.id,
      execution: check.execution,
      observation: observed,
      reason,
      artifacts: check.artifacts.map((a) => join(dirname(receiptPath), a.path)),
    });
  }
  const applicability = unknown ? 'unknown' : reasons.length ? 'stale' : 'current';
  const assessed: Verdict['obligations'] = obligations.map((o) => {
    if ('external' in o) return { id: o.id, disposition: 'unresolved', reason: o.external };
    if (applicability !== 'current')
      return {
        id: o.id,
        disposition: 'unresolved',
        reason: 'Evidence no longer applies; inspect changes and re-run relevant checks',
      };
    const checks = o.checks.map((id) => receipt.checks.find((c) => c.id === id));
    if (checks.some((c) => c && observations.get(c.id) === 'fail'))
      return { id: o.id, disposition: 'unsatisfied', reason: 'A required check failed' };
    if (checks.some((c) => !c || observations.get(c.id) !== 'pass'))
      return {
        id: o.id,
        disposition: 'unresolved',
        reason: 'A required check is missing or inconclusive',
      };
    return {
      id: o.id,
      disposition: 'satisfied',
      reason: 'Declared checks support this obligation; the semantic mapping still requires review',
    };
  });
  return {
    claim,
    applicability,
    reasons,
    checks: [...new Set(obligations.flatMap((o) => ('checks' in o ? o.checks : [])))].map(
      (id) =>
        details.get(id) ?? {
          id,
          execution: 'not-recorded',
          observation: 'inconclusive',
          reason: 'Required check has no execution record in this receipt',
          artifacts: [],
        },
    ),
    obligations: assessed,
    decision: assessed.some((o) => o.disposition === 'unsatisfied')
      ? 'failed'
      : assessed.every((o) => o.disposition === 'satisfied')
        ? 'supported'
        : 'unresolved',
  };
}
