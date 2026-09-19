# Workspace layout and ownership

[中文](../zh-CN/workspace.md)

Start with the existing repositories and the requirement. A workspace is the place
from which a delivery is coordinated, not a new development environment or a required
repository layout. One repository can be its own workspace. Several repositories can
share a separate coordination directory without moving or reinitializing them.

Choose locations by who owns the information, what changes with it, and who needs to
read it. Do not create files just to complete a directory tree.

Known project locations should be resolved from the existing entry, not supplied anew
for every task. Keep shared project identity separate from machine-specific locators
and the current checkout choice; see [context reuse](project-context.md).

## What belongs in a source repository?

Durable facts that change with one repository usually belong with that repository's
owner: interface contracts, invariants, build/test procedures and operating constraints.
Keep code-coupled documentation under the same version and review process when useful.
An existing team documentation system can remain canonical; link it rather than
creating another authoritative copy.

**clinx does not require a new `AGENTS.md`, `docs/` directory, system map or Skill
installation in each source repository.** The file names below are conventions, not
prerequisites. Creating an instruction file is optional; following existing applicable
instructions is not. Check the agent host's discovery rules, and explicitly read the
instructions relevant to every repository being accessed. Do not assume a workspace
entry automatically loads a sibling repository's instructions.

| Situation                                               | Maintain the information where                                                     | What the agent does                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| An owned repository already has useful guidance         | Its existing canonical files or documentation system                               | Read and link them; correct relevant inaccuracies through normal review                               |
| An owned repository lacks a useful fact                 | Its code/tests, or a small owner-reviewed document if future work benefits         | Investigate first; add only information worth maintaining                                             |
| A read-only, third-party or separately owned repository | The owner's originals; source-qualified observations in the coordination workspace | Record the source, revision/date, uncertainty and when to recheck; do not invent owner-approved rules |
| A relationship spans repositories                       | A shared map under the relevant team's ownership                                   | Link rule/state/interface owners and consumers without duplicating their contracts                    |
| A decision applies only to one delivery                 | The task's current agreement or design                                             | Keep it with that task; promote a reusable discovery only through its owner's review                  |

Missing Markdown is not a blocker by itself. Code, tests, CI configuration and native
tools can establish the relevant facts. But missing required semantics, authority or
access is still a gap: optional documents do not make investigation or acceptance
optional. When implementation disagrees with a contract, distinguish observed behavior
from intended behavior; resolve a material conflict with its authority instead of
assuming either file is automatically correct.

## Choose the smallest layout that fits

For one repository or a monorepo, use that checkout as the workspace. Reuse its
existing documentation locations and instructions. If using the CLI, its configuration,
task records and generated results live at that workspace root.

For cross-repository work, a separate coordination directory avoids putting shared
task decisions under an arbitrary source repository. Siblings are a convenient
default; repositories can also be nested in an existing workspace. clinx resolves
configured source paths, not a prescribed directory name or front-end/back-end split.

```text
business-work/                        existing local parent; no Git required
  delivery/                          coordination workspace; CLI --root points here
    AGENTS.md                        optional host entry; reuse an existing one
    .agents/skills/clinx-delivery/    installed with clinx init --agent codex --apply
    .agents/skills/clinx-knowledge/   same managed installation; reuse if already available
    knowledge/                       optional shared navigation, not a second codebase
      system-map.md                  links capabilities and their owners
    clinx.config.json                when using CLI records, not needed for init
    clinx/agent-entry.md              optional entry supplied by Skill installation
    .clinx/install/state.json         local Skill version, baseline and file ownership
    .clinx/install/backups/           private originals retained by Skill update/removal
    clinx/tasks/change-123/
      contract.json                  CLI task agreement
      prd.md                         optional local requirement; may be an existing reference
      design.md                      optional task-specific investigation and decisions
      checkpoints/                   created only when saving CLI handoff notes
      revisions/                     created only when revising a CLI task agreement
    .clinx/                          generated CLI runs/evidence; private by default
  repo-a/                            independently owned checkout
    AGENTS.md                        only if the repository uses one
    docs/                            existing repository docs, if any
    ...                              source and native project files
  repo-b/                            another checkout; no new docs required
    ...                              source and native project files
```

Without the CLI, `clinx.config.json`, `contract.json`, checkpoints, revisions and
`.clinx/` are unnecessary. Use the Skill through the host's supported discovery
mechanism. Without a recurring cross-repository need, `knowledge/` is unnecessary too.
Domain guides, glossaries, flow maps and operation guides are useful when they answer
repeated questions; they are not a mandatory first-task scaffold.

Configuration can declare at most 64 sources. Fingerprinting remains bounded per
source (50,000 entries and 128 MiB) and across one task (200,000 entries and 512 MiB),
and sources are scanned sequentially. These are safety ceilings, not a recommended
workspace size. Narrow `inputs` and `exclude` to material files; reuse project-native
graphs and affected checks instead of listing an entire organization as one task.

If repositories are nested under a versioned coordination workspace, keep their
checkouts out of its tracked files, or use the team's established repository-management
mechanism. Do not accidentally vendor source histories or introduce submodules only
for clinx. Private requirements, decisions and useful knowledge can be versioned in
an appropriately private repository; they do not belong in the public clinx checkout.
Keep credentials out of both. `.clinx/` is a local record location, not a security
boundary; control access and retention, and redact before sharing.

When using CLI-managed Skill installation, preserve `.clinx/install/state.json`
locally; it enables safe updates and is not task acceptance evidence. Do not commit it.
Keep `.clinx/install/backups/` private. Installing the CLI globally does not create
these files in every source. See [installation and lifecycle](installation.md).

## Name a task for retrieval and continuity

Name one intended outcome, not every message, session or workflow stage. Continue
the existing task when its outcome remains the same; use a separate, linked task for
an independently acceptable outcome. Shared terminology or a shared PRD alone does
not establish identity. A small conversational task needs no CLI record just to get a name.

| Surface                    | Recommended convention                                                | Example                                                   |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Human title                | Object + intended outcome or specific problem, in the user's language | Prevent duplicate invoice submission                      |
| Stable task ID             | Fixed creation date + lowercase ASCII kebab-case topic                | `2026-09-18-invoice-submit-dedup`                         |
| CLI task directory         | Preserve the ID as the directory name                                 | `clinx/tasks/2026-09-18-invoice-submit-dedup/`            |
| Git branch, when needed    | Repository policy, with a task link or ID where useful                | `fix/invoice-submit-dedup` if that repository uses `fix/` |
| Task artifact, when useful | Its information role within the existing task home                    | `design.md`                                               |

Put distinguishing domain terms early in the title. Add a qualifier only when it
separates plausible alternatives. "Investigate invoice submission timeouts" describes
an investigation; "Optimize invoices" does not say which problem is in scope. A title
names intended work, not proof that it is complete. Avoid asserting an unverified root
cause or prescribing an unsettled solution. Do not add routine stage, status, owner,
model, "latest" or "final-v2" prefixes/suffixes. Keep those facts in their existing
progress or metadata home. No exact word count has been established as optimal.

Use one convention for every new persistent task: `YYYY-MM-DD-<short-topic>`.
The prefix records the task's creation date in the workspace's agreed timezone; it
never changes when work resumes, a deadline moves or the task is reopened. Use
recognizable lowercase ASCII kebab-case for the topic, not a Chinese title stripped
into an empty slug. Keep external issue keys and canonical links in the agreement
or note; having an issue does not change the directory convention. Do not treat task
`context.path` as a URL: it binds local files. The agent prepares the ID without a
naming form from the user. A host conversation ID and a clinx task ID remain separate.

Before creating a record, inspect plausible existing tasks and case variants. Reuse
the same task when appropriate; otherwise add a meaningful topic qualifier. Do not
reuse an old ID for unrelated work, overwrite a collision or depend on case alone.
The date is not a uniqueness guarantee. Recurring tasks follow the same convention:
`2026-10-03-access-review-2026-09` means a task created on October 3 to review September.
The review period is a topic qualifier, not a different meaning for the prefix.

Use the full dated string as both the CLI ID and directory name, for example
`clinx/tasks/2026-09-18-invoice-submit-dedup/`. Keep the CLI layout flat at
`clinx/tasks/<id>/`; nesting tasks under year/month directories is not supported.
CLI task contracts currently have no task-level `createdAt` field; checkpoint timestamps
are handoff times, not creation times. The prefix helps browse newly named tasks
lexically by creation day; mixed legacy IDs do not form a complete chronology.
Preserve existing IDs and history rather than infer dates from filesystem modification
times or rename old tasks for style. The new convention is guidance, not a schema change.

Track owner, priority, due date, milestone, dependencies and progress in the existing
tracker or task note. They can change without renaming the task. Do not add unsupported
fields to `contract.json`, move tasks between status directories, or turn a deadline
into a permanent ID. A directory date is neither a schedule nor evidence of completion.

The current CLI accepts 1–96 ASCII characters matching
`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$`; this compatibility boundary is broader than the
recommended style. Preserve existing valid IDs. Avoid filesystem reserved names
such as `con`, `nul` and `com1`, and do not assume an accepted task ID is a portable
filename or a valid Git branch. When creating a branch, check it independently with
`git check-ref-format --branch BRANCH`; follow any additional repository policy.
One task can span repositories and branches without changing its ID.

For ordinary working branches without an established naming policy, use
`<type>/<short-description>` or `<type>/<issue-key>-<short-description>`, for example
`fix/invoice-submit-dedup` or `fix/acct-1842-invoice-submit-dedup`.
Choose `feat`, `fix`, `refactor`, `docs`, `test` or `chore` for the actual change;
use `perf`, `build` or `ci` when the distinction helps. Keep descriptions in lowercase
ASCII kebab-case; preserve an issue key's exact form when a tracker requires it.
Keep agent/model names, routine dates and progress markers out of branch names.
Use `release` or `hotfix` only when the project's release process gives them meaning.
This is a recommended convention, not a Git standard or a new branching strategy.
Existing CI, branch protections and issue-linking rules take precedence: for example,
GitLab's documented automatic issue linking expects the number at the start, such as
`1842-invoice-submit-dedup`. Do not assume a key anywhere in a name links an issue.
If CI derives artifact tags from a branch, use its supported sanitized slug rather
than a raw name containing `/`. See [GitLab branch rules](https://docs.gitlab.com/user/project/repository/branches/).

`task revise` keeps the ID fixed. A useful title correction is possible through a
reasoned revision, but the title participates in the task digest: even a title-only
change makes earlier matching bindings differ. Inspect continuity and affected
evidence before reuse. Cosmetic host-title edits alone do not rewrite the CLI contract.
Do not move the directory or create a replacement task merely to refresh its wording.
See the [agent procedure](../../skills/clinx-delivery/references/continuity.md).

## Keep task inputs separate from task outputs

Use one current agreement. For a small task, the requirement and decisions can remain
in the conversation or one document. Split investigation, design or implementation
planning only when their size, ownership or review cadence warrants it. Six stage
documents are not six mandatory deliverables.

For consequential choices about shared behavior, persistent state, compatibility,
security or recovery, retain a reviewable design before implementing those choices.
Reuse an existing RFC, PR or approved design; neither a `design.md` filename nor a new
approval click is universally required. Required human decisions follow the actual
agreement and project policy. Reviewability, effective approval and release authority
are separate; see the [design review reference](../../skills/clinx-delivery/references/design-review.md).

| Information   | Separate it when                                                               | Keep clear                                                                   |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Investigation | Understanding the existing system needs its own review or substantial evidence | Observed revisions, inferences and unknowns; a historical snapshot           |
| Design        | Consequential choices need a stable review target                              | Reasons, affected owners, acceptance and an identifiable reviewed revision   |
| Execution     | Milestones, dependencies or resumption need a persistent record                | One current progress home, with or without the CLI                           |
| Operation     | Operators, targets or release timing differ                                    | Feasible migration and recovery in design; concrete actions before execution |

These are information roles, not a required file set or CLI schema. Directory names
such as `knowledge/`, `docs/` and `tasks/` do not establish ownership or freshness.
Keep current guidance maintained, preserve historical decisions with supersession
links, and distinguish rebuildable indexes from original observations that cannot be
recreated. Before handoff, reconcile the actual result with the effective design and
original acceptance; rewriting the design is not approval of a deviation.

When using the CLI:

- `--root` selects the coordination workspace. Each `sources[].path` identifies an
  actual checkout, relative to that root or absolute; a check runs in its declared
  source and `cwd`. A source can be a repository or another real dependency directory.
- `clinx/tasks/<id>/contract.json` is the CLI's task location. Existing PRDs and designs
  can remain elsewhere; reference them instead of copying them for the directory tree.
- Configuration `context` is navigation, filtered by focus and by task source scope
  for source-owned entries. Workspace entries remain eligible. Navigation alone does
  not bind the file's bytes into acceptance.
- Task `context` binds the referenced files' bytes. For example, use
  `{ "source": "service", "path": "docs/contract.md", "why": "Consumer contract" }`
  to bind the owning repository's file directly. A workspace-owned path is relative
  to `--root`, not to the task directory. These local references do not track changes
  behind a URL; check the effective upstream version when relying on remote material.
- Include all material dependencies in task `sources`, including reused sources that
  will not be edited. When a task is saved without `sources`, clinx resolves and
  persists the current source set; later workspace additions cannot silently widen
  that task. This is evidence scope and navigation selection, not an access-control
  boundary.
- Select meaningful source `inputs` and exclude generated results. Do not bind a
  constantly appended validation log as a design input, or assume `knowledge/` and
  task directories are automatically excluded. A changed bound design should require
  rechecking acceptance; writing a receipt should not invalidate that same receipt.

See the [CLI reference](cli.md) for exact fields. Source scope records what was
declared; it cannot prove that investigation found every dependency. Source paths
are local locators; verification identity binds source IDs, selectors, checks and
content, so moving an unchanged checkout does not by itself invalidate a receipt.

## Parallel work and resumption

A different task ID separates records, not code changes. Different coordination
directories can still point to the same checkout. For concurrent implementation,
use the existing host/Git worktree mechanism or arrange non-overlapping writes with
one integration owner. For independent deliveries that need different revisions of
the same repository, use separate coordination roots with source paths pointing at
their respective checkouts. Do not switch a shared source path underneath another
active task: source paths are workspace-wide, not task-specific.

Separate checkouts do not isolate ports, databases, accounts or deployed targets.
Establish the relevant identities, test data, concurrent-use limits and cleanup
ownership. Integrate and verify the combined change before claiming completion;
passing isolated branches is not integration acceptance. On resume, inspect current
revisions, dirty files, pending decisions and relevant remote state before reusing a
checkpoint. clinx records do not lock other agents' editors or enforce platform policy.

## Start from a PRD and repository addresses

1. Read the original requirement, obtain authorized access, and inspect existing
   checkouts, revisions and applicable instructions. Do not rewrite source docs to
   make onboarding pass.
2. Use the existing checkout for one repository, or choose a coordination directory
   for cross-repository work. Load the Skill through the host; initializing every
   source is unnecessary.
3. Trace the required path and its consumers. Reuse owner documents; keep only useful
   cross-repository links and source-qualified findings in the workspace.
4. Agree on the outcome, evidence and authority. Record material design decisions;
   if using the CLI, draft the source/check configuration and task references from
   the investigation, then review the execution preview before running checks.
5. Implement and verify the actual path. Retain task evidence separately; update
   durable knowledge at its canonical owner when the change makes that useful.

The [multi-source example](../../examples/multi-source/README.md) implements this
layout with an actual HTTP consumer, an owned service contract and a reused policy
source with no documentation scaffold. The [hands-on tutorial](hands-on.md) shows a
complete requirement-to-verification session. See [adoption](adoption.md) for Skill
installation and [collaboration](collaboration.md) for confirmation boundaries.
