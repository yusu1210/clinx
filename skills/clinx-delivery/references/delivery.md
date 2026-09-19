# Design and review a complete slice

## Establish the semantic boundary

Trace the actual input, rule/state owner, effect and consumers. Search tools, maps
and graphs locate facts; verify material links against current implementation and
tests. Distinguish observations, documented intentions and hypotheses.

Evaluate reuse, extension, composition and new implementation by meaning, ownership,
authorization, inputs/outputs, failure behavior and operational cost. An available
capability may only need wiring; an incompatible one should not be reused at all costs.
Before adding consequential shared logic, inspect relevant call sites and the nearest
existing utility, SDK or procedure, including its actual limits and error contract.
Record a source-backed fit or mismatch in the existing decision record; do not require
an exhaustive inventory or reuse an incompatible capability merely because it exists.
Inspect alternate paths that can violate this task's invariants, such as cached/direct
reads or synchronous/background writes. An unchanged consumer may still need testing.

When changing a shared predicate, data kind or producer contract, use
[code-intelligence.md](code-intelligence.md) before declaring the impact understood.
Enumerate callers/readers with a suitable available graph, language tool or bounded
source search; then verify material semantics in source. Retain consumer, consequence
and verification gap in the existing design. A reviewed main path or a known repository
list does not establish coverage of alternate entries. Tool use itself is not coverage.

For a genuinely new capability, establish the actors, allowed actions, observable
effects, failure behavior and relevant quality constraints. Use the project's existing
stack and constraints; an empty repository does not imply a new platform. Ask about
material product choices, choose routine details within scope, and avoid speculative
components. Exercise an uncertain dependency early if it could invalidate the design.

## Choose agreement depth from the changed meaning

| Change                                               | Establish before the dependent action                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Local, reversible, within one owner's settled rules  | Outcome, scope, authority and observable acceptance; the conversation or existing request may suffice                                 |
| Shared meaning or consumer compatibility changes     | Current-to-desired behavior, owners, material consumers, compatibility and acceptance in an existing reviewable home                  |
| Consequential state, concurrency or external effects | Relevant pre/postconditions, safety and progress properties, effect boundary, failure/recovery semantics and a falsifying observation |

Use existing contracts when they already settle these questions. Depth follows the
actual semantic change, uncertainty and consequence, not domain keywords, file count
or repository count. These are investigation choices, not stages or required files.
For progress guarantees, identify the dependency/fairness assumptions and what happens
when they fail; a finite test cannot prove unbounded eventual completion.
Freeze enough meaning to act, not every file and algorithm. Retain non-goals and material
unknowns; reference existing reasoning rather than creating a second specification owner.
Use [design-review.md](design-review.md) for consequential choices and final conformance.
For a multi-part requirement, retain concise, independently testable outcomes while
investigating, including consumers outside the main execution path. Group routine
changes without losing explicit behaviors or exceptions. Keep defaults distinct from
bounds and unspecified values. Before confirmation, reconcile the proposed scope and
verification with these outcomes and the original input; make omissions, deferred
work and missing owners explicit. Reuse the task note rather than adding a template.
Use those same outcomes through implementation and handoff: link each material one to
its owning rule, affected consumer and planned observation; replace the plan with actual
results as work proceeds. An outcome without suitable evidence stays open even when
all selected checks pass. Do not derive the acceptance inventory only from the diff.
When confirmation is required, resolve the named decision before its held action;
use [collaboration.md](collaboration.md). Technical agreement does not authorize a
different delivery endpoint or bypass project approval rules.

For sustained improvement, let the host own execution and budgets. Keep the question
under test, distinguishing evidence and next action in the existing task note.
Continue useful authorized work; stop at the actual confirmation or access boundary.
A repaired issue or saved note does not establish completion of the wider task.
Recheck affected acceptance after changes. No additional loop schema or CLI setup is
needed; see [continuity.md](continuity.md) for resumption.

## Resolve assumptions that can change the outcome

Use the relevant questions below; they are not a checklist for every change.
For a material choice, record its owner, exact meaning, a possible counterexample,
and the consequence of leaving it unresolved. A chosen default is not an approved
product constraint.

- **A value crosses a boundary:** Identify the field and layer, type, units, precision,
  omission/reset behavior, authority, and consumer version. Compare an actual encoded
  request with its receiving effect; absent, null, empty, and zero may mean different
  things. Where conversion loses information, test the resulting decision at the
  boundary; rounding must not silently change eligibility, ordering or value.
- **Work grows with data or concurrency:** Find the source of the response-time,
  freshness, capacity, or cost limit. Test a credible peak and missing or invalid
  inputs; a finite loop alone does not establish acceptable performance.
- **Work can fail, repeat, or arrive late:** Distinguish permanent rejection,
  transient failure, unknown remote outcome, and obsolete work. Test accepted
  requests with lost responses, duplicate effects, and changed order against the
  provider's actual retry and idempotency guarantees.

Trace the critical transformation all the way to its consumer. Do not repair a value
only in a mock or assume a downstream wrapper supplies an unobserved conversion.
For a generated or persisted result, check the producer-to-reader round trip at
credible size and interruption boundaries. Successful writing is insufficient if
the reader drops part of the result or cannot read it. Keep summaries as projections
of retained evidence, not replacements for unexamined records.
If capacity and response budgets cannot both hold, expose the conflict and choose an
authorized reuse, batching, admission or degradation policy; neither unbounded waiting
nor silently capping a delay resolves both. Estimates are not measurements or hard limits.

Permanent failures need a declared rejection/quarantine path, not blind retry; transient
failures need bounded attempts/backoff appropriate to the existing provider. For an
unknown write outcome, use provider status/read-back or its supported same-operation
replay protocol, not a new independent write. A key only helps if the receiver enforces
its scope and lifetime. State the consequence of late or obsolete work.
Do not invent a universal attempt count, latency value, queue or consistency guarantee.

Unresolved meaning may still allow reversible local work. Keep the affected acceptance
unresolved and ask the smallest material question; do not turn an assumption into fact
by asserting it in a test or writing it into a contract.

## Reach a real effect early

Choose a slice that crosses the boundaries required by the outcome. A scaffold with
all integration deferred is not a working slice. Deepen it using real feedback.

Apply relevant constraints, not a compulsory product checklist:

- For interactive output, check meaningful states, validation and actual interaction.
- For persisted effects, verify read-back and the promised lifetime, not only a UI signal.
- For protected actions, check the authoritative boundary, not only hidden controls.
- For retries/concurrent changes, check duplication and transition rules where applicable.
- For an API/library/data output, verify its actual consumer; do not invent a UI.

Mocks can unblock work but do not establish the boundary they replace. A local demo
identity is not production authentication. Neither a substitute nor a passing test
silently changes the requested delivery target.

## Establish execution and feedback

Read [runtime.md](runtime.md) when starting, observing or debugging the real path.
It covers native results, consumer/version checks and recovery without requiring a
particular language, test framework or CLI. Keep relevant execution facts in the
project's existing guide; do not create a parallel platform registry.

## Match observations to acceptance

| Acceptance question                       | Relevant observation                                                | Remaining boundary                        |
| ----------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| Is a local rule preserved?                | Substantive assertions and negative cases                           | Actual integration                        |
| Does a boundary preserve meaning?         | Real request/event/call and resulting state                         | Other consumer versions                   |
| Does the final consumer behave correctly? | Actual interaction or output inspection                             | Unobserved targets                        |
| Did an authorized release work?           | Target/artifact identity, terminal result and post-release behavior | Other environments and recovery readiness |

Inspect test selection and actual assertions. Zero tests, skipped cases, an unrelated
module or unchanged old reports are not successful validation. Exit-code checks can
record command success but do not infer tests or business behavior. With JUnit, bind
actual expected case identities and a meaningful minimum passing count.

Derive acceptance from the request and owning contracts before comparing it with the
implementation. Include an observation that could reject a plausible but wrong design,
not only assertions of the chosen encoding or algorithm. For a justified new oracle,
check that it rejects a broken control and accepts a compatible one; this validates the
oracle, not agent effectiveness. Keep evaluator answers out of future raw task inputs.
Reuse independently owned QA cases and domain checks when applicable and accessible.
Inspect their requirement/version coverage and assertions; independence comes from
their source and review authority, not simply from another model producing the cases.
When a failure reveals a mistaken oracle, preserve the failure and resolve the rule
with its owner before changing expected behavior. A reduced case set is a scope change,
not a successful retry.

Keep narrow claims and explicit gaps. Local hashes are drift checks, not signatures;
neither test assertions nor acceptance mappings become correct because a CLI recorded
them. Retained external observations must not hide failures or manufacture a passing
machine verdict. For recording details, read [cli.md](cli.md).

## Review from the outcome down to the code

Use the relevant questions in this order for design or final delivery review; keep
findings in the existing review, not a new mandatory checklist file:

1. **Intent and abstraction:** Does the proposal solve the original outcome? Is a
   new concept/state justified by a real variation, or only by the chosen design?
   Would removing an unnecessary upstream concept eliminate downstream coordination?
2. **Ownership and reuse:** Who authoritatively owns the rule/state? Does a transport
   or presentation layer duplicate it? Could a compatible existing capability handle
   the gap, and is rejecting it supported by current source rather than its name?
3. **Boundaries and authority:** Do actual interfaces, failure/compatibility semantics
   and invariants match the shared agreement? Does the final diff contain unrequested
   behavior, refactoring or a held action? Code size does not determine impact.
4. **Evidence and operation:** Do assertions and real consumer observations reject
   plausible wrong implementations? Check the applicable quality constraints,
   unobserved targets and recovery of effects, not only passing local checks.
5. **Local maintainability:** Then assess domain naming, cohesion and complexity.
   Remove redundant state or compatibility without a supported requirement; retain
   what actual consumers and risks require. Fix stale guidance at its owner.

Recheck affected acceptance after the final fix. Independent review is useful when
justified, available and authorized, not a mandatory extra model call. A review finding
does not authorize its implementation when the user asked only for review.

## Hand off the agreed result

For an unfinished integration, leave an executable next step: required access/target
and artifact identity, exact action, expected consumer effect, evidence location and
stop/recovery condition. A flag may stop future work without undoing in-flight or
completed effects. Distinguish code/configuration recovery from data or effect recovery;
do not substitute a generic "test manually" or imply new deployment authority.
