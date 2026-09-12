# Project and tool integration

[中文](adoption.zh-CN.md)

Start with the [Skill](../skills/clinx-delivery/SKILL.md) and existing tools.
Project maps, operating guides and CLI configuration are useful capabilities, not
prerequisites the user must prepare. For raw inputs, begin with [cold start](cold-start.md).

## Choose what to persist

| Situation                                 | Useful support                                          | Avoid                                    |
| ----------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Small familiar change                     | Conversation, current source and focused tests          | Empty document trees                     |
| Unfamiliar or recurring project           | Source-backed capability map and actual execution guide | Repeated discovery or stale copied facts |
| Long, ambiguous or multi-project task     | Contract, decision references and recovery checkpoint   | Depending entirely on chat memory        |
| Repeated verification or evidence handoff | Reviewed check definitions and retained observations    | Treating a report as full acceptance     |

Use existing owners first. When a gap remains, optional templates are available for
[a map](../templates/project/clinx/system-map.md),
[a guide](../templates/project/clinx/local-guide.md),
[configuration](../templates/project/clinx.config.json) and
[a contract](../templates/project/clinx/contract.example.json).
For a human-readable agreement without CLI records, use the optional
[task brief](../templates/project/clinx/task-brief.md) or existing task/design record.
They are drafting aids: paths such as `src` are examples, not required directories.
Replace them with observed project facts before using them.

Maps locate capabilities, rule/state owners, consumers and tests. Guides retain
actual command/cwd, prerequisites, target/identity, effects, observation and recovery.
Rules stay with their canonical owner; task-only operation IDs stay in the task.
The [Skill integration reference](../skills/clinx-delivery/references/integration.md)
describes the agent's decision procedure.

## Compose shared guidance and existing workflows

For a reused Skill, rule or guide, identify the canonical source, maintainer,
applicability and effective version when relevant. Ownership, discovery visibility
and permission are separate concerns; local preferences do not override mandatory
controls. Load relevant references through existing catalogs and entry links instead
of injecting every asset. Resolve same-name or conflicting copies using documented
host precedence; an unresolved material conflict blocks the affected action.

Keep the existing delivery workflow where it serves the task. Apply clinx's loop
within it, with one outcome owner and agreement, not a competing stage machine or
duplicate approval sequence. Link native decisions and state. A Skill installation,
workflow label or preference does not grant authority. Recheck affected assumptions
after relevant asset changes; do not upgrade global tools as an incidental task step.

Promote reusable discoveries through their owner's review path, retaining sources
and limits. Correct the canonical guidance instead of accumulating duplicate rules.
Neither one successful workaround nor high usage justifies a universal prescription.
See [evaluation](evaluation.md) for outcome measurement and collection boundaries.

## Local Skill discovery

`init --agent codex --apply` installs under `.agents/skills/clinx-delivery`.
Generic mode uses `clinx/skills/clinx-delivery`; explicitly read its SKILL.md or follow
the host's registration mechanism. Both include the license and a small
`clinx/agent-entry.md`. Preview first; differing existing files abort without overwrite.

No map, guide, task or config is automatically written. The existing project can
continue using the Skill without the CLI. Merge an entry into existing instructions
only if useful; clinx does not edit global settings or hot-register a running host.
Check discovery in the selected host after installation.

## Add records from engineering facts

The agent writes `clinx.config.json` only when records help. Declare:

- Explicit source roots and relevant inputs, including meaningful configuration and
  locks. Sibling repositories are allowed; no parent workspace is scanned implicitly.
- Explicit exclusions for generated or private records if selecting broad directories.
  Neither directory names nor gitignore decide evidence scope. No silent exclusions.
- Context references to existing or newly verified maps/guides, selected by focus.
- Actual completing check commands, cwd, result semantics and effects.

Preview the selected sources and checks with `verify`. Execute only after reviewing
the invoked scripts, target and authority. The [walkthrough](walkthrough.md) gives
the command sequence; the [CLI reference](cli.md) owns exact semantics.

## Reuse platform tools directly

If an existing CLI/API/Skill already supplies the needed operation, use it without
a new wrapper. Still resolve the effective project/target/identity, side effects,
terminal outcome and recovery procedure. Availability of a deployment command does
not identify what to deploy or grant permission to deploy it.

Add a thin binding, procedure or result assertion only for a demonstrated gap.
Do not duplicate tool registries or mix business policy with platform access.
Private rules, endpoints and credentials stay in the project or existing credential
system, never in the public method. A platform's generic success cannot establish
a project's business invariant.

Use the [collaboration agreement](collaboration.md) to name permitted operations and
confirmation points. Existing approval systems remain authoritative; a local policy
description, passing receipt or `--allow-external` does not grant production access.

Start on a representative task, retain useful discoveries and observe later reuse.
Keep a capability when its correctness, execution or recovery value pays its cost.
Before publication, follow [release readiness](../CONTRIBUTING.md#release-readiness).
