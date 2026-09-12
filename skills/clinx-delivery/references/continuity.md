# Resume, revise and learn

## Resume

Identify the requested task explicitly. If multiple tasks plausibly match, show
their titles and ask which one; do not guess by recency. With the CLI, use
`clinx task list`, then `clinx context ID`. Without it, read the task's latest handoff,
contract, relevant source and current working-tree changes.

Reconstruct: intended outcome, settled boundaries, facts already checked, changed
files, last useful observation, pending blockers, and the next safe action. Inspect
whether another process is still working before repeating a command. A checkpoint
does not record process liveness. Do not replay a deployment or write merely because
the old note says "next: deploy".

If CLI continuity says `reconcile-required`, inspect the listed changes before
trusting prior conclusions. `inputs-match` only compares declared local inputs;
remote services, credentials, dependencies outside the scope and undocumented
user decisions may have changed. Recheck what matters to the next action.

Inspect per-task `issues` in CLI listings. A damaged newest checkpoint leaves
`context` at `reconcile-required` with no selected note; it does not silently reuse
an older one. Preserve the damaged file, reconstruct current facts from the contract,
source and original observations, then save an explicit new handoff if useful.
Its sequence advances past the damaged entry. Unavailable source roots leave current
bindings unknown without hiding history; restore access before capturing new bindings. Do not infer approval or completion
from recovery, and do not let one task's damaged record block unrelated work.

If the task retained external observations, inspect `evidence list ID` and the cited
artifacts before reuse. Capture-time matches do not prove the observed target ran
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
CLI binding covers the entire configuration, task and declared sources: it does not
prove which old checks are unaffected or merge separate receipts. Preserve useful
code; obtain new evidence for the selected claim when its receipt is stale.

Do not delete useful history or reset unrelated user changes. The current contract
is authoritative for the next work, not an old generated plan.

## Checkpoint

Save when a handoff, interruption or meaningful milestone makes it useful, not
after every tool call. The note contains focus (`discover`, `contract`, `build`,
`verify`, `learn`), state (`active`, `blocked`, `handoff`), summary, next safe action
and concrete blockers. None of these states declares completion.

Example note:

```json
{
  "focus": "verify",
  "state": "active",
  "summary": "The shared rule has been updated and focused assertions pass; the affected consumer is not yet checked.",
  "next": "Inspect the actual consumer and run the relevant integration checks.",
  "blockers": []
}
```

## Knowledge delta

Keep a stable map small: capability, entry path, semantic owner, relevant test and
source reference. Update it only for a real change or correction. A map with no
source verification is a hypothesis. Avoid generating a complete class catalog.

Promote an incident into a regression test when possible. A repeatable enterprise
procedure belongs in the private project guide, not the public Skill. A one-task
decision stays in the contract or revision history. No new stable learning is an
acceptable outcome; retain only guidance that will support a future decision.
