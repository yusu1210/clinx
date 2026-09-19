# Project map — optional drafting aid

Reuse an existing index first. Otherwise replace the relevant sections below with
source-backed facts from the task's investigation; remove unused sections and these
instructions. An unfilled outline is not knowledge. Do not inventory every repository
or copy source code. A task-specific reuse choice stays in the task brief; preserve
the capability facts that will help subsequent tasks.

For a multi-source workspace, record topology, ownership and cross-source flow here;
link existing source-owned maps, contracts and procedures, or relevant code, tests and
CI when no guide exists. Do not require each source to create documentation or copy
its internal class tree or domain definitions. For read-only sources, keep observations
qualified by source/revision and separate from owner-approved rules. A single-source
workspace can use its existing project map.

## Purpose and responsibility

- Responsible for: <outcomes and system boundaries>
- Outside this project's responsibility: <owning project or contract link>
- Current source/revision inspected: <reference; mark unknown where unavailable>

## Capabilities and authoritative owners

Repeat for each relevant capability, not every class:

```text
Capability / entry or registration point:
Authoritative rule/state owner -> transporting layers -> affected consumers:
Source / contract / relevant tests:
Known limits, failure semantics and reuse constraints:
Observed fact / documented intent / inference / unresolved link:
```

Record a rejected alternative only when its semantic or operational mismatch is
useful beyond this task. A missing entry is not proof that the capability is absent.

## Canonical paths and cross-project contracts

Link stable project identities and useful business aliases through the existing project
directory. Keep machine checkout paths in local bindings, not a second shared catalog.
Do not turn a saved location or past access result into a permanent permission grant.

```text
Input or event -> entry -> rule/state owner -> observable effect -> consumer
Boundary -> owning schema/API/event definition -> known supported consumers
Evidence for the path / links still requiring investigation:
```

Link to each contract's canonical owner, including outside this repository when
relevant. Do not create another field or enum definition here. Include alternate
paths only when they matter to the rule, such as cached reads or background writes.

## Run, observe and recover

Link to existing procedures for the applicable setup, build/check, start, actual
consumer observation and stop/recovery operations. Missing instructions can use the
[procedure outline](local-guide.md); replace the link if the project uses another guide.
Keep command arguments, identities and target setup in that owner, not in two manuals.

## Boundaries and known hazards

- Invariant -> authoritative rule -> enforcing check, or known enforcement gap.
- Affected shared resources or consumer versions -> applicable constraint and source.
- Known discrepancy between documentation and implementation -> where to investigate.

## Maintenance and next references

- When and against what each material fact was last checked; documentation alone is not a runtime observation.
- Changes to ownership, entrypoints, interfaces or procedures that require updating this index.
- Links to the deeper architecture, domain and operational sources needed next.

Remove obsolete navigation when its source no longer applies. Once useful, link the
map from the project's existing entrypoint; optional CLI users may also reference it
in config.context. Do not store task status, private credentials or one-off operation IDs here.
