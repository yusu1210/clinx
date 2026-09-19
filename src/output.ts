import { ZodError } from 'zod';
import type { init } from './install.js';
import type { inspect } from './inspect.js';
import type { status } from './status.js';

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
  if (command === 'status') {
    const data = result as Awaited<ReturnType<typeof status>>;
    const skills = data.skills;
    const managed = skills && 'managed' in skills && skills.managed;
    return [
      'LOCAL STATUS — no checks executed; acceptance not assessed',
      `Workspace: ${terminalText(data.root)}`,
      `CLI: ${terminalText(data.version)}`,
      `Skills: ${!skills ? 'could not inspect' : managed ? 'local installation recorded' : 'no local ownership record (host/team Skills may still be available)'}`,
      ...(skills && 'matchesPackage' in skills
        ? [
            `Bundled Skill bytes match: ${skills.matchesPackage}`,
            ...skills.warnings.map((warning) => `Warning: ${terminalText(warning)}`),
            ...(skills.files ?? [])
              .filter((file) => file.local !== 'unchanged' || !file.matchesPackage)
              .map(
                (file) =>
                  `  ${file.local}: ${terminalText(file.path)}${file.owned ? '' : ' (user-owned)'}; package match: ${file.matchesPackage}`,
              ),
            ...(!skills.matchesPackage
              ? ['Review clinx skill status before updating; preserve local customizations.']
              : []),
          ]
        : []),
      'Host Skill discovery: not observed by this CLI',
      `Configuration: ${data.configuration.state} (not required for Skill use)`,
      `${data.requestedTask ? 'Requested task records' : 'Saved tasks on this page'}: ${data.tasks.length}`,
      ...(data.nextAfter
        ? [
            `More tasks: repeat status with --after ${terminalText(data.nextAfter)} (or use task list).`,
          ]
        : []),
      ...data.tasks.flatMap((task) => [
        `  ${terminalText(task.id)} — ${terminalText(task.title ?? '(no readable CLI contract)')}`,
        ...(task.checkpoint
          ? [`    saved handoff: ${task.checkpoint.state}; focus: ${task.checkpoint.focus}`]
          : []),
        ...task.issues.map((issue) => `    issue: ${terminalText(issue.error)}`),
      ]),
      ...(data.selected
        ? [
            `Selected task: ${terminalText(data.selected.task.id)}; continuity: ${data.selected.continuity}`,
            ...data.selected.changes.map((change) => `  change: ${terminalText(change)}`),
            ...(data.selected.checkpoint
              ? [
                  `Saved summary: ${terminalText(data.selected.checkpoint.note.summary)}`,
                  ...data.selected.checkpoint.note.blockers.map(
                    (blocker) => `  saved blocker (recheck): ${terminalText(blocker)}`,
                  ),
                  `Saved next action (recheck before acting): ${terminalText(data.selected.checkpoint.note.next)}`,
                ]
              : []),
          ]
        : []),
      ...data.issues.map(
        (issue) =>
          `Issue (${terminalText(issue.component)}): ${terminalText(issue.message)}\n${(issue.fields ?? []).map((field) => `  ${terminalText(field.path)}: ${terminalText(field.message)}\n`).join('')}  ${terminalText(issue.hint)}`,
      ),
      '',
      terminalText(data.next),
      'Use --json for details. This snapshot does not certify source access, approvals or delivery.',
      '',
    ].join('\n');
  }
  if (['init', 'skill update', 'skill remove'].includes(command)) {
    const data = result as Awaited<ReturnType<typeof init>>;
    const conflicts = data.files.filter((file) => file.status === 'conflict').length;
    return [
      `${data.applied ? 'APPLIED' : 'PREVIEW — no files written'}: ${command}`,
      `Workspace: ${terminalText(data.root)}`,
      `CLI package: ${terminalText(data.origin.version)} | Recorded Skill version: ${terminalText(data.installedVersion ?? 'none')}`,
      `Package root: ${terminalText(data.packageRoot)}`,
      ...data.warnings.map((warning) => `Warning: ${terminalText(warning)}`),
      '',
      `Files: ${Object.entries(
        data.files.reduce<Record<string, number>>((counts, file) => {
          counts[file.status] = (counts[file.status] ?? 0) + 1;
          return counts;
        }, {}),
      )
        .map(([state, count]) => `${count} ${state}`)
        .join(', ')}`,
      `Skill folders: ${data.agent === 'codex' ? '.agents/skills/' : 'clinx/skills/'}clinx-delivery and clinx-knowledge; entry: clinx/agent-entry.md`,
      ...data.files
        .filter((file) => ['conflict', 'update', 'remove', 'missing'].includes(file.status))
        .map(
          (file) =>
            `  ${file.status.padEnd(10)} ${terminalText(file.path)}${file.owned ? '' : ' (user-owned)'}`,
        ),
      '',
      `Ownership record: ${data.installationRecord}`,
      'Use --json for the complete per-file plan and ownership.',
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
      ...(data.locations.length
        ? [
            'Nearby directories (not inspected; select only those relevant to the request):',
            ...data.locations.map((item) => `  ${terminalText(item.path)}`),
          ]
        : []),
      ...(data.locationsTruncated
        ? ['Directory hints truncated; this is not a complete inventory.']
        : []),
      ...(!data.candidates.length
        ? [
            'No command candidates at the selected root(s). Continue with project guidance and relevant source directories; this does not mean no tools or tests exist.',
          ]
        : []),
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
