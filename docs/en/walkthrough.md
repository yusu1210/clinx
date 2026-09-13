# Operational walkthrough

[中文](../zh-CN/walkthrough.md)

This walkthrough uses an existing project and an [installed CLI](installation.md).
Run from the selected workspace, or pass its explicit `--root` from elsewhere:

```sh
clinx --version
cd /path/to/project
```

No source checkout or shell wrapper is needed. Results are readable text; use
`--json` when consuming them programmatically and `clinx COMMAND --help` for details.

Only have a requirement and repository URLs? Begin with [cold start](cold-start.md), without
initialization. The agent discovers facts and writes useful configuration; the user
does not prepare a map, platform IDs or JSON before implementation.

## 1. Choose the amount of structure

For a new capability, use the [greenfield procedure](../../skills/clinx-delivery/references/delivery.md):
expand only necessary product behavior and run a real vertical slice early. For a
mixed task, classify each capability as reuse/extend/compose/new/unknown. The same
work loop applies; neither path requires an environment platform.

Optionally use static navigation while reading the selected project:

```sh
clinx inspect --root /path/to/project
```

Read candidate origins and existing guides. This reads local files but does not
execute commands, check readiness, create task directories or change the project.

For a typo or a local low-risk fix, use the Skill and ordinary tools. No init or JSON
contract is necessary. To install the workspace-local Skill:

```sh
clinx init --root /path/to/project --agent codex --apply
```

Omit `--apply` if you want a read-only preview first. Read `clinx/agent-entry.md`;
decide whether an entry belongs in existing host instructions. Add `.clinx/` and
`.clinx/` to existing private-output ignore rules.
init installed the Skill and entry with a file-ownership record, not a configured
project. The agent now prepares configuration if
records are useful; it does not ask the user to fill a technical form. Configure
source inputs and existing tests. Keep relevant dependency manifests and
lockfiles in the fingerprint scope. Broad source scopes are conservative but may
need explicit exclusions for generated reports; never exclude a relevant input to
make a stale result look fresh.
No names are implicitly excluded. Review actual canonical inputs and generated
outputs. The [configuration template](../../templates/workspace/clinx.config.json) is a
shape example, not a ready configuration for an arbitrary project.

## 2. Let the agent discover and contract

Example request:

> Use clinx-delivery to expose the existing eligible-item query in our picker.
> Trace the current UI/API/domain flow, locate filtering and total ownership, and
> reuse the existing capability where compatible. Implement the requested outcome;
> no pricing, new data store or release is implied.

This request sets an investigation direction, not the real project's architecture.
The agent reads code and tests before claiming the server already owns the policy.
If the task is only diagnosis, it explains the chain and stops short of implementation.
When design confirmation is required, wait before implementing the feature or its tests.

For persisted work, prepare a real contract using the optional
[contract template](../../templates/workspace/clinx/contract.example.json) as a shape example.
Replace its placeholder claims with actual acceptance conditions.
Map them to registered checks or explicit external gaps. Keep detailed design in
a referenced local file instead of copying its rules into several documents.

```sh
clinx task add --root /path/to/project --file /path/to/proposal.json
clinx validate TASK-ID --root /path/to/project
clinx context TASK-ID --root /path/to/project --focus build
```

The CLI validates and preserves this record. It does not decide whether the design
is good or whether the checks exhaust acceptance. The agent still owns that review.

## 3. Build and inspect evidence

The agent uses the existing editor, terminal, browser and approved enterprise tools.
clinx does not spawn a model or advance a stage on its behalf.

```sh
clinx verify TASK-ID --root /path/to/project
clinx verify TASK-ID --root /path/to/project --run
```

Read the preview's argv, scripts and side effects first. The run response includes
a receipt path and verdict. Inspect `verdict.checks` for the exact failed/unresolved
check, reason and raw log paths. Repair the real cause within scope, not the result
file. The required browser or remote integration may remain unverified even when
the local claim is supported; complete available observations and report the boundary.
When native observations establish the agreed result but CLI aggregation remains
unresolved, use the [handoff example](evidence.md#close-the-delivery-not-just-the-cli-verdict)
to explain both. No extra approval command or fabricated passing report is needed.

Use [runtime diagnosis](../../skills/clinx-delivery/references/runtime.md) to choose the
next observation. A missing executable calls for the actual tool/setup procedure;
zero tests call for selection/report diagnosis; UI/API mismatch calls for request
and state inspection. Continue safe, relevant work until the requested endpoint or
a concrete external blocker. After the last fix re-run affected checks and compare
the outcome back to the original requirement, not just the generated plan.

## 4. Save enough to resume

Prepare a note like the [checkpoint example](../../skills/clinx-delivery/references/continuity.md).

```sh
clinx task checkpoint TASK-ID --root /path/to/project --file /path/to/note.json
clinx task list --root /path/to/project
clinx context TASK-ID --root /path/to/project
```

A fresh agent uses the task contract and note to find the next safe action, checks
current source and any running process, and reads only relevant references. It must
not repeat a remote write just because it appears in a previous next-action note.

## 5. Revise the agreement

When the user changes semantics, identify what remains valid and what must change.
Prepare the complete next contract after the revision is authorized:

```sh
clinx task revise TASK-ID --root /path/to/project --file /path/to/revised.json --reason "User clarified count semantics"
clinx reconcile TASK-ID --root /path/to/project --receipt .clinx/runs/RUN-ID/receipt.json
```

The previous JSON contract survives. The old receipt becomes stale because it was
produced for another contract. No code is rolled back or command replayed. Reinspect
affected work; a fresh run of the selected claim is needed for current CLI support,
because reconciliation does not reuse passing checks across stale receipts.
If an old design path moved or a check was replaced, reference its actual successor
in the replacement contract; no dummy old file is required. Historical design bytes
remain the existing version-control system's responsibility. See [recovery](cli.md#recovery).

## 6. Promote only reusable knowledge

If a stable source-backed capability or invariant changed, update the project's
canonical map/guide. Put the regression in tests. Do not copy the entire task into
a knowledge base. Do not push, deploy or publish as an automatic consequence.
If no useful map or guide exists and future work would benefit, draft it from the
optional [map](../../templates/workspace/clinx/system-map.md) or
[guide](../../templates/workspace/clinx/local-guide.md) and current source findings.
Reference it in config.context with the relevant focus; do not leave placeholder
text masquerading as engineering knowledge.
