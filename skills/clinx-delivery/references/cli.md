# Optional CLI support

Use a reviewed local binary or checkout, not an unverified package fetched by name.
The CLI records engineering work; the agent still makes decisions and uses existing
tools. `--root` selects the project; `--file` is relative to the caller's working
directory. Other recorded paths are project-relative unless specified.

## Adopt only the support needed

`clinx init --root PROJECT --agent codex` previews Skill and entry files; `--apply`
writes without overwriting conflicts. Generic mode uses `clinx/skills/clinx-delivery`.
Read `clinx/agent-entry.md`; existing host instructions are not edited. No project
configuration, map, guide or task is generated. Their optional templates remain
available in the clinx checkout; create useful content only after discovering facts.

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

`clinx inspect` is optional, bounded static navigation. It supports a limited set
of manifests and declared checks; candidates remain untrusted and readiness-unchecked.
Unsupported discovery does not block normal investigation or execution.

## Record and verify

- `clinx task add --file CONTRACT.json` validates and persists the actual agreement.
  A structurally valid agreement can still omit required behavior.
- `clinx validate ID` checks structure and references, not command readiness.
- `clinx context ID --focus build` restores the task, latest handoff and focused index.
- `clinx verify ID` previews checks, source selections and obligations.
  Review argv, invoked scripts, target and authority. `clinx verify ID --run` executes
  with inherited environment and OS permissions; it is not a sandbox. Declared
  external effects also require `--allow-external` and real task-specific authority.
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
`artifacts` (path/description) and optional `limitations`. Redact secrets first.
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
Bindings include the whole configuration, task and all declared sources. A stale
receipt cannot contribute current passing checks, and separate receipts are not merged.

In the final handoff distinguish the requested outcome, actual native observations
and CLI aggregation. If you directly verified a current target outside the runner,
explain the observed behavior and its evidence even if the external obligation stays
`unresolved` in the CLI. That is a parser/trust boundary, not evidence that the target
was never checked. It is also not permission to dismiss a failure, unknown target or
pending approval. Complete available required observations; do not stop just because
the CLI cannot aggregate them or manufacture a pass to make its status green.
