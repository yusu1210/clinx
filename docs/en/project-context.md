# Reuse context without repeating setup

[简体中文](../zh-CN/project-context.md)

Once the project is known, a normal request can be: “Implement this PRD for our
noticeboard; confirm the key design, verify locally, do not deploy.” Repository
locations, knowledge entry URLs and technical configuration need not be supplied again.
The agent resolves them from the current project/task, existing knowledge entry and
local bindings. This is a Skill procedure, not a CLI that searches private systems.

## Connect an entry once

Use the current repository instructions, team project directory, existing workspace
map or approved knowledge access. If nothing is discoverable in a new host, supply one
anchor: the project, business domain or knowledge entry. Let the agent investigate and
retain useful links within authority. Do not prepare a company-wide inventory first.
An installed Skill supplies the method; it does not automatically know private locations.

For example, an existing team index might contain this small navigation entry:

```text
Noticeboard / public announcements:
  Rule owner: public-notices (canonical project link)
  Consumer: notice-reader (canonical project link)
  Contract and run guide: links to their existing owners
```

This is an illustration, not required syntax or a generated platform binding. Local
host/workspace settings separately locate those project identities on this machine.
Use an existing format; no new file is required. Relative paths fit a stable workspace
layout; absolute paths can be useful locally but are not portable team facts.

## Keep the information with its owner

| Information                                                          | Keep it in                                      | Recheck when needed                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Business aliases, capabilities, repository identities, relationships | Existing shared project index or owner platform | Relevant ownership, contract or repository migration                |
| Local checkout paths and coordination root                           | Existing machine/workspace bindings             | Machine move, missing path or identity mismatch                     |
| Selected branch/worktree, dirty changes, processes and data          | Current environment and useful task handoff     | Before actions depending on that state, and after relevant changes  |
| Build/test/run procedure                                             | Existing project guide, scripts and CI          | Relevant definition, dependency, target or runtime change           |
| Collaboration preferences and standing authority                     | Applicable agreement or native policy           | Changed scope, validity, identity, revocation or mandatory control  |
| Task-specific approval and execution observations                    | Task/native platform records                    | At the dependent operation; never promote into permanent permission |

The agent checks identity using available project/VCS metadata and source facts, not
just a directory name. A matching remote identifies a repository, not the right worktree.
Git is not mandatory. Credentials, credential-bearing URLs and personal filesystem
details do not belong in shared or public knowledge.

A stable repository identity does not establish a fixed consumer set or current runtime
state. Recheck relevant registration, routing, target configuration and effective access
when the next decision depends on them, even if code is unchanged. A saved platform
observation applies to its target and time; it is not continuing permission to operate.

## Everyday cases

| Situation                               | Agent action                                                                             | User involvement                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Another requirement for a known product | Retrieve relevant owners and reuse local bindings                                        | New intent and changed constraints only                      |
| Small familiar fix                      | Read affected code and focused tests; no full survey or record scaffold                  | Actual unresolved choices only                               |
| Several repositories                    | Follow related owners/consumers; select this task's subset                               | Resolve ambiguous product scope, not every source ID         |
| New project in a known organization     | Reuse relevant standards and access procedures, then create an authorized runnable slice | Product choices, target location only if not determined      |
| New machine or moved checkout           | Follow known local relocation and confirm identity                                       | Missing local anchor if authorized context cannot resolve it |
| Wrong project at a saved path           | Stop relying on that locator; inspect known alternatives                                 | Clarify when the correct project cannot be established       |
| Multiple copies or worktrees            | Honor the current agreement; preserve unrelated work                                     | Choose between materially ambiguous candidates               |
| Interrupted task                        | Resolve intended task and current changes; do not replay old operations                  | Ambiguous selection or changed decisions only                |
| Knowledge service unavailable           | Use accessible source and current authoritative materials                                | Only missing facts/authority that block the next action      |
| Read-only dependency                    | Inspect it and keep qualified notes at an authorized location                            | Owner coordination for a necessary change                    |
| Repeated check or deployment command    | Reuse the reviewed procedure, inspect relevant changes and current target/authority      | Held approval, not repeated confirmation of every argument   |
| Stale or contradictory guidance         | Check affected premises; propose or make an authorized correction at its owner           | Unresolved business meaning or shared publication approval   |

A unique, well-supported selection can proceed within authority, with scope visible.
If investigation leaves several materially different candidates, ask one focused question
with the choices. Do not equate fewer questions with better behavior: guessing a write
target is worse than a necessary clarification. Avoid full-disk searches, reading all
knowledge, repeated setup diagnostics or refreshing every graph before a small task.

## How Skills, knowledge and CLI fit together

`clinx-delivery` and `clinx-knowledge` carry the same
[context-resolution rules](../../skills/clinx-knowledge/references/project-context.md).
Knowledge supplies navigation and qualified facts; the agent checks current applicability
and uses the existing tools. Read access does not authorize knowledge publication or
project operations. Keep enterprise bindings outside the portable Skill distribution.

If CLI records help, reuse `clinx.config.json` and its reviewed checks. Explicitly select
task `sources` when the configuration contains unrelated projects; omission binds all
configured sources. The knowledge catalog can be broad, but a task configuration is
not a copy of that catalog. Include unchanged material dependencies, not just edits.

Config `context` is navigation. Task `context` binds local file bytes. Link the relevant
owner and retain version-qualified decision evidence; do not bind an entire knowledge
collection or append-only task log. URLs alone do not track remote changes. A locator
change does not authorize a new target or make prior evidence current. Active tasks that
need different revisions should use separate coordination roots, not switch shared bindings.

`status`, `inspect` and `context` provide local diagnostics/navigation; they neither
resolve a business name from a remote knowledge service nor choose a project for you.
The agent performs that procedure. No new registry, database, graph or CLI initialization
is necessary just to remember project locations.

## Verify that reuse works

Give a fresh session only the normal workspace entry, realistic request and complete
Skill—not the answer's repository path. Check correct identity, relevant dependencies,
appropriate questions and preservation of other work. See the original
[context exercises](../../evals/context/README.md). Their preparation tests validate
inputs, not agent outcomes or measured savings. Include real worktree/access/provider
failures before claiming those cases were tested. Keep quality and safety as acceptance
conditions; measure repeat input, total investigation and maintenance work separately.
