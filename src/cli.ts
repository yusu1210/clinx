import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { readJson, sourceRoots } from './files.js';
import { inspect } from './inspect.js';
import { addEvidence, listEvidence } from './evidence.js';
import { context, listTasks, project, readTask } from './project.js';
import { focusSchema } from './schema.js';
import { previewChecks, reconcile, verify } from './verify.js';
import { version } from './version.js';
import { addTask, checkpoint, init, reviseTask } from './workspace.js';

export const help = `clinx — CLI support for AI-native full-stack engineering

  inspect                               Find local command/docs candidates; no init or execution
  init [--agent codex|generic] [--apply]   Preview / add Skill and entry; no project configuration
  task add --file contract.json          Validate and persist an explicit task contract
  task list                             List tasks; never silently select one
  task revise ID --file JSON --reason TEXT  Preserve previous contract, apply revision
  task checkpoint ID --file note.json    Save an input-bound handoff note (not proof)
  evidence attach ID --file JSON         Attach reviewed local artifacts; never approves a claim
  evidence list ID [--record UUID]       Check attachment bytes/local drift; no remote validation
  context ID [--focus discover|contract|build|verify|learn]  Restore task + relevant index
  validate [ID]                         Validate project and optional task; no commands run
  verify ID [--claim NAME]               Preview selected checks and external obligations
  verify ID --run [--allow-external]     Run reviewed, authorized commands; save receipt
  reconcile ID --receipt PATH           Reconcile existing evidence; no commands run

Common: --root DIRECTORY (default cwd), --help, --version. Results are JSON.
Exit codes: 0 valid/preview/supported, 1 failed claim, 2 unresolved claim, 3 error.
init defaults to generic; --agent codex adds only project-local .agents/skills.
No model calls, environment setup, automatic deploy, telemetry, or publication.
`;
export async function main(argv: string[]): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: 'string' },
        agent: { type: 'string' },
        file: { type: 'string' },
        reason: { type: 'string' },
        focus: { type: 'string' },
        claim: { type: 'string' },
        receipt: { type: 'string' },
        record: { type: 'string' },
        apply: { type: 'boolean' },
        run: { type: 'boolean' },
        'allow-external': { type: 'boolean' },
        help: { type: 'boolean' },
        version: { type: 'boolean' },
      },
    });
    if (values.help || argv.length === 0) {
      process.stdout.write(help);
      return 0;
    }
    if (values.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    const [command, sub, extra] = positionals;
    const root = resolve(values.root ?? process.cwd());
    const required = (value: string | undefined, label: string) => {
      if (!value) throw new Error(`Missing ${label}`);
      return value;
    };
    const allowed: Record<string, string[]> = {
      init: ['agent', 'apply'],
      inspect: [],
      validate: [],
      context: ['focus'],
      verify: ['claim', 'run', 'allow-external'],
      reconcile: ['claim', 'receipt'],
      'task add': ['file'],
      'task list': [],
      'task revise': ['file', 'reason'],
      'task checkpoint': ['file'],
      'evidence attach': ['file'],
      'evidence list': ['record'],
    };
    const key = command === 'task' || command === 'evidence' ? `${command} ${sub}` : command!;
    if (!Object.hasOwn(allowed, key)) throw new Error('Unknown command; run clinx --help');
    for (const option of Object.keys(values))
      if (option !== 'root' && !allowed[key]!.includes(option))
        throw new Error(`--${option} is not valid for ${key}`);
    const limit =
      key === 'task revise' || key === 'task checkpoint' || command === 'evidence'
        ? 3
        : key.startsWith('task ')
          ? 2
          : command === 'init' || command === 'inspect'
            ? 1
            : 2;
    if (positionals.length > limit) throw new Error('Unexpected positional arguments');
    let result: unknown;
    let exit = 0;
    if (command === 'inspect') {
      result = await inspect(root);
    } else if (command === 'init') {
      const agent = values.agent ?? 'generic';
      if (agent !== 'codex' && agent !== 'generic')
        throw new Error('agent must be codex or generic');
      result = await init(root, agent, values.apply ?? false);
    } else if (key === 'task list') {
      result = await listTasks(root);
    } else {
      const p = await project(root);
      if (command === 'validate') {
        await sourceRoots(p.root, p.config);
        const task = sub ? await readTask(p, sub) : null;
        result = {
          valid: true,
          project: p.config.name,
          task: task?.task.id ?? null,
          note: 'Structure and references validated; not semantic correctness or command availability',
        };
      } else if (command === 'context') {
        result = await context(
          p,
          required(sub, 'task ID'),
          values.focus ? focusSchema.parse(values.focus) : undefined,
        );
      } else if (command === 'evidence') {
        const id = required(extra, 'task ID');
        result =
          sub === 'list'
            ? await listEvidence(p, id, values.record)
            : await addEvidence(p, id, await readJson(resolve(required(values.file, '--file'))));
      } else if (command === 'task') {
        const input = await readJson(resolve(required(values.file, '--file')));
        if (sub === 'add') result = await addTask(p, input);
        else if (sub === 'revise')
          result = await reviseTask(
            p,
            required(extra, 'task ID'),
            input,
            required(values.reason, '--reason'),
          );
        else result = await checkpoint(p, required(extra, 'task ID'), input);
      } else if (command === 'verify' || command === 'reconcile') {
        const id = required(sub, 'task ID');
        if (values['allow-external'] && !values.run)
          throw new Error('--allow-external requires --run');
        if (command === 'reconcile') {
          const verdict = await reconcile(
            p,
            id,
            required(values.receipt, '--receipt'),
            values.claim,
          );
          result = { verdict };
          exit = verdict.decision === 'supported' ? 0 : verdict.decision === 'failed' ? 1 : 2;
        } else if (values.run) {
          const run = await verify(p, id, values.claim, values['allow-external']);
          result = run;
          exit =
            run.verdict.decision === 'supported' ? 0 : run.verdict.decision === 'failed' ? 1 : 2;
        } else result = await previewChecks(p, id, values.claim);
      }
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return exit;
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`,
    );
    return 3;
  }
}
