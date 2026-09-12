# Coordinate delivery within agreed authority

Use this reference when a task requests confirmation, has a consequential shared or
production effect, changes its authority, resumes a pending decision or involves
separate contributors. It guides
the host agent; clinx does not implement an approval service or enforce platform access.

## One outcome owner; delegate only separable work

Keep one primary agent responsible for the current agreement, integration and final
acceptance, including tasks that span repositories. Respect existing human/team
ownership; coordinating a task does not transfer authority over their decisions.
Repository boundaries alone are not a reason to split the work among agents.

When the host and user permit delegation, use it for independently bounded work
such as a separate investigation, non-overlapping implementation or justified review.
Keep tightly dependent reasoning together. Independent review is valuable for a
concrete risk or subjective judgment, not as a required vote on every change.

Give each contributor the question or outcome, relevant original inputs and shared
agreement, permitted read/write scope, dependencies and expected evidence. Arrange
non-overlapping writes or integration through the host's existing isolation tools;
separate workspaces do not isolate shared runtime resources. Do not start duplicate
work that the primary agent will also perform.

On return, inspect the actual changes and observations, reconcile semantic conflicts,
and verify the combined effect after integration. A contributor's "done" is not task
completion. Communicate material agreement changes to affected work before continuing;
stop or revise obsolete work. A blocked contributor cannot expand its own authority,
and the primary agent cannot bypass a held action by delegating it.

## Separate the target from the way of working

Establish the requested delivery endpoint independently of confirmation points.
Design, locally verified implementation, integration, release readiness and an
authorized release with observation are different endpoints. The task's work mode
(design, diagnosis, review or implementation) is not its degree of autonomy.

Use the user's existing choices and applicable project policy. These conversational
presets can help express a choice; they are not CLI options or sequential workflows:

| Preset                   | Agent proceeds within                             | Confirmation needed for                                              |
| ------------------------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| Autonomous within scope  | Already granted scope, targets and operations     | Material unknowns, new authority or a policy-required decision       |
| Decision checkpoints     | Investigation and agreed work between checkpoints | Named decisions, such as design before implementation or a migration |
| Work-package checkpoints | The currently authorized work package             | Entering the next agreed package                                     |

For a clear, low-risk authorized change, do not ask the user to select a preset or
approve routine details. For unfamiliar changes with consequential shared effects,
investigate first and propose focused decision checkpoints before committing to a
material choice. Repository size alone does not determine risk. Missing preferences
are not permission to deploy, and an explicit confirmation requirement still applies
when the agent believes the change is easy. Users can add checkpoints; neither a
preset nor urgency lets the agent bypass mandatory policy or grant itself authority.

## Make a confirmation actionable

Name the action being held, the decision owner and why confirmation is needed.
Present the proposed choice, relevant alternative, evidence, uncertainty, affected
scope and validation/recovery consequences. Bundle related choices when one decision
can resolve them; do not submit a long report with an ambiguous "looks good?".

For the consequential action, establish the relevant approval object: a particular
design revision or change, artifact/configuration, environment and effect scope.
Identify the actual person/role or policy that can authorize it and the authentic
decision source. Include conditions, expiry or reuse bounds where they apply. A
technical reviewer need not be a release approver. Do not invent identities, sign
for someone else, or treat another agent's review as required human confirmation.

An existing policy may preauthorize a repeatable class of operations. Check that the
current action meets its conditions; do not require another click solely because an
agent executes it. A user asking to finish development has not necessarily granted
the policy owner's permission for a production operation.

## Continue only the work already authorized

If confirmation is required before implementation, do not edit product code or tests
to implement the feature while waiting. Continue permitted investigation, baseline
checks or genuinely independent work; a reversible change is not an exemption.
Prototypes or speculative branches need to be within the agreed scope too.

Once the named decision is confirmed, proceed through its authorized scope without
repeatedly asking about routine implementation details. Confirmation does not expand
the delivery endpoint: design approval is not merge, migration or release approval.
Readiness, a successful command and authority are separate facts.

Silence, timeout, an unreadable approval source or an ambiguous reply is not consent.
On rejection, stop the affected action; present a revised alternative only within
scope. Do not keep retrying the same request or perform the action to unblock yourself.
If no useful permitted work remains, save the exact pending decision and hand off.

## Recheck after changes and on resume

Before relying on a previous decision, check its source, scope, conditions and whether
it is still effective. Revocation, expiry, a different target/artifact, or a material
change to approved semantics, risk or recovery can require new confirmation under
the applicable policy. Do not reuse a design approval for a later release artifact.
Routine implementation within an approved design does not require a new design
approval merely because files changed; artifact-specific release approval is narrower.

Inspect the affected dependency, preserve unrelated valid work, and ask only for the
decision that changed. A matching local hash cannot establish a current remote approval;
a changed hash flags local drift but does not interpret whether a human decision is
still valid. Reconstruct pending, rejected and conditional decisions from their sources,
not a checkpoint's suggestion to continue. See [continuity.md](continuity.md).

## Use the existing authority system

Keep one current agreement in the conversation or existing task/design record; persist
it when coordination or resumption benefits. Reference real platform approvals rather
than maintaining a competing ledger. Verify the effective platform result and target
before the action; an unavailable or unknown required result leaves the action blocked.
Credentials, a command's availability and `--allow-external` are not approvals.

Use existing code-review, identity and deployment controls for enforcement. Apply any
separation-of-duties requirement there; never self-approve or bypass it through another
tool. clinx's local declarations and attachments are not trusted authorization records.
For optional task fields and their limits, see [cli.md](cli.md).
