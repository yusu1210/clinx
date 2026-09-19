# Start from a requirement and repository

[简体中文](../zh-CN/cold-start.md)

For a copyable project, agent request, confirmation and CLI session, start with the
[hands-on tutorial](hands-on.md). This guide adapts that workflow to your own inputs.

Give the agent the requirement. Reuse the current project or known knowledge entry;
supply repository URLs or local paths only when they cannot be resolved. The agent can
discover the relevant code and tools; you do not need to prepare a project map,
technical plan, task JSON, or platform IDs. It still needs access and authority
for the actions the task requires.

## One request

First [connect the Skill](installation.md), or give the agent the absolute path of
a complete reviewed Skill folder. No CLI configuration is needed to start.

```text
Use clinx for <requirement file or description> in the current product context.
Confirm the key design with me, then implement and verify locally.
Do not push or deploy. Show me how to use the result and any unverified gaps.
```

The Skill already supplies the investigation, reuse, runtime verification and handoff
instructions. Do not repeat them in every prompt. The design confirmation above is a
choice for this task, not a mandatory gate for every change; state your actual boundaries.

Once the Skill and context entry are discoverable, later requests need only new intent
and relevant changed constraints. The agent follows the
[cold-start procedure](../../skills/clinx-delivery/references/cold-start.md), reading other
references only when needed. The CLI itself does not fetch PRDs, clone repositories,
invoke a model or run this workflow.

To confirm the design before implementation, say so in the request. The agent can
investigate and prepare the decision, then wait before implementing. See
[collaboration](collaboration.md) for other confirmation arrangements.

## What happens next

Known-project reuse, new machines, multiple worktrees, knowledge outages, read-only
sources and twelve everyday scenarios are covered in [context reuse](project-context.md).
The agent resolves existing facts before asking; missing or materially ambiguous inputs
still require a focused question.

Repository names, check definitions, task IDs, configuration and receipt paths are
agent-handled details, not required user inputs. Keep them inspectable. Product
tradeoffs, unavailable credentials and held approvals cannot be hidden or fabricated.

For consequential work, the agent can fill a concise [task brief](../../templates/workspace/clinx/task-brief.md)
from discovered facts. A conversation or existing design is equally valid; this is
not an extra required document. Keep one current source for detailed decisions:

```text
Outcome and delivery endpoint:
Current flow + evidence / capability reuse or gap:
Scope / rule-state owners / changed interfaces and invariants:
First runnable slice / actual command + cwd / target + identity:
Acceptance -> real consumer observation / failure case / remaining gap:
Allowed actions / held decisions + owner / stop and recovery:
```

The run path should be usable by the agent, not deferred as "the user will test it".
The Skill's [runtime procedure](../../skills/clinx-delivery/references/runtime.md) makes
native feedback, asynchronous effects and version-sensitive consumer checks concrete.

The agent should:

1. Read the original requirement and inspect the checkout's revision and existing changes.
2. Trace the entrypoint, rule owner, consumers, and available implementations.
3. Find and try the real module, runtime, and test path before relying on a candidate command.
4. Agree on observable acceptance, negative cases, scope, and delivery endpoint.
5. Implement, run, diagnose, and repair the smallest complete path.
6. Hand off reproducible results with the target, version, and remaining gaps.

Involve the responsible person for missing access, conflicting requirements,
unresolved product choices, or authority for a held operation. Missing documentation
alone is not a blocker when the agent can inspect the system directly.

These steps follow the agreed confirmation boundaries. Investigate unknown facts first.
An unknown product decision or ambiguous shared target must not
be silently guessed. Preserve unrelated work and do not repair an out-of-scope
consumer merely because a dependency problem was found.

## Existing and new capabilities

A new service can mostly reuse authentication or storage. An old service can gain
a genuinely new capability. Classify each capability, not the repository as a whole.
For new development, run a real input-to-effect slice early. For existing
capabilities, check semantics, permission, failure behavior and supported versions.

In an empty checkout, start from the original requirement, actors, project constraints
and uncertain dependencies; there is no existing call chain to invent. Make the first
slice produce an actual effect before expanding the scaffold. Use conversation or
the ordinary task brief initially. If CLI records already help, declare actual
requirement/design files; add source inputs when code exists. Do not create dummy
source files, tests or a whole environment merely to initialize clinx.

An unchanged web/mobile client still needs relevant behavior verification. A generic
viewer may already render a server-selected set; that saves a UI modification,
but does not prove refresh, empty/error states or version compatibility. Conversely,
a mobile client does not require rebuilding every app for every backend change.
Select observations that expose the task's actual failure modes.

## Two worked delivery shapes

| Decision            | New local reading list                                                      | Existing bulk-preference operation                                                         |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| User outcome        | Submit a recommendation, view it, and let an authorized role mark it read   | Reset selected users' preferences without changing unrelated state                         |
| Discover            | Actors, persistence lifetime, permitted demo identity, existing constraints | Receiver reset semantics, existing batching/retry utilities and operation limits           |
| First slice         | Submit -> real API -> saved state -> refreshed view                         | One reset -> actual gateway/receiver -> authoritative read-back                            |
| Expand within scope | Permission rejection, validation, failed save and restart behavior          | Deduplication, capacity, permanent/transient failure, uncertain acceptance and safe replay |
| Verify              | Real HTTP and persistence plus actual browser journeys                      | Original tests plus receiver effects, not just mocked request shape                        |
| Handoff             | Start/use/stop, demo limitations and any unverified target                  | Concrete invocation, partial-success/unknown-outcome recovery and unresolved integration   |

See the runnable [reading list](../../examples/reading-list/README.md) and raw
[bulk-operation requirement](../../evals/fixtures/bulk-reset/PRD.md). These are synthetic
examples, not target architectures or proof of agent effectiveness. In either case,
discovery determines which boundaries matter; do not add a UI to an API-only request
or skip an unchanged consumer that the outcome still depends on.

## Execution without owning an environment

Use existing runtimes and reviewed dependency restore, build and test steps. Read
hooks/plugins before executing them. If the project needs an existing remote test
service, confirm its identity and authority instead of installing the whole system
locally. A worktree isolates code, not queues, ports or tenants.

`clinx inspect` is optional static navigation, not a readiness verdict. It discovers
root package scripts, Maven lifecycle candidates and declared checks. It does not
resolve the right JDK, module set, Gradle task or CI profile for you. The agent reads
guides/CI/source and checks runtime results. Unsupported discovery is not unsupported
engineering.

## When to add CLI records

Use the Skill alone for small work. Persist a contract for meaningful ambiguity,
long duration or handoff. Let the agent write and validate JSON after understanding
the task. Add checks when they remove repeated work or catch actual failures.
Verify test identities, not just exit zero.

External/browser observations can be retained using [evidence attachments](evidence.md),
without approving a claim. Enterprise reuse is described in [adoption](adoption.md).
Maps, guides and configuration are retained capabilities, not mandatory first-use
artifacts. The agent should create or update them when source-backed findings will
help execution, future reuse or recovery; existing authoritative materials come first.
The [evaluation protocol](evaluation.md) compares existing-tools baseline, Skill and
Skill + CLI, separating cold-start cost from later reuse.
