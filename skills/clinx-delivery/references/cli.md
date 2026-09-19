# Optional CLI support

Use the installed `clinx` command from a reviewed version, not an unverified package
fetched by name. `clinx --version` identifies this CLI, not any installed Skill copy.
Use `clinx COMMAND --help` for command-specific inputs and `clinx resources` for
installed schemas, templates and guides; do not require a source checkout or shell
wrapper. Request `--json` for structured results and errors. Default output is readable
text; neither representation grants approval or changes the underlying verdict.
The CLI records engineering work; the agent still makes decisions and uses existing
tools. `--root` selects the workspace coordination directory, which need not be a Git
repository; `--file` is relative to the caller's working directory. Other recorded
paths are workspace-relative unless specified.

## Adopt only the support needed

Do not run this sequence for every request. If the Skill and native tools already
serve the task, proceed without initialization or configuration. When local setup is
unclear, `clinx status --json` combines installation, configuration and task summaries
without selecting a task or fingerprinting source contents. `status ID` also checks
that task's continuity; it does not run checks or assess acceptance. Inspect issues,
not just exit zero. Host/team-provided Skills need no local installation record.

`clinx init --root PROJECT --agent codex` previews Skill and entry files; `--apply`
writes without overwriting conflicts. A separate preview invocation is optional.
Both Skills are installed; generic mode uses `clinx/skills/`; an existing installation retains its
recorded placement when `--agent` is omitted.
Read `clinx/agent-entry.md`; existing host instructions are not edited. No project
configuration, map, guide or task is generated. Their optional templates remain
available through `clinx resources`; create useful content only after discovering facts.

`.clinx/install/state.json` records installed versions, baseline hashes and file
ownership. `skill status` compares these with local and bundled files, not host
discovery. `skill update` and `skill remove` preview; `--apply` writes only within
the managed file boundary, preserving user files and backing up replacements under
`.clinx/install/backups/`. Modified managed files block writes; never change hashes
or remove the record to bypass a conflict. CLI upgrades do not update Skill copies.
Do not upgrade a shared Skill as an incidental step of an unrelated delivery.
Keep customizations with project-owned guidance and use existing host discovery rules.

For records, write `clinx.config.json` from actual project facts: explicit source
roots and `inputs`, project-owned `exclude` paths, useful context references and
reviewed checks. No directory name or gitignore rule is implicitly excluded. Include
relevant code, locks and configuration; exclude generated/private record paths when
selecting broad directories. An explicitly included path cannot also be excluded.
Missing inputs block execution and new bindings; history can still be read with
unknown current applicability. Do not narrow away a relevant input to make evidence current.
With an empty repository, begin using the Skill and an ordinary handoff; if records
already help, bind actual requirement/design files until code exists. Do not invent
source files or checks merely to initialize the CLI.

For a multi-source task, use `sources` to name relevant source IDs. Include unchanged
dependencies and consumers as well as modified sources; a check's cwd does not describe
everything it reads. Omitting task `sources` conservatively binds every configured source.
An existing knowledge catalog is navigation, not a reason to configure every project
or bind every source to each task. Resolve relevant projects using
[project-context.md](project-context.md), retaining a separate coordination root for
concurrent deliveries needing different revisions of the same source.
Revise the agreement when discovery changes that scope, not to hide failing evidence.
Config and task context can reference original source-owned files with
`{ "source": "service", "path": "docs/design.md" }`; omit `source` for workspace-local
files. Do not duplicate source-owned designs into the coordination directory.

CLI agreements live at `clinx/tasks/<id>/contract.json`; reference existing requirement
and design files wherever they are maintained. Config `context` is navigation, selected
by focus and, for source-owned entries, task source scope. Task `context` binds file
bytes; workspace-local paths are relative to `--root`, not the task directory. Keep
generated records and append-only validation notes out of input selectors/design
references unless their content is deliberately part of the acceptance input.

`clinx inspect` is optional, bounded static navigation. It supports a limited set
of manifests and declared checks; candidates remain untrusted and readiness-unchecked.
Unsupported discovery does not block normal investigation or execution.

## Record and verify

- `clinx task add --file CONTRACT.json --json` validates and persists the actual agreement.
  A structurally valid agreement can still omit required behavior.
  For continuity alone, omit `defaultClaim`, `claims` and `obligations` together.
  Add all three through `task revise` before verification is needed.
  All `--file` commands also accept `-` for piped JSON (8 MiB maximum); never ask the
  user to prepare a technical form when you can derive the agreement from current facts.
  Reuse existing project configuration and canonical requirement/design references.
  Pipe generated input when a separate import file has no lasting value. Do not repeat
  `validate` immediately after a successful add/revise unless checking new information.
- `clinx validate ID` checks structure and references, not command readiness.
- `clinx context ID --focus build` restores the task, latest handoff and focused index.
  It also discovers bounded saved observation metadata. Inspect relevant UUIDs with
  `evidence list ID --record UUID`; metadata discovery checks neither artifacts nor
  applicability. Failed, inconclusive and conflicting observations need reconciliation,
  even when a newer local check passes; truncated or damaged history is not empty history.
  Use it on a real handoff or relevant change, not after every tool call.
- `clinx verify ID` previews checks, source selections and obligations.
  Review argv, invoked scripts, target and authority. `clinx verify ID --run` executes
  with inherited environment and OS permissions; it is not a sandbox. Declared
  external effects also require `--allow-external` and real task-specific authority.
  Choose the claim needed for this action; do not run the same checks for multiple
  claim labels just to demonstrate commands. Preview is useful for reviewing an unknown
  plan, not an additional human approval step for every already-reviewed invocation.
- `clinx reconcile ID --receipt .clinx/runs/RUN/receipt.json` interprets a prior run
  against current declared bindings without executing it again.
- `clinx task checkpoint ID --file NOTE.json` preserves a useful handoff.
  An authorized revision uses `task revise ID --file CONTRACT.json --reason TEXT`.

Use focused, completing check commands. File JUnit paths are literal and relative to
check cwd, must be fresh for the run, and have no glob expansion. Stdout JUnit must
contain XML only. Expected IDs are `classname#name` (suite name is the fallback).
Skipped cases, missing expectations and unsupported reports remain unresolved.
Exit-code checks infer no tests or business assertion.

JUnit is optional. Keep native test/device/trace formats when they serve the task;
read them using the existing tools. With exit-code checks, inspect actual selection,
skips and failure semantics yourself. Missing parser support is not a reason to switch
frameworks, synthesize passing XML or stop otherwise available verification.

Use existing contract fields rather than a new decision registry: `decisions[].basis`
can name the authoritative source and distinguish a confirmed constraint from an
assumption; `invariants` hold relevant bounds; `context` binds detailed local design.
Map unresolved protocol or final-consumer acceptance to an `external` obligation for
the affected claim. Do not certify it with a passing mock test; keep a narrower local
claim separate. The CLI validates these declared relations, not their semantic truth.

For a collaboration agreement, use `outcome`/`scope` for the delivery endpoint,
`authority` for allowed, held and prohibited actions, and `decisions` for the chosen
working arrangement and actual decision sources. Reference a maintained local agreement
with `context` when useful; its bytes participate in the task binding. These are
declarations interpreted by the agent, not an enforced approval policy. `mode` remains
the work type; there is no autonomy flag, approval command or trusted approver registry.
An `external` obligation remains unresolved even after attaching a manual pass record;
the existing platform owns any enforceable approval. See [collaboration.md](collaboration.md).

## Keep observations distinct from approval

`clinx evidence attach ID --file JSON` preserves reviewed local artifacts;
`clinx evidence list ID [--record UUID]` checks their bytes and capture-time local
bindings, not remote state. Neither satisfies an external obligation. The input
contains `obligations`, UTC `observedAt`, `observer`, `method` (manual/tool),
`target` (identity/revision), `outcome` (pass/fail/inconclusive), `summary`,
`artifacts` (optional source, path, description) and optional `limitations`. Paths
are relative to the named task source, or the workspace if no source is given.
Artifacts are copied once with their qualified origin; source removal does not erase
the archived observation. Source selection is not permission. Redact secrets first.
Limits: 8 nonempty regular files, 8 MiB each and 16 MiB total.

Review relevant failures and gaps alongside local verdicts. Do not manufacture JUnit
from a prose assertion or let a newer attachment hide an earlier failure.
`verdict.checks` names the check, actual result, reason and saved log paths.
An evidence-storage error retains known execution facts; `unknown` means the CLI
could not establish execution state. Reconcile effects before retrying writes.

Exit codes: 0 valid/preview/supported, 1 failed claim, 2 unresolved claim, 3 error.
Read the response type: a successful context/preview is not a verified claim.
`current` means declared local bindings match, not that dependencies, toolchains,
credentials or remote targets are unchanged. Hashes are not attestations.
Bindings include the task/reference bytes, task-related sources and relevant check
definitions. Navigation alone and unrelated sources do not stale an explicitly scoped
task; a config explicitly included as source input still binds its full bytes.
A stale receipt cannot contribute current passing checks, and receipts are not merged.
Product version and reader runtime are not evidence identity; unsupported evidence
protocols remain unknown. Check environment requirements through actual project tools.
Receipts save their source selectors and checks together. Current configuration drift
changes applicability, not the meaning of an intact historical observation; damaged
saved definitions cannot establish either a historical pass or a current claim.

In the final handoff distinguish the requested outcome, actual native observations
and CLI aggregation. If you directly verified a current target outside the runner,
explain the observed behavior and its evidence even if the external obligation stays
`unresolved` in the CLI. That is a parser/trust boundary, not evidence that the target
was never checked. It is also not permission to dismiss a failure, unknown target or
pending approval. Complete available required observations; do not stop just because
the CLI cannot aggregate them or manufacture a pass to make its status green.
