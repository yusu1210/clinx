import { z } from 'zod';

export const MAX_SOURCES = 64;

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/);
const text = z
  .string()
  .min(1)
  .max(16384)
  .regex(/\S/, 'Blank text is not allowed')
  .refine((v) => !v.includes('\0'), 'NUL is not allowed');
const argument = z
  .string()
  .max(16384)
  .refine((v) => !v.includes('\0'), 'NUL is not allowed');
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const relativePath = text.refine(
  (v) => !v.startsWith('/') && !/^[A-Za-z]:/.test(v),
  'Use a relative path',
);
export const focusSchema = z.enum(['discover', 'contract', 'build', 'verify', 'learn']);
const loopStopReasonSchema = z.enum([
  'continue',
  'fixed',
  'no-new-high-value-issue',
  'budget-exhausted',
  'needs-review',
  'blocked',
]);
// Read compatibility for saved version-2 checkpoints; no longer accepted on write.
const legacyLoopStateSchema = z.strictObject({
  iteration: z.number().int().positive(),
  hypothesis: text,
  mechanism: text,
  treatment: text,
  plannedChecks: z.array(text).default([]),
  observations: z.array(text).default([]),
  unknowns: z.array(text).default([]),
  nextAction: text,
  stopReason: loopStopReasonSchema.default('continue'),
});
export const fileRefSchema = z.strictObject({ source: id.optional(), path: relativePath });
export type FileRef = z.infer<typeof fileRefSchema>;
const resultSchema = z.discriminatedUnion('format', [
  z.strictObject({ format: z.literal('exit-code') }),
  z.strictObject({
    format: z.literal('junit'),
    from: z.enum(['stdout', 'files']),
    paths: z.array(relativePath).default([]),
    minTests: z.number().int().min(1).default(1),
    expectedTests: z.array(text).default([]),
  }),
]);
export const sourceSchema = z.strictObject({
  id,
  path: text,
  inputs: z.array(relativePath).min(1),
  exclude: z.array(relativePath).default([]),
});
export const checkSchema = z.strictObject({
  id,
  source: id,
  description: text,
  command: z
    .array(argument)
    .min(1)
    .max(128)
    .refine((argv) => /\S/.test(argv[0] ?? ''), 'Command requires a nonblank executable'),
  cwd: relativePath.default('.'),
  timeoutMs: z.number().int().min(50).max(3600000).default(120000),
  sideEffects: z.enum(['local', 'external']).default('local'),
  result: resultSchema,
});
export const verificationDefinitionSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1).max(MAX_SOURCES),
  checks: z.array(checkSchema),
});
export type VerificationDefinition = z.infer<typeof verificationDefinitionSchema>;
export const configSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  name: id,
  context: z
    .array(
      z.strictObject({
        source: id.optional(),
        path: relativePath,
        description: text,
        when: z
          .array(z.enum(['always', 'discover', 'contract', 'build', 'verify', 'learn']))
          .min(1),
      }),
    )
    .default([]),
  sources: z.array(sourceSchema).min(1).max(MAX_SOURCES),
  checks: z.array(checkSchema).default([]),
});
const obligationBase = { id, description: text, claims: z.array(id).min(1) };
const taskAgreementSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  id,
  title: text,
  outcome: text,
  sources: z.array(id).min(1).max(MAX_SOURCES).optional(),
  scope: z.array(text).min(1),
  invariants: z.array(text).default([]),
  authority: z.array(text).default([]),
  decisions: z.array(z.strictObject({ question: text, choice: text, basis: text })).default([]),
  context: z.array(fileRefSchema.extend({ why: text })).default([]),
  mode: z.enum(['implementation', 'design', 'diagnosis', 'review']),
  nonGoals: z.array(text).default([]),
});
export const taskSchema = z.union([
  taskAgreementSchema.extend({
    defaultClaim: id,
    claims: z.array(id).min(1),
    obligations: z
      .array(
        z.union([
          z.strictObject({ ...obligationBase, checks: z.array(id).min(1) }),
          z.strictObject({ ...obligationBase, external: text }),
        ]),
      )
      .min(1),
  }),
  taskAgreementSchema.extend({
    defaultClaim: z.never().optional(),
    claims: z.never().optional(),
    obligations: z.never().optional(),
  }),
]);
export const checkpointInputSchema = z.strictObject({
  focus: focusSchema,
  state: z.enum(['active', 'blocked', 'handoff']),
  summary: text,
  next: text,
  blockers: z.array(text).default([]),
});
export const checkpointSchema = z.strictObject({
  version: z.literal(2),
  sequence: z.number().int().positive(),
  createdAt: z.string().datetime(),
  taskId: id,
  definitionDigest: digest,
  taskDigest: digest,
  sources: z.array(z.strictObject({ id, digest })).max(MAX_SOURCES),
  note: checkpointInputSchema.extend({ loop: legacyLoopStateSchema.optional() }),
});
export const evidenceInputSchema = z.strictObject({
  obligations: z.array(id).min(1).max(128),
  observedAt: z.string().datetime(),
  observer: text,
  method: z.enum(['manual', 'tool']),
  target: z.strictObject({ identity: text, revision: text }),
  outcome: z.enum(['pass', 'fail', 'inconclusive']),
  summary: text,
  artifacts: z
    .array(fileRefSchema.extend({ description: text }))
    .min(1)
    .max(8),
  limitations: z.array(text).max(128).default([]),
});
export const evidenceSchema = z.strictObject({
  version: z.literal(2),
  id: z.string().uuid(),
  taskId: id,
  createdAt: z.string().datetime(),
  trust: z.literal('local-attachment-not-attested'),
  capturedInputs: z.strictObject({
    definitionDigest: digest,
    taskDigest: digest,
    sources: z.array(z.strictObject({ id, digest })).max(MAX_SOURCES),
  }),
  observation: evidenceInputSchema.omit({ artifacts: true }),
  artifacts: z
    .array(
      z.strictObject({
        path: z.string().regex(/^artifacts\/[0-7]\.[a-zA-Z0-9]{1,12}$/),
        original: fileRefSchema,
        description: text,
        bytes: z
          .number()
          .int()
          .min(1)
          .max(8 * 1024 * 1024),
        sha256: digest,
      }),
    )
    .min(1)
    .max(8),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceInput = z.infer<typeof evidenceInputSchema>;
// A bounded navigation projection. Reading metadata never checks archived bytes,
// current local applicability or a remote target.
export interface EvidenceIndex {
  records: {
    id: string;
    path: string;
    observation: Evidence['observation'];
  }[];
  issues: { path: string; error: string }[];
  truncated: boolean;
  integrity: 'not-checked';
  localBinding: 'not-checked';
  remoteState: 'not-checked';
  instruction: string;
}
export const testSummarySchema = z.strictObject({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export const receiptSchema = z.strictObject({
  version: z.literal(2),
  protocolVersion: z.number().int().positive(),
  clinxVersion: text,
  runId: z.string().uuid(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  trust: z.literal('local-execution-not-attested'),
  definitionDigest: digest,
  definition: verificationDefinitionSchema,
  taskDigest: digest.nullable(),
  claim: text,
  runtime: z.strictObject({ node: text, platform: text, arch: text }),
  sources: z
    .array(
      z.strictObject({
        id,
        before: digest,
        after: digest.nullable(),
        files: z.number().int().nonnegative(),
      }),
    )
    .max(MAX_SOURCES),
  checks: z.array(
    z.strictObject({
      id,
      execution: z.enum(['completed', 'failed-to-run', 'timed-out', 'interrupted', 'unknown']),
      exitCode: z.number().int().nullable(),
      signal: z.string().nullable(),
      durationMs: z.number().nonnegative(),
      observation: z.enum(['pass', 'fail', 'inconclusive']),
      reason: z.string(),
      outputTruncated: z.boolean(),
      summary: testSummarySchema.nullable(),
      artifacts: z.array(z.strictObject({ path: relativePath, sha256: digest })),
    }),
  ),
});

export type WorkspaceConfig = z.infer<typeof configSchema>;
export type Check = z.infer<typeof checkSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type TaskContract = z.infer<typeof taskSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type CheckReceipt = Receipt['checks'][number];
// Detailed cases are transient parser input to assessment, not duplicated in receipts.
export type ParsedTests = z.infer<typeof testSummarySchema> & {
  tests: { id: string; status: 'pass' | 'fail' | 'skip' }[];
};
export type Decision = 'supported' | 'failed' | 'unresolved';
export interface Verdict {
  claim: string;
  decision: Decision;
  applicability: 'current' | 'stale' | 'unknown';
  reasons: string[];
  checks: {
    id: string;
    execution: CheckReceipt['execution'] | 'not-recorded';
    observation: CheckReceipt['observation'];
    reason: string;
    artifacts: string[];
  }[];
  obligations: {
    id: string;
    disposition: 'satisfied' | 'unsatisfied' | 'unresolved';
    reason: string;
  }[];
}

export function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}
export function validateConfig(value: unknown): WorkspaceConfig {
  const config = configSchema.parse(value);
  validateDefinition(config);
  for (const ref of config.context) {
    if (ref.source && !config.sources.some((s) => s.id === ref.source))
      throw new Error(`Unknown context source: ${ref.source}`);
  }
  return config;
}
export function validateDefinition(config: VerificationDefinition): void {
  unique(
    config.sources.map((s) => s.id),
    'source IDs',
  );
  unique(
    config.checks.map((c) => c.id.toLowerCase()),
    'check IDs (case-insensitive for portable artifact storage)',
  );
  for (const check of config.checks) {
    if (!config.sources.some((s) => s.id === check.source))
      throw new Error(`Unknown source: ${check.source}`);
    if (check.result.format === 'junit') {
      if (check.result.from === 'files' && check.result.paths.length === 0)
        throw new Error(`${check.id}: JUnit paths are required`);
      if (check.result.from === 'stdout' && check.result.paths.length > 0)
        throw new Error(`${check.id}: stdout JUnit cannot have paths`);
      unique(check.result.expectedTests, 'expected test IDs');
    }
  }
}
// Validate the contract itself independently of today's project configuration.
// Historical references may be obsolete; that must not prevent a valid revision.
export function parseTask(value: unknown): TaskContract {
  const task = taskSchema.parse(value);
  if (task.sources) unique(task.sources, 'task source IDs');
  unique(
    task.context.map((ref) => JSON.stringify([ref.source ?? null, ref.path])),
    'task context references',
  );
  // Continuity-only agreements do not invent verification claims.
  if (!task.claims) return task;
  unique(task.claims, 'claim IDs');
  unique(
    task.obligations.map((o) => o.id),
    'obligation IDs',
  );
  if (!task.claims.includes(task.defaultClaim))
    throw new Error('defaultClaim must name a declared claim');
  for (const o of task.obligations) {
    unique(o.claims, 'obligation claim IDs');
    if (o.claims.some((c) => !task.claims.includes(c))) throw new Error(`${o.id}: unknown claim`);
    if ('checks' in o) {
      unique(o.checks, 'obligation check IDs');
    }
  }
  for (const claim of task.claims) {
    if (!task.obligations.some((o) => o.claims.includes(claim)))
      throw new Error(`${claim}: claim has no obligations`);
  }
  return task;
}
export function validateTask(value: unknown, config: WorkspaceConfig): TaskContract {
  const task = parseTask(value);
  const sources = task.sources ?? config.sources.map((s) => s.id);
  for (const source of sources) {
    if (!config.sources.some((s) => s.id === source))
      throw new Error(`Unknown task source: ${source}`);
  }
  for (const ref of task.context) {
    if (ref.source && !sources.includes(ref.source))
      throw new Error(`Context source outside task sources: ${ref.source}`);
  }
  for (const o of task.obligations ?? []) {
    if ('checks' in o && o.checks.some((c) => !config.checks.some((check) => check.id === c)))
      throw new Error(`${o.id}: unknown check`);
    if ('checks' in o) {
      for (const id of o.checks) {
        const check = config.checks.find((c) => c.id === id)!;
        if (!sources.includes(check.source))
          throw new Error(`${id}: check source outside task sources: ${check.source}`);
      }
    }
  }
  return task;
}
