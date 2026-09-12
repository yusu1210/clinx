# The clinx delivery method

[中文](method.zh-CN.md)

clinx organizes agent-led engineering around an observable outcome. It works with
new, existing and mixed capabilities, using the project's tools and constraints.
“Full-stack” means the boundaries needed to deliver that outcome; a UI, service,
database or deployment is included only when the requirement needs it.

## The delivery loop

**Discover → Contract → Build → Verify → Learn.**

| Focus    | Work                                                                    | Result needed for the next action                          |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Discover | Read the requirement; trace relevant capabilities, owners and consumers | A source-backed view of the gap and consequential unknowns |
| Contract | Agree behavior, scope, invariants, acceptance and authority             | Enough resolved meaning and permission to act              |
| Build    | Implement and run the smallest complete slice; diagnose and repair      | Observable behavior through the required boundaries        |
| Verify   | Exercise acceptance and affected consumers; review the final change     | Current results, failures and remaining gaps               |
| Learn    | Update useful procedures, references and regression tests               | Less repeated investigation on the next task               |

These are recurring concerns, not mandatory approval stages. New evidence can change
the design. A review request ends with findings unless implementation is also
authorized. If delivery includes release, Build and Verify include the authorized
release and its observed effects.

Start with the [PRD-to-delivery guide](cold-start.md). The
[Skill](../skills/clinx-delivery/SKILL.md) gives the agent an executable procedure.
The optional CLI retains agreements, observations and continuity; it does not run
the agent or choose its next action.

## Establish meaning before relying on evidence

Keep three sources distinct:

- **Intent:** the original requirement and decisions from its authorized owner.
- **Reality:** current code, contracts, runtime behavior and operational constraints.
- **Agreement:** the authorized change from current reality to the desired outcome.

Resolve discrepancies between them. An implementation, generated plan or test does
not acquire authority to redefine the requirement.

Review both semantic and execution adequacy. A test can faithfully verify the wrong
rule; a correct rule can appear verified because a command selected no tests or
reached the wrong target. The agent and responsible reviewer judge the meaning;
deterministic tools strengthen the execution evidence.

## Discover the relevant system

Trace one path from user action or external event to the final observable result.
Find rule and state owners, transport layers, consumers and the tests that cover
them. Distinguish components that need editing from unchanged consumers that still
need verification. Mark unsupported assumptions as unknown.

Use existing maps and guides as navigation to current sources. Missing documentation
is not evidence that a capability is missing. Before adding shared logic, inspect
the nearest implementation and its call sites, including permission, bounds and
failure semantics. Stop when the investigation supports the choice; an exhaustive
repository inventory is not a prerequisite.

Classify each capability as **reuse, extend, compose, new or unknown**. A new product
may reuse identity and storage; an existing service may need a new capability.
Choose by semantic compatibility, ownership, data shape, authorization and operating
cost. Incompatible reuse can be more expensive and less safe than a small new component.

## Make an actionable agreement

Record the outcome and delivery endpoint, scope, non-goals, invariants, significant
decisions, authority and acceptance-to-evidence mapping. A conversation can suffice
for small work. Use an existing design or a [task brief](../templates/project/clinx/task-brief.md)
when persistence helps; reference detailed reasoning instead of copying it.

An invariant must be falsifiable: a filtered total describes the same set as the
returned rows before pagination; client input cannot override server identity;
retrying the same operation cannot duplicate an irreversible effect. “Correct and
robust” does not identify an observation.

Resolve material product choices with their owner. Leave routine implementation
choices to the agent. If a discovery changes approved semantics or risk, obtain the
needed decision, preserve unaffected work and recheck dependent evidence.

Choose the delivery endpoint separately from confirmation frequency. “Confirm the
design, then implement and test autonomously; do not deploy” is one valid agreement.
A required decision binds the relevant action, object, owner, scope and conditions.
Silence is not consent, and a local record is not an access-control system. See
[collaboration and authorization](collaboration.md).

## Build through real feedback

Find the actual build, test and runtime path in project instructions, scripts and CI.
Review hooks and side effects; identify cwd, configuration, data, identity and target.
Use existing runtimes and authorized project setup. Tool presence, access, startup
and correct behavior are different observations.

Run the smallest complete slice early. For a new app, that might be a submission
through the real API to persisted state and a refreshed view. A filter change may
need only a domain query and its HTTP boundary. Do not expand either task merely
to exercise every layer.

Choose the lowest-cost observation that distinguishes the current uncertainty:
a structural check, focused rule test, boundary test or consumer journey. Probe a
design-critical integration early. As the slice stabilizes, expand relevant regression
coverage; after the final relevant change, verify acceptance and required project checks.

For failures, preserve the observation, locate the likely layer, state a hypothesis,
choose a distinguishing check, repair and re-test. Zero cases call for selection
diagnosis; a success message with unchanged state calls for request and read-back
inspection. Repeating the same command without new evidence is not diagnosis.
Detailed procedures are in the Skill's [runtime reference](../skills/clinx-delivery/references/runtime.md).

## Verify the consumer and failure semantics

Lower-layer tests and mocks support development, but cannot establish the real
boundary they replace. Exercise the actual consumer required by the outcome,
including relevant versions and negative paths. An unchanged consumer can still be
affected by a server-side change.

At changed boundaries, inspect the producer and receiver: type, units, identity,
missing/null/empty/reset semantics and authoritative state. A generated or persisted
result must remain readable at credible sizes and after interrupted writes.

For work that scales, establish the applicable latency, freshness, capacity or cost
budget and its source. A finite loop or a positive delay alone does not demonstrate
acceptable behavior. Escalate conflicts that require a product or operational decision.

For asynchronous effects, separate accepted, running, terminal success/failure and
unknown outcomes. Distinguish invalid input, transient failure and obsolete work.
Use the provider's actual idempotency, retry and recovery contract; reconcile an
unknown write before resubmission. There is no universal retry count or queue design.
See the [delivery reference](../skills/clinx-delivery/references/delivery.md).

## Interpret evidence at its actual scope

An observation supports a claim relative to its inputs, target and assertion.
The CLI keeps these questions separate:

| Question       | Meaning                                                        |
| -------------- | -------------------------------------------------------------- |
| Execution      | What is known about starting and finishing the command?        |
| Observation    | Does its supported output indicate pass, fail or inconclusive? |
| Applicability  | Do the recorded local bindings and artifacts still apply?      |
| Claim decision | Do applicable observations support all declared obligations?   |

Execution may be unknown; incomplete storage does not mean a command never ran.
A local passing result does not establish omitted acceptance, remote truth,
authorization or authenticity. Review the actual assertions and their mapping to
the original requirement. Exact CLI semantics are in the [reference](cli.md).

Native-tool evidence may establish an agreed outcome that the CLI cannot aggregate.
Explain the delivery judgment and CLI result separately; never edit a verdict to
make them agree. See the [worked handoff](evidence.md#close-the-delivery-not-just-the-cli-verdict).

## Review and deliver

Review the outcome and necessity of new concepts first, then rule/state ownership,
reuse, shared contracts, scope, evidence and recovery. Finally review local naming,
structure and documentation. Remove an unnecessary upstream assumption before
optimizing machinery built around it.

Completion is relative to the agreed endpoint:

| Endpoint                 | Required result                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Design                   | Scoped semantics, approach, risks, verification plan and blockers                    |
| Local verification       | Actual relevant behavior and test results, with substitutes identified               |
| Integration verification | Real cross-boundary effects on identified targets and versions                       |
| Release readiness        | Required integration, configuration/migration, compatibility and recovery conditions |
| Released and observed    | Authorized artifact and target reach success, followed by live behavior checks       |

These are descriptions, not built-in CLI certification levels. Release readiness
does not grant release authority. Code, configuration and data may need different
recovery actions.

Re-read the original request and latest decisions. Deliver the usable result,
start/use/stop instructions, evidence and remaining limits. Complete available,
authorized verification rather than handing it back as “please test manually.”
For a real blocker, identify the missing decision or access and the concrete next
action, expected observation and recovery boundary.

## Resume and retain useful knowledge

One primary agent owns the outcome and integration across projects. Delegate only
when permitted and when the work has an independent boundary; reconcile the combined
effect, not just contributors' completion messages. See [collaboration](collaboration.md).

A checkpoint retains findings, blockers and the next safe action. On resume, inspect
current inputs, decisions and relevant live operations; a note does not authorize
replaying them. Preserve useful history even when the current environment is unavailable.

Keep stable rules with their domain owner, repeatable failures in regression tests,
reusable operations in an existing tool or guide, and task-specific reasoning in the
task. Maps should point to maintained truth. Retain sources, limits and conditions
for rechecking; create no new artifact when it would add no useful knowledge.

Measure improvement through correct delivery, fewer omissions and false completion,
recovery quality, and total human/agent cost on comparable tasks. Evaluate optional
mechanisms by the failure they prevent and their maintenance cost. The
[evaluation protocol](evaluation.md) separates these outcomes from implementation tests.
