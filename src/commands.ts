type Command = {
  usage: string;
  summary: string;
  options: string[];
  positionals: number;
  details: string;
  examples: string[];
};

export const commands: Record<string, Command> = {
  'example list': {
    usage: 'example list',
    summary: 'List bundled, public practice cases and their prerequisites',
    options: [],
    positionals: 2,
    details:
      'Read-only. These original synthetic cases illustrate specific boundaries, not a required language, domain or production scaffold.',
    examples: ['clinx example list'],
  },
  'example copy': {
    usage: 'example copy NAME --to NEW_DIRECTORY',
    summary: 'Copy a practice case into a new directory without executing it',
    options: ['to'],
    positionals: 3,
    details:
      '--to is relative to invoking cwd. Its parent must exist; the destination must not exist (including symlinks). Does not merge into a business repository, install dependencies or start services. A failed partial copy is retained for inspection.',
    examples: [
      'clinx example copy noticeboard --to ./noticeboard-demo',
      'clinx example copy reading-list --to ./reading-list-demo',
    ],
  },
  init: {
    usage: 'init [--agent codex|generic] [--apply]',
    summary: 'Preview or install the workspace-local Skill and entry',
    options: ['agent', 'apply'],
    positionals: 1,
    details:
      'Defaults to a read-only preview and the recorded placement (generic for a new installation). --apply installs without replacing conflicting files. Records local file ownership in .clinx/install/state.json; does not generate configuration, project facts or tasks. Existing identical files remain user-owned. Run skill update for an already managed installation.',
    examples: ['clinx init --agent codex --apply', 'clinx init --root ../delivery --agent generic'],
  },
  'skill status': {
    usage: 'skill status',
    summary: 'Compare the recorded Skill installation with local and packaged files',
    options: [],
    positionals: 2,
    details:
      'Read-only. Reports installed/package versions, missing or modified files and available changes. Does not contact a registry, inspect host discovery or prove instruction precedence.',
    examples: ['clinx skill status', 'clinx skill status --json'],
  },
  'skill update': {
    usage: 'skill update [--apply]',
    summary: 'Preview or safely update files managed by clinx',
    options: ['apply'],
    positionals: 2,
    details:
      'Uses assets bundled with this CLI, without downloads. --apply updates only managed files whose current bytes match the recorded baseline or the new package. Conflicts abort the write. User-owned files are preserved. Replaced files and the installation record are backed up under .clinx/install/backups/.',
    examples: ['clinx skill update', 'clinx skill update --apply'],
  },
  'skill remove': {
    usage: 'skill remove [--apply]',
    summary: 'Preview or remove unchanged managed Skill files, keeping backups',
    options: ['apply'],
    positionals: 2,
    details:
      'Modified managed files block removal. Unmanaged files, configuration, tasks, logs and host instructions are never removed. Backups remain under .clinx/install/backups/. Does not uninstall the CLI or remove directories recursively.',
    examples: ['clinx skill remove', 'clinx skill remove --apply'],
  },
  resources: {
    usage: 'resources',
    summary: 'Locate the installed Skill, templates, examples, schemas and guides',
    options: [],
    positionals: 1,
    details:
      'Prints paths in this CLI installation. No checkout, shell wrapper, downloads or writes. Treat templates as drafting aids, not verified project configuration.',
    examples: ['clinx resources', 'clinx resources --json'],
  },
  inspect: {
    usage: 'inspect',
    summary: 'Find local command and documentation candidates without executing them',
    options: [],
    positionals: 1,
    details:
      'Works without initialization or configuration. Reads the selected root or explicitly configured sources. Does not search parent directories, execute scripts, install tools or establish runtime readiness. Review candidate definitions and effects before execution.',
    examples: ['clinx inspect', 'clinx inspect --root ../service --json'],
  },
  'task add': {
    usage: 'task add --file PATH',
    summary: 'Validate and save a task agreement without replacing an existing task',
    options: ['file'],
    positionals: 2,
    details:
      'Requires reviewed clinx.config.json and a complete contract. --file is relative to the invoking cwd, not --root; use --file - for piped JSON (8 MiB maximum). The agent prepares the agreement from the PRD and engineering facts; the user need not fill a JSON form. See resources for task schema and templates.',
    examples: [
      'clinx task add --file contract.json',
      'clinx task add --file - --json < contract.json',
    ],
  },
  'task list': {
    usage: 'task list',
    summary: 'List task agreements, handoffs and record issues',
    options: [],
    positionals: 2,
    details:
      'Works without configuration. Never silently selects a task. Listing success is not task validity or current evidence; inspect issues for each entry.',
    examples: ['clinx task list', 'clinx task list --root ../delivery --json'],
  },
  'task show': {
    usage: 'task show ID',
    summary:
      'Read a task agreement, revisions and latest handoff without validating current inputs',
    options: [],
    positionals: 3,
    details:
      'Works without configuration or available source directories. Reads saved contract history and checkpoint issues only; it does not assess evidence applicability, execute commands or select a task.',
    examples: ['clinx task show feature', 'clinx task show feature --json'],
  },
  'task revise': {
    usage: 'task revise ID --file PATH --reason TEXT',
    summary: 'Preserve the old agreement and apply an explicit replacement',
    options: ['file', 'reason'],
    positionals: 3,
    details:
      'Requires a complete replacement contract with the same ID and a nonblank reason. --file accepts an invoking-cwd-relative file or - for piped JSON. Preserves the old contract; does not roll back code or replay commands. Changed bindings require evidence reconciliation.',
    examples: ['clinx task revise feature --file contract.json --reason "Approved scope change"'],
  },
  'task checkpoint': {
    usage: 'task checkpoint ID --file PATH',
    summary: 'Save an input-bound handoff note, not proof of completion',
    options: ['file'],
    positionals: 3,
    details:
      'The note contains focus, state, summary and next; blocked state also needs concrete blockers. --file is relative to invoking cwd, or - for piped JSON. Existing handoffs are preserved. Inspect previousCheckpointIssues if the last record was damaged.',
    examples: ['clinx task checkpoint feature --file note.json'],
  },
  'evidence attach': {
    usage: 'evidence attach ID --file PATH',
    summary: 'Archive reviewed local observation artifacts without approving claims',
    options: ['file'],
    positionals: 3,
    details:
      'Input JSON describes obligations, observer, UTC observation time, target, outcome, summary and artifacts. --file is relative to invoking cwd, or - for piped JSON. Artifact paths are relative to the named source or workspace. Redact secrets first. Limits: 8 regular files, 8 MiB each, 16 MiB total. Does not satisfy external obligations.',
    examples: ['clinx evidence attach feature --file observation.json'],
  },
  'evidence list': {
    usage: 'evidence list ID [--record UUID]',
    summary: 'Inspect saved attachment integrity and local binding',
    options: ['record'],
    positionals: 3,
    details:
      'Does not validate remote state or approvals. Listing exit zero does not assert that records are intact or current. Read integrity, localBinding and limitations for each record.',
    examples: ['clinx evidence list feature --json'],
  },
  context: {
    usage: 'context ID [--focus discover|contract|build|verify|learn]',
    summary: 'Restore a selected task, handoff, drift and relevant reference index',
    options: ['focus'],
    positionals: 2,
    details:
      'Requires configuration but preserves readable history when source inputs are unavailable. No automatic task selection, command replay, remote observation or approval. Reconcile relevant changes before reusing earlier results.',
    examples: ['clinx context feature --focus build', 'clinx context feature --json'],
  },
  validate: {
    usage: 'validate [ID]',
    summary: 'Check workspace or task structure and references without running commands',
    options: [],
    positionals: 2,
    details:
      'Requires clinx.config.json. With an ID, validates that task and its selected sources; without one, validates all configured roots. Does not prove semantic completeness, command availability or runtime readiness.',
    examples: ['clinx validate', 'clinx validate feature --json'],
  },
  verify: {
    usage: 'verify ID [--claim NAME] [--run [--allow-external]]',
    summary: 'Preview checks, or execute authorized checks and retain a receipt',
    options: ['claim', 'run', 'allow-external'],
    positionals: 2,
    details:
      'Defaults to a read-only preview, not a passing verdict. --run executes reviewed checks with inherited OS permissions, environment and network. --allow-external also requires --run and real task-specific authority; it is not an approval credential. Exit 0 supported, 1 failed, 2 unresolved, 3 input/operational error. Commands must complete; do not register a permanent server process as a check.',
    examples: [
      'clinx verify feature',
      'clinx verify feature --run --json',
      'clinx verify feature --claim local --run',
    ],
  },
  reconcile: {
    usage: 'reconcile ID --receipt PATH [--claim NAME]',
    summary: 'Interpret a saved receipt against current declared inputs without rerunning',
    options: ['receipt', 'claim'],
    positionals: 2,
    details:
      'Receipt paths are relative to --root (or absolute inside that root), unlike --file imports. Does not combine receipts, observe remote state or grant approval. Stale or unknown applicability cannot support a current claim.',
    examples: ['clinx reconcile feature --receipt .clinx/runs/RUN/receipt.json --json'],
  },
};

export function commandHelp(key = '') {
  const command = Object.hasOwn(commands, key) ? commands[key] : undefined;
  const entries = command
    ? [[key, command] as const]
    : Object.entries(commands).filter(([name]) => !key || name.startsWith(`${key} `));
  if (!entries.length) return null;
  return {
    name: 'clinx',
    topic: key || 'overview',
    summary: 'AI-native full-stack engineering: optional CLI support for agent-led delivery',
    commands: Object.fromEntries(entries),
    common:
      '--root DIRECTORY (default: invoking cwd, no parent discovery), --json, -h/--help, -v/--version',
    boundaries:
      'No model calls, environment setup, automatic deployment, telemetry or publication. No interactive prompts. Preview/structure success is not a verified claim.',
    exitCodes: {
      0: 'valid / local mutation / preview / supported claim',
      1: 'failed claim',
      2: 'unresolved claim',
      3: 'input or operational error',
    },
  };
}

export function renderHelp(key = ''): string | null {
  const help = commandHelp(key);
  if (!help) return null;
  const entries = Object.values(help.commands);
  return [
    `clinx — ${help.summary}`,
    '',
    ...(Object.hasOwn(commands, key)
      ? entries.flatMap((c) => [
          `Usage: clinx ${c.usage}`,
          '',
          c.summary,
          '',
          c.details,
          '',
          'Examples:',
          ...c.examples.map((e) => `  ${e}`),
        ])
      : [
          'Commands:',
          ...entries.map((c) => `  ${c.usage}\n    ${c.summary}`),
          '',
          'Start: clinx init --agent codex --apply',
          'Then ask your agent to use clinx-delivery with the PRD and project paths.',
          'Use clinx COMMAND --help for examples and safety boundaries.',
        ]),
    '',
    help.common,
    help.boundaries,
    'Exit codes: 0 valid/preview/supported, 1 failed claim, 2 unresolved claim, 3 error.',
    '',
  ].join('\n');
}
