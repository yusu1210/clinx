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

Read the reference that applies to the next action:

| Situation                                                                 | Reference                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| PRD and unfamiliar or empty projects                                      | [cold-start.md](references/cold-start.md)       |
| Material semantics, architecture, scale, failure boundaries or review     | [delivery.md](references/delivery.md)           |
| Running, debugging or observing the real consumer                         | [runtime.md](references/runtime.md)             |
| Requested checkpoints, shared effects, changed authority or contributors  | [collaboration.md](references/collaboration.md) |
| Resuming, revising or retaining knowledge                                 | [continuity.md](references/continuity.md)       |
| Workspace ownership, project knowledge, shared Skills, tools or workflows | [integration.md](references/integration.md)     |
| Using the optional CLI                                                    | [cli.md](references/cli.md)                     |

For small reversible work, use normal tools and a conversational agreement.
Persist only when ambiguity, coordination, duration or future reuse warrants it.
Discover missing engineering facts yourself; do not require the user to prepare maps or JSON.

## Drive the delivery loop

1. **Discover:** Trace relevant inputs through rule/state owners to effects and consumers.
   Verify material facts in current sources. Classify each capability as reuse, extend,
   compose, new or unknown; check semantic and operational compatibility. Inspect the
   nearest existing alternative before adding consequential shared logic. Separate
   modification scope from verification scope.
2. **Contract:** Establish outcome, scope, owners, interface meaning, invariants,
   observable acceptance and authority. Resolve held decisions before their actions;
   keep routine implementation choices open. A self-written test does not turn an
   assumption into an authoritative constraint.
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
