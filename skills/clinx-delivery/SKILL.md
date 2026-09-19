---
name: clinx-delivery
description: 'Deliver or resume a software change from a requirement and new or existing projects. Use for clinx requests, cross-boundary features and consequential delivery work. Supports scoped design, diagnosis and review as well as implementation.'
license: MIT
---

# clinx delivery

Turn the requested outcome into observable behavior using existing project tools.
Follow **Discover → Contract → Build → Verify → Learn** as a feedback loop.
The method is language-, domain- and platform-independent; the CLI is optional.
Cover the boundaries the outcome requires, not a mandatory UI/API/database stack.

## Establish scope and choose references

Preserve the requested mode and authority. Review or diagnosis does not authorize
implementation; verification does not authorize publication. Keep desired behavior,
current system facts and authorized decisions distinct. Resolve contradictions
rather than changing the request to fit the code.

Separate the delivery endpoint from confirmation points. Honor a requested pause
before implementation; silence and passing checks are not consent. Keep one primary
agent responsible for the outcome and cross-project agreement. Delegate only when
the host and user permit it and the work has an independent, useful boundary.

For sustained investigation or work that must survive a confirmation pause or handoff,
save the first useful findings in the coordinating workspace and update them as the
scope changes. Reuse an existing task note; one document can hold the outcome,
authority, source anchors, supported findings, unresolved decisions and next action.
Before requesting design approval, make the proposed choices and their evidence
reviewable there. Mark drafts as drafts; approval is not a prerequisite for writing
a proposal. A note does not require CLI configuration or a directory migration.
Use the CLI only when its continuity or repeatable evidence adds value.

Before choosing an investigation route, read the normal workspace entry and its relevant
project/tool bindings. Applicable instructions may link a README or knowledge guide;
follow those links instead of assuming the tools visible in the prompt are all that
exist. Check only bindings relevant to the task, including their coverage and freshness.

Read the reference that applies to the next action:

| Situation                                                                 | Reference                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| PRD and unfamiliar or empty projects                                      | [cold-start.md](references/cold-start.md)               |
| Material semantics, architecture, scale, failure boundaries or review     | [delivery.md](references/delivery.md)                   |
| Preparing a consequential design review or checking design conformance    | [design-review.md](references/design-review.md)         |
| Running, debugging or observing the real consumer                         | [runtime.md](references/runtime.md)                     |
| Requested checkpoints, shared effects, changed authority or contributors  | [collaboration.md](references/collaboration.md)         |
| Naming, resuming, revising or retaining a task                            | [continuity.md](references/continuity.md)               |
| Workspace ownership, project knowledge, shared Skills, tools or workflows | [integration.md](references/integration.md)             |
| Reusable findings, stale guidance, knowledge retrieval or correction      | [knowledge.md](references/knowledge.md)                 |
| Shared-rule consumers, transitive impact or navigation tool selection     | [code-intelligence.md](references/code-intelligence.md) |
| Using the optional CLI                                                    | [cli.md](references/cli.md)                             |
| Known background, omitted locations, ambiguous or relocated projects      | [project-context.md](references/project-context.md)     |

For small reversible work, use normal tools and a conversational agreement.
Persist only when ambiguity, coordination, duration or future reuse warrants it.
Discover missing engineering facts yourself; do not require the user to prepare maps or JSON.

## Keep the user's path short

Accept the requirement and any stated constraints in normal language. Resolve omitted
project locations from the current task, normal knowledge entry and local bindings;
request an anchor only when it is missing or materially ambiguous.
Do not require a workflow preset, task ID, directory layout or a repeated instruction
template. Reuse an available Skill and project guidance; do not initialize, reinstall,
survey the whole workspace or run setup diagnostics as a ritual for every request.
Start small tasks with native tools. Add records only for a concrete continuity,
coordination or evidence need, preparing technical fields yourself from checked facts.
Reuse applicable commands and findings; recheck changed or consequential premises.
Present material choices, blockers and usable results, not internal phase transitions
or JSON bookkeeping. Preserve inspectable evidence and never hide a risk to shorten a reply.

## Drive the delivery loop

For sustained optimization, use the host's existing goal or execution mechanism.
When a real task is the evaluation case, tie further investigation to a workflow
failure or decision it can change. Distinguish a missing mechanism, failure to follow
existing guidance, and an unknown business fact; they need different remedies.
Use enough of the real flow to test the mechanism; unresolved case details do not
by themselves require more investigation or more rules. Retain useful discoveries.
Keep the question, distinguishing evidence and next action in the existing task note;
[continuity.md](references/continuity.md) covers resumption. Continue while a valuable
check or repair remains within the agreed outcome. Record remaining limits when
converging; passing checks or exhausting one case does not prove universal superiority.

1. **Discover:** Trace relevant inputs through rule/state owners to effects and consumers.
   Verify material facts in current sources. Classify each capability as reuse, extend,
   compose, new or unknown; check semantic and operational compatibility. Inspect the
   nearest existing alternative before adding consequential shared logic. Separate
   modification scope from verification scope. For changed shared semantics, retain
   the affected entry paths, equivalent representations and readers in the design using
   [design-review.md](references/design-review.md); a list of repositories is insufficient.
   Before choosing the edit list, run an impact/reference query through an applicable
   verified project binding when one is already available at low incremental cost;
   otherwise build the same candidate inventory from native search and source. Follow
   [code-intelligence.md](references/code-intelligence.md) and keep uncovered edges open.
2. **Contract:** Establish outcome, scope, owners, interface meaning, invariants,
   observable acceptance and authority. Resolve held decisions before their actions;
   keep routine implementation choices open. For a hard cross-owner invariant, identify
   the shared enforcement authority and fail/timeout behavior or hold the dependent
   effect. A self-written test does not turn an assumption into an authoritative constraint.
3. **Build:** Run the smallest complete slice early, observe, diagnose and repair.
   Choose the lowest-cost observation that distinguishes the current uncertainty.
   Probe a design-critical integration early, then expand within the agreement.
4. **Verify:** Compare actual results with the original requirement and latest decisions.
   Exercise relevant negative cases and affected consumers. Review top-level choices
   before local structure. Exit zero or agreement among agents does not establish
   unobserved behavior. Recheck affected acceptance after the final relevant change.
5. **Learn:** Correct useful maps and procedures at their existing owners. Put
   repeatable failures in regression tests or improve an existing tool. Retain task
   decisions for continuity; do not create a report when there is no useful new knowledge.
   Follow the shared knowledge rules for provenance, retrieval and correction. Independent
   knowledge work can use clinx-knowledge; this Skill includes the same rules and does
   not require that other Skill to be installed.

When evidence contradicts the design, revise the affected premise and preserve
unaffected work. Repeated failure needs a distinguishing diagnostic hypothesis.
Continue necessary, authorized work while it remains available. Ask at agreed
confirmation points or for a material missing decision, access, resource or authority;
while waiting, continue only independent authorized work.

## Deliver the agreed result

Report the outcome, acceptance-by-acceptance observations, actual change scope,
material deviations and remaining gaps with useful links. For runnable work include
use/run/stop and necessary data or identity setup. Use the existing handoff format.

Distinguish implemented, locally verified, integration verified, release ready and
released/observed. Saved continuity is not completion; release readiness is not authority.
Report native-tool observations separately from CLI aggregation: an external condition
the CLI cannot aggregate may have been observed, but failures and pending decisions
remain gaps. Complete available verification without manufacturing a passing verdict.
