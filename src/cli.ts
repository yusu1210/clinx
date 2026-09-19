import { parseArgs } from 'node:util';
import { isAbsolute, relative, resolve } from 'node:path';
import { inside, MAX_FILE_BYTES, readJson, sourceRoots } from './files.js';
import { inspect } from './inspect.js';
import { addEvidence, listEvidence } from './evidence.js';
import { openWorkspace, taskSources } from './workspace.js';
import { addTask, checkpoint, context, listTasks, readTask, reviseTask, showTask } from './task.js';
import { focusSchema } from './schema.js';
import { previewChecks, reconcile, verify } from './verify.js';
import { version } from './version.js';
import { init, manageSkill } from './install.js';
import { commands, commandHelp, renderHelp } from './commands.js';
import { CliError, errorResult, renderError, renderResult } from './output.js';
import { resources, exampleCatalog, copyExample } from './resources.js';
import { status } from './status.js';

export const help = renderHelp()!;

async function readInput(file: string): Promise<unknown> {
  if (file !== '-') return readJson(resolve(file));
  if (process.stdin.isTTY)
    throw new CliError(
      'USAGE',
      '--file - requires piped JSON',
      'Pipe a complete JSON document or pass --file PATH; clinx does not prompt for input.',
    );
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_FILE_BYTES)
      throw new CliError(
        'INVALID_INPUT',
        'Standard input exceeds 8 MiB',
        'Pass a bounded JSON document; reference large artifacts by path.',
      );
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } catch {
    throw new SyntaxError('Invalid JSON on standard input; inspect the input locally');
  }
}

export async function main(argv: string[]): Promise<number> {
  let json = argv.includes('--json');
  let key = '';
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
        to: { type: 'string' },
        limit: { type: 'string' },
        after: { type: 'string' },
        apply: { type: 'boolean' },
        run: { type: 'boolean' },
        'allow-external': { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
    json = values.json ?? false;
    const [command, sub, extra] = positionals;
    key = ['task', 'evidence', 'skill', 'example'].includes(command ?? '')
      ? [command, sub].filter(Boolean).join(' ')
      : (command ?? '');
    if (values.help || !command || command === 'help') {
      const topic = command === 'help' ? positionals.slice(1).join(' ') : key;
      const content = json ? commandHelp(topic) : renderHelp(topic);
      if (!content)
        throw new CliError(
          'USAGE',
          `Unknown help topic: ${topic}`,
          'Run clinx --help for available commands.',
        );
      if (!values.version) {
        process.stdout.write(json ? `${JSON.stringify(content, null, 2)}\n` : (content as string));
        return 0;
      }
    }
    if (values.version) {
      if (command)
        throw new CliError('USAGE', '--version is a top-level option', 'Run clinx --version.');
      process.stdout.write(
        json ? `${JSON.stringify({ name: 'clinx', version })}\n` : `${version}\n`,
      );
      return 0;
    }
    const root = resolve(values.root ?? process.cwd());
    const required = (value: string | undefined, label: string) => {
      if (!value)
        throw new CliError(
          'USAGE',
          `Missing ${label}`,
          `Run clinx ${key} --help for an input example.`,
        );
      return value;
    };
    if (!Object.hasOwn(commands, key))
      throw new CliError(
        'USAGE',
        `Unknown command: ${key}`,
        'Run clinx --help for available commands.',
      );
    const definition = commands[key]!;
    for (const option of Object.keys(values))
      if (!['root', 'json'].includes(option) && !definition.options.includes(option))
        throw new CliError(
          'USAGE',
          `--${option} is not valid for ${key}`,
          `Run clinx ${key} --help.`,
        );
    if (positionals.length > definition.positionals)
      throw new CliError(
        'USAGE',
        'Unexpected positional arguments',
        `Usage: clinx ${definition.usage}`,
      );
    for (const [option, value] of Object.entries(values))
      if (typeof value === 'string' && !value.trim())
        throw new CliError(
          'USAGE',
          `--${option} must not be blank`,
          `Omit --${option} to use its default, or supply a valid value.`,
        );
    if (values.limit !== undefined && !/^(?:[1-9]|[1-9][0-9]|1[0-9]{2}|200)$/.test(values.limit))
      throw new CliError(
        'USAGE',
        '--limit must be an integer from 1 to 200',
        `Run clinx ${key} --help.`,
      );
    if (
      command === 'status' &&
      sub !== undefined &&
      (values.limit !== undefined || values.after !== undefined)
    )
      throw new CliError(
        'USAGE',
        'Pagination is not used with a selected status task',
        'Omit --limit and --after when providing a task ID.',
      );
    const page = {
      ...(values.limit === undefined ? {} : { limit: Number(values.limit) }),
      ...(values.after === undefined ? {} : { after: values.after }),
    };
    if (definition.options.includes('file')) required(values.file, '--file');
    if (key === 'task revise') required(values.reason, '--reason');
    if (['context', 'verify', 'reconcile'].includes(key)) required(sub, 'task ID');
    if (['task revise', 'task checkpoint', 'evidence attach', 'evidence list'].includes(key))
      required(extra, 'task ID');
    if (key === 'reconcile') required(values.receipt, '--receipt');
    if (values['allow-external'] && !values.run)
      throw new CliError(
        'USAGE',
        '--allow-external requires --run',
        'Review clinx verify --help; the flag is not an approval credential.',
      );
    let result: unknown;
    let exit = 0;
    if (command === 'status') {
      result = await status(root, sub, page);
    } else if (command === 'inspect') {
      result = await inspect(root);
    } else if (command === 'init') {
      const agent = values.agent;
      if (agent !== undefined && agent !== 'codex' && agent !== 'generic')
        throw new CliError(
          'USAGE',
          '--agent must be codex or generic',
          'Run clinx init --help for placement and discovery details.',
        );
      result = await init(root, agent, values.apply ?? false);
    } else if (command === 'skill') {
      result = await manageSkill(
        root,
        sub as 'status' | 'update' | 'remove',
        values.apply ?? false,
      );
    } else if (command === 'resources') {
      result = resources();
    } else if (command === 'example') {
      result =
        sub === 'list'
          ? exampleCatalog.map(({ path: _path, ...example }) => example)
          : await copyExample(required(extra, 'example name'), required(values.to, '--to'));
    } else if (key === 'task list') {
      result = await listTasks(root, page);
    } else if (key === 'task show') {
      result = await showTask(root, required(extra, 'task ID'), page);
    } else if (key === 'evidence list') {
      result = await listEvidence(root, required(extra, 'task ID'), values.record);
    } else {
      const p = await openWorkspace(root);
      if (command === 'validate') {
        const task = sub ? await readTask(p, sub) : null;
        await sourceRoots(p.root, {
          ...p.config,
          sources: task ? taskSources(p, task.task) : p.config.sources,
        });
        result = {
          valid: true,
          workspace: p.config.name,
          task: task?.task.id ?? null,
          note: 'Structure and references validated; not semantic correctness or command availability',
        };
      } else if (command === 'context') {
        result = await context(
          p,
          required(sub, 'task ID'),
          values.focus !== undefined ? focusSchema.parse(values.focus) : undefined,
        );
      } else if (command === 'evidence') {
        result = await addEvidence(
          p,
          required(extra, 'task ID'),
          await readInput(required(values.file, '--file')),
        );
      } else if (command === 'task') {
        const input = await readInput(required(values.file, '--file'));
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
        if (command === 'reconcile') {
          const receipt = required(values.receipt, '--receipt');
          // An explicitly selected workspace may itself be a filesystem alias.
          // Normalize only its lexical prefix; boundedPath still rejects symlinks
          // and escapes inside the canonical workspace.
          const receiptPath =
            isAbsolute(receipt) && inside(root, resolve(receipt))
              ? relative(root, resolve(receipt))
              : receipt;
          const verdict = await reconcile(p, id, receiptPath, values.claim);
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
    process.stdout.write(
      json ? `${JSON.stringify(result, null, 2)}\n` : renderResult(key, root, result),
    );
    return exit;
  } catch (error) {
    const detail = errorResult(error, Object.hasOwn(commands, key) ? key : '');
    process.stderr.write(json ? `${JSON.stringify(detail)}\n` : renderError(detail));
    return 3;
  }
}
