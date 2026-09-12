# A PRD and repositories are enough to start

[中文](cold-start.zh-CN.md)

Give the agent the requirement and repository URLs or local paths. You do not need to prepare a map, technical plan, task JSON or platform IDs. The agent
discovers engineering facts with its normal tools. Access, material product choices
and authorization must still be established.

## One request

```text
Read skills/clinx-delivery/SKILL.md from my reviewed clinx checkout.
PRD: <file or URL>
Repositories: <URLs or local paths>
Implement the requirement and verify actual behavior, not just a design.

Discover current owners, compatible capabilities, the real toolchain and acceptance
from the original inputs. Do not ask me to build a map or write clinx configuration.
For missing capabilities, deliver a small running vertical slice first.
Separate what needs editing from the consumers that still need verification.
Use existing project tools and reviewed local dependency/setup procedures.
Do not change global tools, credentials or shared systems, push or deploy implicitly.
Honor agreed confirmation points; otherwise ask only for missing decisions, access
or authority that evidence cannot resolve.
Run, diagnose, repair and re-test within scope. Report actual use/stop instructions,
evidence and remaining boundaries. Persist only what helps continuity or verification.
```

Once the Skill is discoverable in your agent, daily requests need only the PRD,
repositories and relevant delivery constraints. The agent follows the
[cold-start procedure](../skills/clinx-delivery/references/cold-start.md), reading other
references only when needed. The CLI itself does not fetch PRDs, clone repositories,
invoke a model or run this workflow.

To confirm the design before implementation, add that explicit boundary and the desired
delivery endpoint to the request. The agent can investigate and prepare the decision,
but must not implement while it awaits confirmation. See [collaboration](collaboration.md)
for a complete request, autonomous work and work-package alternatives.

## What happens next

For consequential work, the agent can fill a thin [task brief](../templates/project/clinx/task-brief.md)
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
The Skill's [runtime procedure](../skills/clinx-delivery/references/runtime.md) makes
native feedback, asynchronous effects and version-sensitive consumer checks concrete.

| Agent work                             | A useful output                                             | A reason to involve a person                                  |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Resolve original inputs and checkout   | Current requirement, revision and dirty state               | Missing access or competing material requirements             |
| Trace entry, owners and final consumer | Source-backed reuse/extend/compose/new decisions            | Inaccessible critical dependency or unresolved ownership      |
| Find and try the execution path        | Real module/runtime/test selection and baseline             | Required tool/resource absent without an approved alternative |
| Agree behavior and scope               | Observable acceptance, negative cases and delivery endpoint | Product choice or operation authority cannot be inferred      |
| Implement, run and repair              | Working slice, real results and consumer observations       | A genuine remaining blocker, not merely missing documentation |
| Close and retain useful facts          | Reproducible handoff and version/target-bound evidence      | Review or release decision belongs to an authorized person    |

These responsibilities follow the agreed confirmation boundaries. Investigate unknown facts first. An unknown product decision or ambiguous shared target must not
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

See the runnable [reading list](../examples/reading-list/README.md) and raw
[bulk-operation requirement](../evals/fixtures/bulk-reset/PRD.md). These are synthetic
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

## When the CLI earns its place

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
