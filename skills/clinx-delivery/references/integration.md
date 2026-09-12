# Connect project knowledge and existing tools

The general capability is finding and preserving useful engineering facts, not
requiring every project to adopt the same files. Separate domain rules from platform
procedures: a rule can apply through multiple tools; a tool serves many domains.

## Keep knowledge where the next task can use it

Reuse an existing map or guide first. When one is missing and recurring discovery
is costly, create a compact source-backed artifact after investigating the current
task. The packaged project templates are optional drafting aids, not prerequisites.

| Knowledge                        | Canonical home                                      | Useful content                                                                       |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| System navigation                | Existing map, or a new small map                    | Relevant capabilities, entries, rule/state owners, consumers, tests and source links |
| Repeatable execution             | Existing tool Skill/guide, or a focused local guide | Command/cwd, setup, identity/target, effects, result interpretation and recovery     |
| Business invariant               | Its current owner and regression tests              | Meaning and cases that can violate it                                                |
| Task decisions and operation IDs | Task contract/handoff                               | Scope, choices, observations, blockers and next action                               |

Do not copy code into a parallel knowledge database. Refresh facts when relevant
source or procedures change. A map is navigation, not stronger evidence than code;
a documented command is not proof that it ran. No useful new knowledge means no new
document is necessary. Conversely, a useful general capability is not removed merely
to reduce file count.

Preserve discoveries that materially shorten the next task: a compatible capability
and its limits, an easy-to-miss registration path, or a verified build/test procedure.
Include source/revision or last observation and what change would require rechecking.
Keep unconfirmed assumptions separate. Prefer a small correction to an existing owner
over leaving reusable facts only in a long task log or creating a duplicate manual.

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
