# Make consequential designs reviewable

Use this reference when a change makes consequential choices about shared behavior,
state, compatibility, security, capacity or recovery, or when a design review is
requested. A large repository, multiple files or multiple services alone does not
establish that a new design decision or approval is needed.

## Choose the question that could change the design

| Current uncertainty                            | Start with                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Shared rule, protocol or consumer meaning      | [Affected behavior](#establish-the-affected-behavior): candidate references, current owners and consumer semantics |
| Guard placement or alternate entry             | [Receiver and projections](#trace-the-receiver-and-projections): first effect and reachable bypass                 |
| Lost response, retry or permission change      | [Recovery and authority](#establish-recovery-and-authority): provider guarantees and outstanding obligations       |
| Competing actors or required eventual progress | [State properties](#challenge-state-properties): shared enforcement, transitions and failure assumptions           |

Choose the lowest-cost available evidence that distinguishes plausible explanations;
expand the scope if it reveals a missing owner or path. The routes are not an exhaustive
risk classification. [Stop at the evidenced boundary](#stop-at-the-evidenced-boundary);
an explicit blocker permits handoff, not a claim that the blocked behavior is verified.

## Retain the decision, not a document set

Before implementing consequential choices, retain a concise design in the existing
reviewable home: an RFC, issue, PR or task document. Existing approved designs can
already cover the change. Preserve the original requirement and relevant version;
link it and capture necessary clarifications instead of maintaining another PRD.
For bounded work within settled constraints, the existing request and tests may suffice.

Separate information when its reader, owner or update cadence differs:

- Put a substantial investigation in a source-qualified snapshot; otherwise use a
  current-state section in the design. Distinguish observations, inferences and unknowns.
- Keep the proposed design and reasons distinguishable from execution progress. They
  can share a versioned document when the reviewed baseline remains recoverable.
- Retain milestones and dependencies when coordination or resumption needs them.
  Use one current progress record: the existing plan, handoff or optional CLI checkpoint.
  Do not require the CLI merely to avoid creating `progress.md`.
- Separate operational instructions when targets, operators or release timing differ
  from design review. A maintained runbook with change-specific parameters may suffice.

File names and directories are local conventions. Do not create empty companion files,
an artifact graph or a new workspace layout to satisfy this reference. Split a long
program into independently reviewable slices with shared constraints and dependencies.

## Establish the affected behavior

For changed shared semantics, retain a compact impact record inside the existing design.
Derive it from the rules, data kinds, persisted states, events and client contracts that
will change meaning. Start with their current symbols or schema fields, not only the
new feature's words. Use [code-intelligence.md](code-intelligence.md) to choose a suitable
available source, language or relationship tool and establish its coverage.

| Record                    | Evidence needed                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Changed meaning and owner | Current symbol/protocol, original rule, proposed difference and authority                                |
| Affected paths            | Incoming entry paths, writers, readers and material next-hop consumers, with source anchors              |
| Representations           | Equivalent encodings, adapters and normalization points that can express or discard the changed meaning  |
| Required treatment        | What changes, what must retain its old behavior, and an observation that can detect a regression         |
| Unresolved boundary       | Uninspected candidates, missing owners, tool limits or external contracts, and the dependent action held |

For a broad shared change, collect candidate references before selecting the edit list.
Retain the search scope and unresolved candidate groups beside the impact record, so
the proposal does not define its own investigation boundary. Group candidates by their
actual behavior after reading them; a checked main handler does not cover an earlier
cache/converter, another entry or a later asynchronous reader. Keep this working
inventory in the existing investigation, not a mandatory additional document.

Build and cross-check the record from three perspectives:

- **Requested journey:** trace the actor's eligibility and participation through the
  trigger, work and final observable result. Check constraints before the main write
  or effect as well as the final presentation.
- **Shared meaning:** trace changed symbols and protocols back to existing callers
  and forward to readers, including unchanged consumers and in-service versions.
  When one behavior has multiple encodings, enumerate the writers, adapters and
  normalization points for each representation; checking only the new or most obvious
  discriminator leaves equivalent paths open.
- **State and effects:** identify each affected resource and its owner, then follow
  its creation, updates, activation, completion/cancellation and recovery as applicable.
  Check the durable handoff between owners; one resource's terminal state need not
  finish another resource or an outstanding external effect.

An index edge discovers a candidate; source, protocol or runtime evidence establishes
its meaning. Compare the resulting groups with the proposed change and validation
scope. Material groups without a treatment remain open; do not silently drop them
when turning investigation into a concise design.

### Trace the receiver and projections

For a consequential effect, reverse-trace its enforcing receiver to alternate entry
paths, including applicable retries, scheduled recovery and older callers. Check where
the guard runs relative to the first side effect; a new entry's validation does not
protect another caller of the same receiver. For changed read semantics, trace each
material projection or adapter back to its authoritative state. Group paths only when
source or contract evidence supports the same treatment, and retain exceptions.
Use the existing impact record; no additional matrix or fixed fields are required.

### Establish recovery and authority

When permissions change, distinguish actions whose authority differs, such as creating
new work and managing existing obligations. An unavailable permission response cannot
grant new authority; inspect the existing policy for continued reads and recovery.
For uncertain external writes, use the provider's verified idempotent replay or result
reconciliation contract. Record how an outstanding obligation remains recoverable after
a worker stops retrying. Do not require a new operation ledger when an existing owner
already provides that guarantee.

### Challenge state properties

For a hard invariant such as mutual exclusion, at-most-once effect or mandatory
authorization, identify the authority and serialization point shared by every competing
actor. Define acquisition/commit/release or equivalent transitions, failure and timeout
semantics, recovery after interruption, and an observation that can reject the invariant.
A preflight query followed by a separate write is not enforcement; when no shared
authority exists, hold the dependent effect and name the owner or decision needed.

### Stop at the evidenced boundary

The investigation is sufficient for a proposed slice when its required behaviors and
material candidate paths have an evidenced treatment or an explicit held boundary.
An unsearched area is unknown, not “unchanged”; naming repositories, matching keywords,
or adding a generic “check consumers” item does not establish coverage. Resolve available, decision-changing checks before acting on their premises. Keep
unavailable evidence tied to the dependent action; continue unaffected authorized work.
Do not expand into unrelated systems once the decision is supported.

## Give reviewers the choices that matter

Lead with the proposed change, affected owners and the decisions needing attention.

Carry material numeric limits, defaults and exceptional transitions from the original
requirement into the proposed contract and validation cases. A blanket “per PRD” reference
does not give implementers a testable rule. Keep contradictory or absent values open
rather than filling them by inference.

For each consequential choice, retain enough to judge:

- **Intent and basis:** required outcome, non-goals, independently observable acceptance,
  relevant current flow and source anchors; identify important uncovered consumers.
- **Choice and reason:** proposed rule/state/contract owner, meaningful alternative,
  tradeoff and assumptions that would invalidate the choice. Routine class names and
  coding order need not be fixed in advance.
- **Consequences:** affected interfaces and persisted state, old/new consumer behavior,
  relevant concurrency, security, failure/recovery and capacity limits. Address what
  changes or materially constrains this proposal, not every topic in a universal template.
- **Validation and operation:** observations that can reject the design, integration
  limits, migration/coexistence strategy and feasible recovery. Establish operational
  feasibility before committing to a design; exact release actions can be prepared later.

Distinguish blocking unknowns from safely deferred details, identifying the dependent
action and how to resolve each material gap. A design can expose open questions without
authorizing work that depends on their answers. Do not invent limits to fill a section.

For a design that changes shared eligibility, a durable external effect, an asynchronous
handoff or an existing client contract, arrange an independent source-backed challenge
when the host and task permit one. Give the reviewer the requirement, current sources
and proposal, not the author's expected answer. Allocate review scope across the three
perspectives above; a review of the main effect and its UI alone leaves the early journey
and intermediate resources unchecked. Have the reviewer challenge the candidate scope
from current sources as well as inspect the proposal's chosen paths. Ask for concrete
counterexamples and source anchors, including declared limits. Tie findings to the
impact record and reviewed revision. Reconcile each material finding in the proposal
or leave it as a clearly held decision; reviewer agreement alone does not verify the
external system.

## Keep the reviewed baseline identifiable

Follow the existing user agreement and project review policy; use
[collaboration.md](collaboration.md) for authority. A reviewable design is not itself
an approval, nor a reason to request approval again for already authorized work.
When human confirmation is required, bind the actual decision source to the reviewed
revision and its scope/conditions. A mutable URL, local digest or `approved: true`
does not establish effective authorization. Preserve the reviewed content through
the existing version/review system rather than silently overwriting its history.

A changed rule/state owner, shared contract, consistency/security boundary, recovery
guarantee, migration strategy or material capacity assumption can invalidate a reviewed
choice. Compare the semantic change with the actual agreement. Update the proposal and
obtain the required decision before its dependent action; continue unaffected authorized
work. Reordering milestones or changing private helpers within the agreement does not
by itself require another design approval.

Planning instructions and a separate invocation are not access controls. Where enforced
separation is required, use the host's existing permissions and review/release controls:
allow proposal artifacts where appropriate while restricting the held source or target
writes. A filesystem restriction alone does not restrict remote operations. clinx does
not configure or attest these boundaries.

## Verify conformance and preserve the right history

Before handoff, compare the actual diff and observed behavior with the original
acceptance and effective reviewed decisions. For a material deviation, identify its
basis, decision source and affected validation; do not rewrite the design to make the
implementation appear compliant. Conformance to an incorrect design is not correctness.
Use the existing PR or handoff to report conformance, accepted changes and unresolved gaps.

For operational work, identify targets, prerequisites, staged exposure, observable
success/stop conditions and who can act. Check mixed-version compatibility and separate
code/configuration rollback from recovery of written data, emitted events or external
effects. State irreversible steps and available forward recovery; do not promise a
rollback or invent thresholds the system cannot support. Release authority remains separate.

After the task, retain the design and investigation as versioned history. Promote only
useful, rechecked findings to their actual owner; follow [knowledge.md](knowledge.md).
