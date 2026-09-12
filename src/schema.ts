import { z } from 'zod';

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
export const configSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  name: id,
  context: z
    .array(
      z.strictObject({
        path: relativePath,
        description: text,
        when: z
          .array(z.enum(['always', 'discover', 'contract', 'build', 'verify', 'learn']))
          .min(1),
      }),
    )
    .default([]),
  sources: z
    .array(
      z.strictObject({
        id,
        path: text,
        inputs: z.array(relativePath).min(1),
        exclude: z.array(relativePath).default([]),
      }),
    )
    .min(1),
  checks: z
    .array(
      z.strictObject({
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
      }),
    )
    .default([]),
});
const obligationBase = { id, description: text, claims: z.array(id).min(1) };
export const taskSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(1),
  id,
  title: text,
  outcome: text,
  scope: z.array(text).min(1),
  invariants: z.array(text).default([]),
  authority: z.array(text).default([]),
  decisions: z.array(z.strictObject({ question: text, choice: text, basis: text })).default([]),
  context: z.array(z.strictObject({ path: relativePath, why: text })).default([]),
  mode: z.enum(['implementation', 'design', 'diagnosis', 'review']),
  defaultClaim: id,
  claims: z.array(id).min(1),
  nonGoals: z.array(text).default([]),
  obligations: z
    .array(
      z.union([
        z.strictObject({ ...obligationBase, checks: z.array(id).min(1) }),
        z.strictObject({ ...obligationBase, external: text }),
      ]),
    )
    .min(1),
});
export const checkpointInputSchema = z.strictObject({
  focus: focusSchema,
  state: z.enum(['active', 'blocked', 'handoff']),
  summary: text,
  next: text,
  blockers: z.array(text).default([]),
});
export const checkpointSchema = z.strictObject({
  version: z.literal(1),
  sequence: z.number().int().positive(),
  createdAt: z.string().datetime(),
  taskId: id,
  configDigest: digest,
  taskDigest: digest,
  sources: z.array(z.strictObject({ id, digest })),
  note: checkpointInputSchema,
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
    .array(z.strictObject({ path: relativePath, description: text }))
    .min(1)
    .max(8),
  limitations: z.array(text).max(128).default([]),
});
export const evidenceSchema = z.strictObject({
  version: z.literal(1),
  id: z.string().uuid(),
  taskId: id,
  createdAt: z.string().datetime(),
  trust: z.literal('local-attachment-not-attested'),
  capturedInputs: z.strictObject({
    configDigest: digest,
    taskDigest: digest,
    sources: z.array(z.strictObject({ id, digest })),
  }),
  observation: evidenceInputSchema.omit({ artifacts: true }),
  artifacts: z
    .array(
      z.strictObject({
        path: z.string().regex(/^artifacts\/[0-7]\.[a-zA-Z0-9]{1,12}$/),
        originalPath: relativePath,
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
export const testSummarySchema = z.strictObject({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export const receiptSchema = z.strictObject({
  version: z.literal(1),
  clinxVersion: text,
  runId: z.string().uuid(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  trust: z.literal('local-execution-not-attested'),
  configDigest: digest,
  taskDigest: digest.nullable(),
  claim: text,
  runtime: z.strictObject({ node: text, platform: text, arch: text }),
  sources: z.array(
    z.strictObject({
      id,
      before: digest,
      after: digest.nullable(),
      files: z.number().int().nonnegative(),
    }),
  ),
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

export type Config = z.infer<typeof configSchema>;
export type Check = Config['checks'][number];
export type Source = Config['sources'][number];
export type Task = z.infer<typeof taskSchema>;
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
export function validateConfig(value: unknown): Config {
  const config = configSchema.parse(value);
  unique(
    config.sources.map((s) => s.id),
    'source IDs',
  );
  unique(
    config.checks.map((c) => c.id),
    'check IDs',
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
  return config;
}
// Validate the contract itself independently of today's project configuration.
// Historical references may be obsolete; that must not prevent a valid revision.
export function parseTask(value: unknown): Task {
  const task = taskSchema.parse(value);
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
export function validateTask(value: unknown, config: Config): Task {
  const task = parseTask(value);
  for (const o of task.obligations) {
    if ('checks' in o && o.checks.some((c) => !config.checks.some((check) => check.id === c)))
      throw new Error(`${o.id}: unknown check`);
  }
  return task;
}
