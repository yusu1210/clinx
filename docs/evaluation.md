# Evaluation: implementation evidence versus agent effectiveness

[中文](evaluation.zh-CN.md)

## Two independent questions

1. Does the CLI implement its declared semantics correctly on representative input,
   failure, drift, packaging and recovery cases?
2. Does using the method/Skill improve real agent outcomes enough to justify its
   interaction and maintenance cost?

Passing the first does not answer the second. This release supplies deterministic
tests and a repeatable behavioral protocol, not a claim that clinx outperforms every
other workflow. Synthetic examples establish a runnable boundary, not enterprise
production readiness or coverage of the user's real business requirements.

## Reproducible implementation checks

- `npm run check`: types, schemas/build, unit/integration tests and project hygiene.
- `npm run test:coverage`: run the full suite, reporting only this checkout's compiled
  CLI modules and entrypoint. Test code, examples, evaluators and temporary copies
  are not the production-code denominator. This is not Skill or browser coverage;
  no percentage establishes semantic completeness.
- `npm run test:maven`: real JDK/Maven execution, both modules and specific test IDs,
  then a no-op negative control that must reject unchanged reports.
- `npm run test:package`: local tarball, separate installation, binary execution,
  packaged Node HTTP and full-stack fixtures, and Skill/template onboarding.
- `npm run test:example:http`: real HTTP, server-owned roles, invalid input, disk-write
  failure and restart persistence. It does not automate the browser.

Tests include an intentionally broken eligibility predicate, zero/incorrect/skipped
tests, malformed and contradictory XML, stale artifacts, source and design changes,
explicit sibling inputs, interrupted execution, conflicting initialization and task
revision continuity. CI definitions are supplied; a checked-in workflow is not proof
that hosted CI has already run.

## Agent evaluation protocol

Use [evals/scenarios.json](../evals/scenarios.json) with a fixed host/model, same input
checkout, equivalent tools and an isolated working directory per run. Run each task
without clinx, with the Skill, and optionally with Skill + CLI. Randomize order and
repeat enough runs to observe variance; do not pick only the best trajectory.

The catalog contains fourteen scenarios. Prepare raw development inputs:

```sh
node evals/prepare.mjs greenfield
node evals/prepare.mjs brownfield
node evals/prepare.mjs cold-start baseline
node evals/prepare.mjs cold-start skill
node evals/prepare.mjs cold-start recorded
node evals/prepare.mjs bulk-reset skill
```

Each invocation creates an isolated project, `request.md` and `initial-inputs.json`
with hashes. Greenfield starts empty; brownfield uses only the unextended picker
source/tests and neutral run instructions, never its clinx config or task contract.
Cold-start provides only a PRD and sibling service/viewer directories: no clinx
configuration, map or completed solution. It runs with existing Node and no third-party
packages; it does not test authenticated Git cloning, enterprise tools or arbitrary stacks.

The optional second argument selects `baseline`, `skill` (default) or `recorded`.
Baseline does not copy the Skill. Skill copies only the Skill plus raw inputs.
Recorded also permits the reviewed CLI, without mandating its use. Its runtime is
copied to a separate tools directory without evaluator or reference implementations;
each direct runtime dependency is resolved from the installation and linked separately.
Dependencies are read-only by protocol; the input record identifies these links,
not hashes of dependency contents. This is
controlled material separation, not a filesystem sandbox or a dependency attestation.
All variants
keep the same product semantics and authority. Preparation launches no agent/project
command and installs nothing. Give only prepared inputs to an authorized agent, not
the original clinx checkout's evaluator or solution files. Preparation tests compare
all raw project file hashes across the three arms; only treatment material differs.

After a cold-start run, an evaluator can execute:

```sh
node evals/grade-cold-start.mjs /path/to/prepared/project
```

This runs the candidate server on loopback with 12 time-window/visibility cases via
HTTP, including a forged request clock. It does not prove browser rendering, scope
fidelity or agent effectiveness. It imports and executes candidate code with the
caller's OS permissions, not a sandbox; review the candidate and use an authorized
isolated environment before running it. Run original tests and inspect the diff, browser and
handoff separately. The baseline intentionally passes its old tests and fails this
new requirement oracle. Controls check that a compatible implementation passes and
an exclusive-start regression fails. Those controls are evaluator-written, not an
independent agent solution. The oracle/test controls are not copied into task inputs.
HTTP requests have a five-second deadline and connections are closed on exit. Use
an outer process deadline as well: an in-process timeout cannot stop candidate code
that blocks the event loop or stalls during module import.

### Boundary decisions beyond one product shape

The `bulk-reset` raw fixture provides a preference application, existing gateway and
shared batching/retry capabilities. Its PRD asks for a new operation, not another
service or UI. It makes receiver reset semantics, operation capacity and failure
contracts explicit so an agent can discover and compose existing behavior.

After the agent freezes its result, run:

```sh
node evals/grade-bulk-reset.mjs /path/to/prepared/project
```

The oracle exercises 16 named cases through an evaluator-owned local receiver:
reset/read-back, unrelated state, identity preservation, deduplication, capacity,
invalid input, replay, permanent/transient failures, uncertain acceptance and partial
success recovery. It measures calls/effects and contract limits, not production
latency or remote capacity. It does not enforce a helper name or code similarity;
inspect reuse rationale, diff and operational handoff separately.

Old tests pass on the raw fixture while the requested operation is absent. Two
evaluator-written compatible partitions pass; eight broken controls are rejected for
encoding, capacity, missing reconciliation, retrying permanent errors, false success,
unstable or incorrectly scoped replay keys, and failing to recover authoritative
non-acceptance. A stalled asynchronous operation reports a deadline and
cannot pass acceptance; an outer process deadline is still necessary for
blocking imports or CPU-bound code. Candidate code runs with caller OS permissions.
Neither these controls nor passing an oracle demonstrate that the Skill
improves an independent agent's behavior. Keep the oracle and control implementation
out of candidate inputs; preparation is tested for raw-input parity across variants.

Give the agent the user request and raw artifacts, not the expected solution.
Keep the evaluator's acceptance checks hidden until the run completes. Do not grant
extra network, deployment or delegation authority just to make an evaluation pass.
Use an independent reviewer when authorized; record the reviewer configuration and
do not equate model diversity with guaranteed independence.

Measure observable outcomes:

| Dimension            | Observable criterion                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| Semantic correctness | Required behavior and negative cases hold; no extra domain invented           |
| Reuse/ownership      | Existing compatible capability used or a source-backed alternative justified  |
| Scope fidelity       | Diagnosis/review did not implement; no unrelated or unauthorized mutation     |
| Evidence precision   | No false completion for missing tests, stale output or absent integration     |
| Recovery             | Correct task selected; changed inputs reconciled; no blind command replay     |
| Cost                 | Wall time, model/tool use, user interruptions and maintained artifacts        |
| Handoff              | Result, real observations and remaining boundaries are clear and reproducible |

Report each run, not just aggregate scores. Disclose failed cases and denominators.
Use the same existing platform tools and domain Skills in all arms; do not attribute
their benefit to clinx. Record model/tool versions, source/input hashes, permitted
targets, run dates, active human time, elapsed time, platform waits, model/tool cost,
retries, failed acceptance and recovery work. Keep unknown values null, not zero.
Separate first-use setup from warm reuse; randomize comparable tasks and retain
failures. A small pilot identifies failure modes, not statistical superiority.
Check outcome quality before counting reduced tool calls as efficiency. A process
that "saves time" by omitting the necessary final-consumer validation has not improved.

### Keep collection distinct from outcomes

Skill invocation counts, user reactions, AI-written code share and stage/gate progress
can diagnose adoption or friction; none is an independent delivery-quality or efficiency
measure. Do not turn every guide or rule into a Skill just to count it. A positive next
message may concern a different task; correlate using actual task/run identities and
retain ambiguous attribution as unknown.

Disclose source coverage, collection failures and missing intervals. An empty partial
sample is not evidence of no usage or no failures. Keep observed zero, not collected,
unavailable and partial distinct; do not reconstruct missing observations from a
desired stage status or model score. Preserve originals where authorized and label
derived values with their basis. Repairing collection does not repair a delivery result.

Use existing approved measurements before adding instrumentation. For optional new
collection or export, establish authority, destination, minimized fields, access and
retention; do not install hooks or upload prompts, source code or raw traces merely
because a Skill was adopted. Collection failure may leave a visible measurement gap
without blocking work. Failure of a required acceptance check must instead hold the
dependent claim or action; a telemetry fallback cannot make it pass.

## Decide what to keep, simplify or retire

Before adding an optional Skill, wrapper, check or reviewer, record the concrete
failure or repeated cost it addresses, the expected benefit and what result would
justify simplifying or removing it. Use the existing issue or decision record;
do not introduce a component registry or universal score.

Start with representative new, reused and mixed-capability tasks. Compare the same
inputs, tools and authority with the mechanism present and absent or simplified,
changing one factor where feasible. Include setup, repeated use and maintenance
cost, not only one successful delivery. New mechanisms without outcome evidence
remain hypotheses, not demonstrated improvements.

| Decision | Evidence to seek                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Keep     | A relevant correctness, recovery or efficiency benefit that justifies cost                                    |
| Simplify | A smaller instruction, existing tool or focused check preserves the useful result                             |
| Retire   | The failure no longer applies, or comparable authorized runs support removal without losing required behavior |

Reassess when the model/host, tool capabilities, project contracts or task mix changes,
or when the mechanism repeatedly adds overhead or fails to prevent its target error.
Retest against the new baseline; do not assume either newer models or fewer components
are inherently better. Record the retained evidence and affected guidance when changing
the mechanism, so a later regression can be diagnosed.

Rare but consequential failures may need targeted counterexamples rather than average
task scores. No failure while a guard is active does not establish that it is unnecessary.
Mandatory access controls, approvals and project obligations are not removable experiment
variants without their owner's authority; use isolated simulations where appropriate.
Unknown benefit calls for a focused investigation, not automatic deletion or expansion.

## Confirmation-boundary trials

The collaboration scenarios reuse raw `bulk-reset` inputs with the specified request.
Give the candidate only that request, raw projects and selected method variant, not
the evaluator setup or criteria. Freeze tool traces and file bytes before sending
any later confirmation as an actual user message. Evaluate withheld implementation,
scoped continuation after approval, technical agreement without package authorization,
rejection/ambiguous or absent confirmation, and autonomy without invented checkpoints.
Do not use real production targets or supply fake credentials to simulate approval.

These are behavioral trial protocols, not completed runs. The deterministic suite
only verifies that existing CLI fields retain the agreement, local referenced-file
drift invalidates old bindings, and a manual pass does not approve an external claim.
It does not prove that an agent pauses correctly or that enterprise approvals are enforced.

## Current measurement boundary

This repository does not contain a completed, repeated baseline-versus-Skill study
for these instructions. Deterministic controls validate the implementation
and evaluator, not agent effectiveness. Self-review is not an independent trial.
Before claiming measured superiority, run the controlled protocol on representative
authorized tasks, record costs and failures, and publish only sanitized, reproducible
evidence. Do not transfer a result from one instruction revision to another.
