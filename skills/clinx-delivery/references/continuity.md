# Name, resume, revise and learn

## Name the outcome and preserve identity

Before creating a record, resolve whether the request continues an existing outcome.
A new message, session, stage, retry or checkpoint does not itself need a new task.
Split independently acceptable outcomes when useful, linking their agreements; a
shared word or PRD alone does not establish that two requests are the same task.

Use a short human title in the user's language: object + intended outcome or specific
problem, with a meaningful qualifier when needed. For example, "Prevent duplicate
invoice submission" or "Investigate invoice submission timeouts". Name an investigation
as an investigation; do not imply an unverified root cause or a fix already delivered.
Keep status, owner, agent/model, routine phases and "final/v2" bookkeeping out of the
title. Preserve established domain terms; do not force literal translation or transliteration.

For every new persistent task, use one naming convention:
`YYYY-MM-DD-<short-topic>`, for example `2026-09-18-invoice-submit-dedup`.
The prefix is the recorded creation date in the workspace's agreed timezone, fixed
for the task's lifetime. Use recognizable lowercase ASCII kebab-case for the topic;
keep external issue keys and canonical links in the agreement or note, without
switching naming formats. Use the full dated name as both CLI ID and directory name.
Check plausible existing tasks, including case variants, before creating one. Reuse
an existing task when continuing its outcome; for a genuinely different task, add a
meaningful topic qualifier. The date alone does not guarantee uniqueness.
For recurring work, include the reviewed period in the topic when needed, for example
`2026-10-03-access-review-2026-09`; the prefix still means creation, not the review period.
Never change the date on resumption or use a movable deadline as identity. CLI records
currently have no task-level `createdAt` field; checkpoint time is not task creation time.
Keep owner, priority, due date and dependencies in the existing tracker or task note,
not in directory names. This is a naming procedure, not a new CLI validation constraint.

Keep the ID and `clinx/tasks/<id>/` stable. Existing valid IDs need no style migration.
CLI `task revise` cannot change the ID; even a title-only revision changes its task
binding, so inspect affected evidence and continuity before reuse. A host conversation
title/ID, an external issue and a Git branch are separate identities; record their
relationship where useful, without assuming a shared title selects the same task.
Follow the repository's branch policy. Without an established convention, use
`<type>/<short-description>` or `<type>/<issue-key>-<short-description>`: for example,
`fix/invoice-submit-dedup`. Choose a type for the actual change (`feat`, `fix`,
`refactor`, `docs`, `test`, `chore`); add `perf`, `build` or `ci` when useful.
Use lowercase ASCII kebab-case in the description and preserve tracker keys when an
integration requires their exact form. Keep agent/model names out of the prefix.
Check Git syntax and applicable CI/issue-linking rules independently; some integrations
require an issue number first. Reserve `release`/`hotfix` for a workflow that actually
uses those lifecycles. Let the agent derive routine names; ask only to resolve material
ambiguity.

## Resume

Resolve the requested task from the current agreement and normal entry; the user need
not repeat its ID or project paths. If multiple tasks plausibly match, show their titles
and ask which one; do not guess by recency. With the CLI, use `clinx context ID` for a
known task; use `clinx task list` only when selection needs investigation. Follow
[project-context.md](project-context.md) for missing or competing checkouts.
Without the CLI, read the task's latest handoff,
contract, relevant source and current working-tree changes.

A document-only task need not have a CLI contract. A missing-contract list diagnostic
does not distinguish deliberate non-adoption from a lost record: follow the normal
task entry and inspect expected history. Do not manufacture a contract to silence it.

Reconstruct: intended outcome, settled boundaries, facts already checked, changed
files, last useful observation, pending blockers, and the next safe action. Inspect
whether another process is still working before repeating a command. A checkpoint
does not record process liveness. Do not replay a deployment or write merely because
the old note says "next: deploy".

If CLI continuity says `reconcile-required`, inspect the listed changes before
trusting prior conclusions. `inputs-match` only compares declared local inputs;
remote services, credentials, dependencies outside the scope and undocumented
user decisions may have changed. Recheck what matters to the next action.
When investigation discovers a consequential source outside declared inputs, extend
the relevant scope before capturing another binding. Compare source anchors with
the selectors, including entry wiring and the actual rule owner; an existing input
directory can be valid while omitting the implementation under review.

Inspect per-task `issues` in CLI listings. A damaged newest checkpoint leaves
`context` at `reconcile-required` with no selected note; it does not silently reuse
an older one. Preserve the damaged file, reconstruct current facts from the contract,
source and original observations, then save an explicit new handoff if useful.
Its sequence advances past the damaged entry. Unavailable source roots leave current
bindings unknown without hiding history. Retired check/source references also keep
historical observations and handoffs readable with unknown applicability; revise the
agreement or restore access before executing or capturing new bindings.
Do not infer approval or completion from recovery, and do not let one task's damaged
record block unrelated work.

If the task retained external observations, inspect `evidence list ID` and the cited
artifacts before reuse. Saved attachments remain readable without valid configuration
or a readable current contract; unknown binding is not permission to resume.
Capture-time matches do not prove the observed target ran
those inputs. Keep failed/inconclusive observations visible; query the existing
operation before retrying an uncertain remote write.

Restore the delivery endpoint and confirmation boundaries too. Recheck the actual
decision owner/source, approved object, conditions, expiry and revocation relevant to
the next action. Local matching inputs cannot establish a current platform approval.
Follow [collaboration.md](collaboration.md) for pending or changed decisions.

## Revise

First distinguish discussion from authorization to change. Once a revision is
authorized, identify what to preserve, patch and revalidate. Update the canonical
contract and relevant referenced design. `clinx task revise` preserves the preceding
JSON contract and records a reason; it does not patch code, reset stages or execute
commands. Old evidence is retained and becomes stale when its binding differs.

If an old design path moved or a configured check was replaced, revise to the real
current reference; do not restore dummy inputs just to make the old contract valid.
The old JSON is preserved, but its referenced historical bytes are not reconstructed.
A corrupt or misidentified contract needs explicit repair, not a guessed overwrite.
CLI binding covers the task, its referenced bytes, relevant sources and check definitions.
Task scope must include unchanged dependencies and consumers. It does not infer which
old checks are unaffected or merge separate receipts. Preserve useful
code; obtain new evidence for the selected claim when its receipt is stale.

Do not delete useful history or reset unrelated user changes. Reconcile the saved
contract with the latest authorized request and decision sources before continuing;
a file being current does not make its contents authorized.

## Checkpoint

For an improvement loop, preserve the question under test, distinguishing evidence,
remaining acceptance and next action in the current task note. Resume the same
investigation after interruption; a new checkpoint does not require a new hypothesis
or iteration. Existing summary/next/blocker fields can preserve this information.
The host owns budgets and execution. Older checkpoints may retain descriptive loop
metadata; new notes use summary/next/blockers, not another lifecycle or verdict.

Save when a handoff, interruption or meaningful milestone makes it useful, not
after every tool call. The note contains focus (`discover`, `contract`, `build`,
`verify`, `learn`), state (`active`, `blocked`, `handoff`), summary, next safe action
and concrete blockers. None of these states declares completion.

For a document-only handoff, retain the latest agreed endpoint, main artifact, checked
scope, unresolved dependencies and next action in the existing task note. Link that
note from the normal workspace entry when future discovery depends on it. Reopen the
entry and follow the links; writing the artifact alone does not complete a handoff.
Repair stale pointers without reviving obsolete decisions or recreating missing history.

Example shape; replace it with the actual observed state:

```json
{
  "focus": "verify",
  "state": "active",
  "summary": "The shared rule has been updated and focused assertions pass; the affected consumer is not yet checked.",
  "next": "Inspect the actual consumer and run the relevant integration checks.",
  "blockers": []
}
```

## Retain useful knowledge

Use [knowledge.md](knowledge.md) for canonical ownership, provenance, retrieval and
correction. Prefer a regression test, existing tool or small source-backed guide over
a duplicate task narrative. A one-task decision stays in the contract or revision
history; private procedures stay private. No new stable learning is a valid outcome.
Check that the next task can find a useful finding without being given its answer path.
