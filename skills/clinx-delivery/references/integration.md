# Connect project knowledge and existing tools

The general capability is finding and preserving useful engineering facts, not
requiring every project to adopt the same files. Separate domain rules from platform
procedures: a rule can apply through multiple tools; a tool serves many domains.

Use [project-context.md](project-context.md) to reuse business-to-project navigation,
resolve local checkouts and choose current task scope. A known context should remove
repeated input, not create a second project registry or permanent permission claim.

## Choose a coordination location, not a repository scaffold

Use the existing checkout for one repository. For a cross-repository task, choose a
coordination directory and link the actual sources; do not move or initialize every
repository. Creating an `AGENTS.md`, `docs/` directory or system map in each source
is optional. Read existing applicable instructions before acting, checking the host's
discovery rules rather than assuming sibling instructions load automatically.

## Establish effective host access before building

A declared source is a task boundary, not a filesystem grant. Before depending on a
source, map the required reads, edits, generated outputs, local commands, network use
and external operations to the capabilities of the actual agent session. Confirm the
effective workspace roots and permission mode through the host's supported status or
permission view. A successful `clinx validate`, `inspect` or `skill status` does not
show that the host can edit a sibling source or execute its checks.

Grant only the roots and capabilities the task needs through existing host or
enterprise controls. Read-only dependencies need not become writable merely because
they are listed as sources. If a build writes beside its inputs, that output location
must also be writable. Browser, connector and remote-service permissions can be
separate from terminal filesystem permissions; check the capability actually used.
Do not automatically switch to unrestricted access, edit global host configuration,
or treat a permission preference as business approval.

For Codex, `/status` exposes the effective workspace and `/permissions` selects an
available permission preset; custom permission profiles can add exact workspace roots.
Managed policy and protected paths still apply. Follow the current
[official permissions guide](https://learn.chatgpt.com/docs/permissions) rather than
assuming a particular profile exists. Other hosts should use their native equivalent.
If required access is unavailable, continue independent read-only work and report the
specific missing root or capability; do not simulate a successful build or operation.

Keep durable source-local facts with their owner and normal review process. Existing
team documentation can remain canonical. For read-only or separately owned sources,
retain source/revision-qualified observations in the workspace when useful; do not
modify them just to onboard or represent local notes as owner-approved rules. Shared
maps describe cross-source relationships; task-specific decisions stay with the task.
Missing documentation alone does not block investigation through code, tests and CI.
Missing necessary meaning, access or authority still blocks the dependent action.

## Keep knowledge where the next task can use it

Follow [knowledge.md](knowledge.md) for investigation, canonical homes, provenance,
retrieval and correction. Reuse existing maps and guides; optional project templates
are drafting aids, not prerequisites. Preserve discoveries that materially help the
next task: a compatible capability and its limits, an easy-to-miss registration path,
or a verified build/test procedure. No useful new learning means no new artifact.
Do not remove a useful capability merely to reduce file count.

When structural or semantic navigation would help, use
[code-intelligence.md](code-intelligence.md) to select and interpret existing tools.
Neither a generated map nor an index establishes current behavior or intended rules.

## Resolve shared guidance before composing it

For a shared Skill, rule or guide, establish its canonical source, maintainer,
applicability and effective version when the task depends on them. Use the host's
approved catalog or relevant entry links; load only the material needed for the
current decision. Search visibility and installation do not grant execution authority.

Separate what an asset does from where it is maintained and who may use it. A local
preference cannot override a mandatory control. Same names do not establish equivalent
semantics: resolve competing copies using the host's documented precedence and inspect
the effective copy. Do not silently concatenate conflicting instructions or invent a
precedence rule. If an unresolved conflict affects a required action, hold that action.

When the project already has a delivery workflow, fit this loop into it. Keep one
outcome owner and shared agreement; link existing decisions, checks and native state
instead of adding a second stage machine or duplicate approvals. Existing mandatory
controls still apply. A workflow label or configured preference is not approval.
On resume or a relevant asset change, check affected assumptions and decisions before
reuse; do not automatically upgrade shared tools during an unrelated delivery.

Promote a useful task discovery into shared guidance only through its owner's normal
review path. Check its applicability and remove obsolete or duplicate guidance at the
canonical home. One successful local workaround is not yet a general rule, and asset
usage alone is not evidence of improved delivery. Keep private content and licensing
boundaries intact when contributing a generalization.

## Reuse tools before wrapping them

Read the installed tool's actual help, approved Skill and project bindings. If they
already support the operation, invoke them directly within authority. Do not create
a second registry of stable platform IDs or transcribe a whole manual.

Add only the missing piece: a project binding, short procedure, domain assertion,
or genuine access/format/reliability fix. Prefer an upstream correction when possible.
An adapter is reusable only where its underlying contract is stable.

For a consequential operation, resolve the exact target and identity, prerequisites,
read/write effects, authority, meaningful terminal/unknown states and recovery path.
Those facts can live in existing tools and guides; they need not become new clinx
schema fields. See [runtime.md](runtime.md) for execution and diagnosis.

Register a CLI check only after its command and result semantics are understood.
External/browser attachments preserve an observer assertion, not remote truth or
machine acceptance. See [cli.md](cli.md). No configuration or passing result authorizes
a commit, push, deployment or account change.

Keep private procedures, endpoints, identifiers, data and credentials outside the
public method. Use existing credential flows, not copied secrets. Public examples
must be independently authored and synthetic; their language and domain do not
prescribe how another project is structured.

For large repositories, reuse native project graphs, affected-test selection and
cache semantics when the project already provides them. clinx records the reviewed
commands and observations; it does not rebuild a generic dependency graph or cache.
