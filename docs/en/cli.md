# CLI reference and result semantics

[中文](../zh-CN/cli.md)

Use an [installed CLI](installation.md). `clinx --help` lists commands;
`clinx task add --help` (or `clinx help task add`) explains that command and its inputs.
Output is readable text by default, consistently in terminals and pipes. Use `--json`
for machine results, including structured help and version. Errors go to stderr with
`error`, `code` and `hint` in JSON mode; schema errors also include field-level `issues`.
Unknown/misapplied options are errors. No interactive prompts, ANSI colors or telemetry.
`--root` selects an existing directory (default: invoking cwd); no parent discovery.

| Command                                                         | Effect                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `resources`                                                     | Locate installed Skill, templates, schemas, guides and examples; no writes                |
| `example list`                                                  | List public practice cases and required tools                                             |
| `example copy NAME --to DIRECTORY`                              | Copy into a new directory, without executing or installing anything                       |
| `inspect`                                                       | Read bounded local manifest/docs candidates, without initialization, writes or execution  |
| `init [--agent generic\|codex]`                                 | Preview additions, no writes                                                              |
| `init ... --apply`                                              | Install Skill/license and entry, retaining a file-ownership record; conflicts stop writes |
| `skill status`                                                  | Compare recorded, current and bundled Skill files; no registry or host query              |
| `skill update [--apply]`                                        | Preview/update managed files, preserving user files and backing up replacements           |
| `skill remove [--apply]`                                        | Preview/remove unchanged managed files with backups; leave task data and unmanaged files  |
| `task add --file PATH`                                          | Validate explicit JSON contract, exclusive-create task                                    |
| `task list`                                                     | List contracts and latest handoffs; no automatic task selection                           |
| `task revise ID --file PATH --reason TEXT`                      | Preserve previous contract and apply this explicit replacement                            |
| `task checkpoint ID --file PATH`                                | Append a validated, input-bound continuity note                                           |
| `evidence attach ID --file PATH`                                | Copy reviewed observation artifacts; does not approve any claim                           |
| `evidence list ID [--record UUID]`                              | Check attachment bytes/local binding; no remote observation                               |
| `context ID [--focus discover\|contract\|build\|verify\|learn]` | Return contract, latest handoff, drift and relevant reference index                       |
| `validate [ID]`                                                 | Validate config/source roots and optional task/reference binding; no project commands     |
| `verify ID [--claim NAME]`                                      | Preview exactly the selected commands and external obligations                            |
| `verify ID --run [--allow-external]`                            | Execute selected reviewed checks and write a local receipt                                |
| `reconcile ID --receipt PATH [--claim NAME]`                    | Reconcile existing evidence against current declared inputs; no execution                 |

`--file` paths are relative to the invoking shell's cwd, not `--root`, because they
are explicit import inputs and may live outside the project. `--file -` reads one
complete piped JSON document, limited to 8 MiB; an interactive terminal is rejected.
`--to` is also relative to invoking cwd and its parent must already exist. Receipt paths are
resolved within `--root`. Source roots may be absolute or relative to `--root`,
including explicit sibling paths. Check cwd is confined to its source; report paths are confined to
that cwd. No template expansion or shell interpolation is performed.
Command arguments preserve empty strings and whitespace exactly; the executable must
be nonblank. Commands allow 1–128 strings, each at most 16,384 characters and without NUL.

## Workspace and task scope

init does not write a configuration, map, guide or task. Use the Skill directly,
or prepare a reviewed configuration when records are useful; optional
[workspace templates](../../templates/workspace) remain available. Existing project files
are not replaced by initialization. Skill updates replace only reviewed managed
files against their recorded baseline. [Installation and recovery](installation.md)
describes ownership, conflicts and backups. A missing config error is not a reason
to block normal engineering.

Every source requires a nonempty `inputs` list of literal paths. `exclude` removes
declared subtrees; explicitly naming an input that is itself excluded is an error.
There are no implicit directory-name or gitignore exclusions. `verify` previews the
source selectors alongside checks. Declare meaningful locks/configuration and exclude
generated/private records when using broad scopes. Symlink inputs are rejected;
executable symlinks preserve their invocation identity and are not source inputs
merely because a command uses them. Scope validation does not infer omitted inputs.
Each source is bounded to 50,000 entries (including directories), 128 MiB total,
and 8 MiB per file.

`--root` selects a workspace coordination directory, not necessarily a Git repository.
Task `sources` is an optional nonempty list of relevant source IDs; omitting it binds
all configured sources. Include unchanged dependencies and affected consumers. Check
sources and source-owned task references must be inside the task scope. `validate ID`
checks those roots; `validate` without an ID checks every configured root.

Both config and task `context` accept `{ "source": "service", "path": "docs/design.md" }`.
Omit `source` for a workspace-local file. Task reference bytes bind the agreement;
config context is navigation. Paths stay inside the selected root, without symlinks.
`context ID` filters navigation by focus and, for source-owned entries, by task source
scope. Workspace entries remain eligible. This is relevance selection, not permission.
Workspace-local references are relative to `--root`, not the task's directory.
See [workspace layout](workspace.md) for document ownership and input/output separation.

`definitionDigest` binds task source selectors and selected check execution definitions.
Receipt `definition` saves both source selectors and selected checks; its digest and
internal references are verified independently of current configuration before
interpreting historical observations. Damaged saved definitions leave interpretation
unknown. Navigation-only
changes, unrelated checks/sources, product version and the reader's runtime do not
invalidate a scoped receipt. A config file explicitly listed in source inputs still
binds its whole content. Checkpoints and attachments bind all task-referenced checks.
Record format and evidence `protocolVersion` are separate from product version;
an unsupported protocol yields unknown applicability. `current` describes declared
local bindings, not all toolchains or remote state. Verify environment requirements
with actual project checks or platform evidence, not with the reader's environment.

Changes to a relevant binding can stale the whole receipt. `reconcile` does not merge
receipts or infer check dependencies. Preserve unaffected code, but use a new run of
the selected claim for current CLI support;
see [binding and recovery](architecture.md#binding-and-recovery).

An empty repository can use the Skill immediately. CLI fingerprints need real files;
retain an actual requirement/design if records are already useful, then declare code
as it appears. Otherwise use an ordinary handoff until there are meaningful inputs.
Do not create dummy files, invent a check or include generated receipts to satisfy a schema.

## Static inspection before onboarding

`clinx inspect --root /path/to/project` works without a clinx configuration. It reads
the selected root only, or the explicitly declared source roots of an existing
valid configuration. It returns document/manifests paths and hashes, command
candidates, their origins, review notes and parse/access diagnostics. It does not
read `.env` files, run commands, scan the parent workspace, expand monorepo globs,
probe a network service, install tools or write configuration.

Supported candidates are package scripts (npm/pnpm/yarn/bun command conventions),
Maven compile/test/verify (preferring a present `mvnw`), and declared clinx checks.
Package manager declarations or a single lockfile family are used; without either,
npm is explicitly labeled a convention. Conflicting/unsupported manager evidence
does not produce a guessed script command. For nested projects use an explicit
`--root` or configured sources; unsupported toolchains remain a manual guide lookup.

Manifest/script names are untrusted data. Bodies are not printed, and scripts are
not imported or executed. Every candidate has `readiness: not-checked` and
`sideEffects: unreviewed`; even a test script can invoke hooks or remote writes.
Read the actual definition, invoked files and target before using it. An executable
wrapper's presence does not prove permission, tool availability or runtime health.
Inspection reads are capped at 256 KiB per document/manifest and 256 scripts per
manifest; symlinks are rejected. Missing optional files are normal; unreadable or
unsupported ones appear as diagnostics. An unavailable or unsafe declared check
directory is reported without discarding other candidates. Invalid clinx configuration
or an unavailable source root is a command error.
Exit 0 means inspection completed (possibly with diagnostics), not project validity.

## Models

[Config schema](../../schemas/config.schema.json), [task schema](../../schemas/task.schema.json),
[checkpoint input](../../schemas/checkpoint-input.schema.json), [checkpoint record](../../schemas/checkpoint.schema.json),
[receipt schema](../../schemas/receipt.schema.json), [evidence input](../../schemas/evidence-input.schema.json)
and [evidence record](../../schemas/evidence.schema.json) are generated from runtime models.
Use the CLI to also validate cross-references and path constraints.

Claims are explicit task labels, not built-in quality levels. Each claim has at
least one obligation; each obligation references one or more existing checks (all
required) or an unresolved external condition. The same check can support multiple
obligations only when its assertions actually cover them; a human/agent reviews
that semantic mapping. `defaultClaim` must name a declared claim.

Result formats:

The method does not require JUnit or any test framework. Use the project's native
tools. The CLI currently interprets only exit status and a strict subset of JUnit XML;
language-neutral execution is not universal report-format support.

```json
{ "format": "exit-code" }
```

Use this for a reviewed command whose exit status expresses the intended assertion,
such as a compiler, schema validator or native test command. It preserves stdout/stderr
but does not parse test counts, skipped cases or native JSON/TAP/device reports.
Confirm the actual selection and failure semantics with the native tool; an accepted
job, zero tests or successful report export may still exit zero. If a repeated gap
needs automation, add a focused project-owned assertion, not a mandatory new framework.

JUnit XML is an optional report adapter, not a Java requirement. Use it when the
existing tool emits a supported report and structured test identities are useful:

```json
{
  "format": "junit",
  "from": "files",
  "paths": ["target/surefire-reports/TEST-example.PolicyTest.xml"],
  "minTests": 1,
  "expectedTests": ["example.PolicyTest#rejectsUnavailable"]
}
```

`from: "stdout"` requires XML-only stdout and no paths. Default `minTests` is 1;
`expectedTests` defaults empty, so configure it when test selection matters. IDs use
`classname#name`, with the suite name as fallback when classname is absent. Failed
tests fail a check, skips or missing expected identities make it inconclusive.
Malformed, absent or unchanged old reports never pass. DTDs/entities, duplicate
identities, inconsistent counts and unsupported suite-level failures/skips cannot pass.
A nonzero command fails;
failure to start, timeout, interruption or unknown execution is inconclusive. Each check has a default
120-second timeout (configurable 50 ms–1 hour).

The supported subset traverses nested `testsuite`/`testsuites`, including Node's
direct testcase children. Unknown structural children (including unsupported rerun
extensions) are inconclusive, not ignored. `properties`/`property` and text-only
`system-out`/`system-err` metadata are supported. Reports stay in their saved native
XML; receipt `summary` contains only `total`, `passed`, `failed` and `skipped`.
Reconciliation re-parses the full saved reports, not just the counts.

For browser/device/trace evidence, keep the native artifact with its existing owner
and inspect it using the host's tools. Optional [attachments](evidence.md) can retain
reviewed regular-file exports within their size limits; they cannot directly import
a directory result bundle or promote it to acceptance. A missing parser does not
block normal engineering, and converting prose into passing JUnit is not verification.

## Exit status and claims

| Exit | Meaning                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| 0    | Valid structure / successful local mutation / preview; for verification, supported claim |
| 1    | At least one applicable required observation failed                                      |
| 2    | Unresolved obligation, missing evidence or stale applicability                           |
| 3    | Invalid input, unsafe path, storage/lock problem or other operational error              |

Always read the response: a preview's exit 0 is not a claim verdict. Fresh passing
checks support only declared obligations. External obligations remain unresolved;
the CLI has no manual acceptance override or signed external receipt importer.
Optional [evidence attachments](evidence.md) archive external observations separately.
Listing exit 0 does not assert intact bytes, current remote truth or acceptance;
inspect each entry and its limitations. Attachments never change verify.

## Recovery

Verification and reconciliation include `verdict.checks`: each required check's
execution state, recomputed observation, reason and artifact paths relative to the
workspace root. Use these to locate a missing executable, bad test selection, failure,
timeout or unreadable report without guessing from an aggregate verdict. A missing
execution appears as `not-recorded`, not success. Saved local observations may still
show pass when `applicability` is stale: they cannot satisfy current obligations.
Always interpret observations together with applicability and the claim decision.

Raw logs and receipts are in `.clinx/runs/UUID/`; nothing is uploaded. Inspect the
receipt's check reason, execution state and bounded stdout/stderr before retrying.
Failure to save evidence preserves known execution facts and available artifacts,
but leaves the observation inconclusive. Unexpected execution errors are `unknown`,
not proof that nothing ran. Inspect possible effects before retrying any write.
If a run could not finish writing a receipt, its partial logs are not a verified
result. SIGINT/SIGTERM cancels the current child process group; SIGKILL or an OS
crash cannot guarantee cleanup or a finalized receipt.

New files publish complete bytes under an exclusive final name. A crash may leave
an unselected `.clinx-write-UUID.tmp`; do not rename it into a receipt or infer success
from it. Preserve uncertain results for diagnosis. Every written file is limited to
8 MiB, matching reads; multi-file runs are not transactions.

The exclusive `.clinx/write.lock` contains a PID and creation time. If a writer
crashed, confirm the recorded process is gone and no writer remains before removing
only that lock manually. PID existence alone does not prove identity. clinx never
steals the lock automatically. Two distinct workspace roots are not a shared lock domain.

`context` reports `no-checkpoint`, `inputs-match` or `reconcile-required`. It does
not replay commands, choose a task or detect remote state/liveness. For revision,
prepare the complete next contract and pass a reason. Removed old checks or moved
old design paths do not block a valid replacement. The new contract must reference
current checks and readable, bounded files; old contract corruption or an ID mismatch
still blocks replacement. Previous JSON is retained, not historical referenced bytes;
see [revision binding](architecture.md#binding-and-recovery). No code rollback occurs.
`task list` reads contract definitions and handoffs, not current check applicability;
a listed task may need revision before validation, execution or new capture can use it.
Inspect each entry's `issues`: damaged task directories and symlinks are reported
without hiding healthy tasks; incidental regular files are not tasks. Listing exit 0
means enumeration succeeded, not every record is valid.

`task list` does not require configuration or available source roots. With valid
configuration, unavailable source roots do not hide saved context, attachments or
receipts: `context` reports the source error, `evidence list` reports unknown local
binding, and `reconcile` returns unknown applicability. Execution, new checkpoints
and attachment capture still require current inputs. Retired source/check references
also leave current applicability unknown without hiding historical observations or
handoffs; revise the agreement against the current configuration before new work.
Invalid task structure must be
repaired first. Unreadable task references leave `taskDigest`
null in context and applicability unknown in reconciliation; restoring access is
required before execution or new capture. Historical artifacts remain inspectable.

If the newest checkpoint is corrupt, unreadable or misidentified, `context` returns
`reconcile-required`, a diagnostic in `changes` and `checkpoint: null`. It does not
silently select an older note. Reconstruct current facts, then save a reviewed new
checkpoint if useful; its sequence advances past the damaged entry, which is retained.
The write result includes `previousCheckpointIssues`. This repairs continuity only,
not a corrupt contract, an unreadable checkpoint directory or an abandoned writer lock.
