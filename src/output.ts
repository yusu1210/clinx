import { ZodError } from 'zod';
import type { init } from './install.js';
import type { inspect } from './inspect.js';

export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint: string,
  ) {
    super(message);
  }
}

// Repository names and descriptions are data, not terminal control sequences.
export const terminalText = (value: string): string =>
  value.replace(
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
const label = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
function lines(value: unknown, depth = 0): string[] {
  const indent = '  '.repeat(depth);
  if (Array.isArray(value))
    return value.length
      ? value.flatMap((item) => {
          const rendered = lines(item, depth + 1);
          return [`${indent}- ${rendered[0]!.trimStart()}`, ...rendered.slice(1)];
        })
      : [`${indent}(none)`];
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return [`${indent}(empty object)`];
    return entries.flatMap(([key, item]) => {
      const heading = `${indent}${terminalText(label(key))}:`;
      if (item !== null && typeof item === 'object') return [heading, ...lines(item, depth + 1)];
      return [`${heading} ${terminalText(String(item))}`];
    });
  }
  return [`${indent}${terminalText(String(value))}`];
}

export function renderResult(command: string, root: string, result: unknown): string {
  if (['init', 'skill update', 'skill remove'].includes(command)) {
    const data = result as Awaited<ReturnType<typeof init>>;
    const conflicts = data.files.filter((file) => file.status === 'conflict').length;
    return [
      `${data.applied ? 'APPLIED' : 'PREVIEW — no files written'}: ${command}`,
      `Workspace: ${terminalText(data.root)}`,
      `CLI package: ${terminalText(data.origin.version)} | Recorded Skill version: ${terminalText(data.installedVersion ?? 'none')}`,
      '',
      ...data.files.map(
        (file) =>
          `  ${file.status.padEnd(10)} ${terminalText(file.path)}${file.owned ? '' : ' (user-owned)'}`,
      ),
      '',
      `Ownership record: ${data.installationRecord}`,
      ...(data.backup ? [`Original files retained: ${terminalText(data.backup)}`] : []),
      ...(conflicts ? [`${conflicts} conflict(s) must be resolved before writing.`] : []),
      ...(!data.applied
        ? [`To apply this operation, add --apply to the same command and target.`]
        : []),
      terminalText(data.next),
      '',
    ].join('\n');
  }
  if (command === 'inspect') {
    const data = result as Awaited<ReturnType<typeof inspect>>;
    return [
      `INSPECTION — ${data.candidates.length} unreviewed command candidate(s); nothing executed`,
      `Workspace: ${terminalText(root)}`,
      `Configuration: ${data.configured ? 'present' : 'not configured (not required for inspection)'}`,
      '',
      ...data.sources.flatMap((source) => [
        `Source ${terminalText(source.id)}: ${terminalText(source.root)}`,
        ...source.index.map((file) => `  reference: ${terminalText(file.path)}`),
        ...source.diagnostics.map(
          (issue) => `  diagnostic: ${terminalText(issue.path)} — ${terminalText(issue.reason)}`,
        ),
      ]),
      '',
      ...data.candidates.flatMap((candidate) => [
        `  ${terminalText(candidate.source)} / ${candidate.purpose}: argv ${terminalText(JSON.stringify(candidate.command))}`,
        `    cwd: ${terminalText(candidate.cwd)}; origin: ${terminalText(candidate.origin.path)} (${terminalText(candidate.origin.key)})`,
      ]),
      '',
      'Candidates are not verified, authorized or ready to run. Read definitions, hooks and targets first.',
      'Use --json for hashes, per-candidate review notes and full inspection limits.',
      '',
    ].join('\n');
  }
  let title = `clinx ${command}`;
  if (command === 'verify' || command === 'reconcile') {
    const data = result as { verdict?: { decision: string; applicability: string } };
    title = data.verdict
      ? `${data.verdict.decision.toUpperCase()} — applicability: ${data.verdict.applicability}`
      : 'PREVIEW — no checks executed; no claim established';
  }
  const location =
    command === 'resources' || command.startsWith('example ') ? 'Invoked from' : 'Workspace';
  return `${title}\n${location}: ${terminalText(root)}\n\n${lines(result).join('\n')}\n`;
}

export function errorResult(error: unknown, command: string) {
  if (error instanceof CliError)
    return { error: error.message, code: error.code, hint: error.hint };
  if (error instanceof ZodError)
    return {
      error: 'Invalid structured input',
      code: 'INVALID_INPUT',
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      hint: 'Read the relevant schema (clinx resources). Correct the declared input; do not invent project facts to satisfy it.',
    };
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return {
    error: error instanceof Error ? error.message : String(error),
    code:
      typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS')
        ? 'USAGE'
        : error instanceof SyntaxError
          ? 'INVALID_JSON'
          : 'OPERATION_FAILED',
    hint:
      code === 'ENOENT'
        ? 'Check the selected --root and path. Imports (--file) are relative to invoking cwd; receipts are relative to --root.'
        : `Run clinx ${command ? `${command} ` : ''}--help. Inspect any recorded effects before retrying a write.`,
  };
}

export function renderError(error: ReturnType<typeof errorResult>): string {
  return `Error [${error.code}]: ${terminalText(error.error)}\n${'issues' in error ? lines(error.issues).join('\n') + '\n' : ''}Next: ${terminalText(error.hint)}\n`;
}
