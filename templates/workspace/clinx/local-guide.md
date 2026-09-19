# Project procedures — optional drafting aid

Prefer existing engineering and tool guides. Add only the missing, verified facts
that help another task run or recover; do not copy an entire tool manual.

For a relevant procedure, record:

- Its purpose, source/owner, module and working directory.
- Reviewed setup and command arguments, required configuration, data and identity.
- Verified toolchain/dependency versions and test selection; for incremental commands,
  which built outputs they reuse and how to establish those outputs are applicable.
- Actual target and effects, authorization, and how to observe the result.
- Completion, failure and unknown states; logs/artifacts and safe recovery.
- For a required tool, the owning rule, applicable scope, permitted fallback and
  what remains unmet when unavailable. For navigation indexes, covered sources,
  verified query, freshness/update limits and unsupported edges.
- A concrete consumer observation, correlation/operation identity, and stop condition;
  distinguish stopping new work from recovering in-flight or completed effects.
- For a running process, start, observe and stop instructions with ownership.

Keep stable procedures here, task-specific operation IDs in the task, business rules
with their canonical owner and secrets in the existing credential system. A command
being documented does not establish availability, authority or successful behavior.
Include when the procedure was actually observed and which changes require rechecking.

For a missing procedure, this compact shape is enough; replace it with verified facts:

```text
Purpose / source / last observation:
Command + cwd / relevant revision and prerequisites:
Effective target + identity / data scope / authority:
Input or user journey -> expected final effect:
Native observation + operation/version correlation:
Failure / unknown result -> diagnosis or reconciliation:
Owned process/operation -> stop / effect recovery:
```

Reuse native reports and result bundles. Do not require a JUnit conversion; record
what was actually observed and where the original artifact can be inspected.
