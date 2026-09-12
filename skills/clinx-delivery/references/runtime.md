# Make the required behavior runnable and observable

Read this when establishing a run path, investigating execution failures, or validating
an actual consumer. Use the project's existing tools and native artifacts. This is
not a requirement to install an environment, change test frameworks or use clinx records.

## Establish a usable path before expanding implementation

Find commands in project instructions, CI, scripts and manifests; review invoked hooks.
For existing behavior, run the relevant baseline when safe. For a new capability,
exercise the uncertain dependency and smallest input-to-effect slice early. Normal
reviewed dependency restore, build and test are engineering work, not a new platform.

Resolve the facts needed for this action, not a complete environment inventory:

| Question                        | Concrete answer                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| What runs?                      | Actual command/argv, module, cwd, revision and relevant toolchain                       |
| Where and as whom?              | Local or authorized shared target, effective identity, isolated data/configuration      |
| How is it reached?              | Real invocation or entry URL, required input and expected observable effect             |
| How is the result checked?      | Native assertion/tool, read-back or consumer journey; version and operation correlation |
| How is it stopped or recovered? | Owned process/operation, stop rule, retry/reconciliation and effect-recovery limits     |

Keep reusable answers in the existing guide; task-specific IDs stay in the task.
Distinguish unavailable, untested and observed-working. File presence is not readiness.
Use cheap toolchain probes when they distinguish a setup problem; do not substitute
a shortcut for the actual build lifecycle. Reused outputs need source/toolchain/
dependency identity; describe incremental checks as incremental.

If a path is missing, inspect the existing documented alternative. Implement a small
task-local check or setup step only when in scope and genuinely needed. Ask for the
specific inaccessible resource or authority; do not ask the user to design the whole
environment or silently replace the target with a mock. Do not change unrelated
product code to work around a missing tool.

## Choose feedback for the next decision

Use the least costly available observation that can distinguish the current
hypothesis. These are options, not a mandatory sequence or universal test suite:

| Current question                                     | Useful feedback                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Is the edit structurally valid?                      | Relevant parser/compiler/type, lint or architecture check                      |
| Is a local rule correct?                             | Focused unit/property test and a meaningful counterexample                     |
| Does a boundary preserve meaning?                    | Actual contract/API/integration check and receiver effect                      |
| Does the requested outcome work?                     | Real consumer interaction, persisted state or completed event                  |
| Does it meet operational or qualitative constraints? | Correlated logs/trace/metrics, a focused load/failure case or justified review |

Run cheap decisive checks during editing; expand to affected regressions as the slice
stabilizes. If an uncertain interface, identity, device or dependency could invalidate
the design, exercise it early rather than waiting for all lower-level tests to pass.
Do not rerun the entire suite after each edit unless its cost or project policy
justifies that choice. Before claiming completion, cover the original acceptance
and applicable project-required checks after the final relevant change.

Faster local feedback does not replace a required consumer observation or authorize
an inaccessible target. A useful error is more valuable than an unrelated green check.

## Exercise the effect, not just the entrypoint

Select only the rows needed by the acceptance conditions:

| Required behavior       | Observe at its actual boundary                                                       | Insufficient substitute                             |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| User interaction        | Perform the journey, including relevant empty/error/success states                   | Compilation, component existence or HTTP-only tests |
| Stored state            | Read back from the authoritative store/consumer and test its promised lifetime       | A success toast or an echo of submitted input       |
| Protected operation     | Attempt permitted and rejected actions at the enforcing boundary                     | Hiding a control or trusting a caller-supplied role |
| Asynchronous effect     | Correlate the operation to actual consumption/final state within its stated deadline | Enqueue success, elapsed sleep or polling exit zero |
| Interface evolution     | Exercise affected consumer versions and actual wire/field semantics                  | Same-version mocks or schema shape alone            |
| Capacity or reliability | Measure the relevant budget and credible failure/load case                           | A finite loop or invented default limit             |

An unchanged consumer can still be affected. Where versions coexist, discover the
actual compatibility window and rollout order; do not assume all clients upgrade
together or prescribe an arbitrary N/N-1 rule. Where telemetry is part of acceptance,
verify event meaning and correlation, not merely that a logging call exists.

Track the processes you start; stop only those you own. A worktree does not isolate
ports, queues, tenants or databases. Use isolated data or an authorized test target.
Long-lived services belong in a managed host session; a bounded verification command
must complete, and may own the start/stop of its own fixture.

## Use native feedback without weakening it

- Use real compiler, contract, architecture, test and product checks already present.
  New checks should encode a relevant invariant, not a preferred class name or pattern.
- Inspect actual test selection, failures, skips and expected identities using the
  tool's native output. JUnit XML is one optional report format, not the method's
  acceptance model. Do not convert every result into fake testcases.
- An existing validator may legitimately express its assertion through exit status.
  Review that contract: some tools return zero for zero tests or accepted/running jobs.
  Add a focused assertion only for a real gap, retaining original output and failure
  semantics. Do not create a wrapper solely to rename an existing command.
- Preserve native reports, traces or device result bundles in their existing owner.
  If copying a focused local attachment, preserve target/revision and limitations;
  exporting a summary is not proof that an unexamined bundle passed.

The optional CLI's supported parsers are a subset of available tool outputs. A
missing parser does not block normal agent verification or require a new framework.
Conversely, a successful CLI record does not expand what the underlying check observed.

## Diagnose, repair, and recheck

Preserve the useful error, localize its layer, and choose an observation that separates
plausible causes. Zero tests call for selection/report inspection; unchanged effects
for request/state/read-back inspection; ordering failures for concurrency/version
checks; slow correct results for actual call/query cost. Do not repeat the same failed
operation without a distinguishing hypothesis or weaken acceptance to pass.

For a remote action distinguish accepted, running, terminal success/failure, canceled
and unknown. Match the actual target/artifact and operation, not echoed inputs or
another job's "latest" result. For an unknown write, query the existing operation or
use its supported same-operation replay before considering a new write.

An interrupted worker, unreadable required result or invalid mandatory check is not
a pass. Evidence-storage failure does not establish that an operation never ran. Preserve the gap and reconcile actual effects before resuming dependent work;
continue only work that does not rely on the missing result. Optional usage telemetry
may fail without stopping delivery, with the loss disclosed. It must not silently
supply a successful default to an acceptance check. A manual decision may authorize
a scoped exception where policy permits, but does not turn a failed observation into
a passing one or waive unrelated checks.

Re-run affected observations after repair; do not attribute a failure to the baseline
without reproduction or mark attribution certain when reproduction is unsafe.
Compare the final outcome with the original requirement and current agreement.
If an integration remains blocked, hand off the exact target/access, action, expected
effect, evidence location and stop/recovery condition. Keep code/configuration rollback
separate from undoing already-written data or in-flight effects.
