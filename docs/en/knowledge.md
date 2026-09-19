# Engineering knowledge that survives the next task

[简体中文](../zh-CN/knowledge.md)

Use `clinx-delivery` for a requested software change. Use
[clinx-knowledge](../../skills/clinx-knowledge/SKILL.md) for a scoped investigation,
reusable findings, knowledge organization or revalidation. Both use the same knowledge
rules and work without the CLI. Neither requires a graph engine or a new knowledge base.

## Start with a project and a question

After [installation](installation.md), give the agent:

> Use clinx-knowledge. Project: [path or approved repository]. Investigate how this
> system exports data and applies retention. Reuse current documentation and correct
> useful guidance at its existing owner. You may read source and run existing local
> tests. Do not change product code, policy, shared systems or publish anything.
> Report evidence, contradictions, unexamined boundaries and how the next task can
> find the result. Ask only about material decisions or access you cannot resolve.

For known projects, use the current entry and local bindings instead of providing paths
again; see [context reuse](project-context.md). For a new context, supply the missing
project or knowledge anchor and reuse an existing coordination directory.
The agent traces only the requested slice and links source-owned facts. It should not
move repositories, create identical docs everywhere, or ask you to supply a code map.

| Request                                         | Intent   | Expected result                                      |
| ----------------------------------------------- | -------- | ---------------------------------------------------- |
| Explain a domain's entries, rules and consumers | Build    | Scoped, source-backed navigation with gaps           |
| Retain what this task taught us                 | Capture  | A useful test, procedure or finding at its owner     |
| Reconcile these overlapping guides              | Organize | One maintained entry with conflicts preserved        |
| Recheck guidance after this change              | Maintain | Retained, corrected, unresolved or superseded claims |

These are choices, not a four-stage approval workflow. Existing ownership and review
rules apply. Publication to shared knowledge or production operations needs its own authority.

## Walk through an original case

From a reviewed clinx source checkout:

```sh
node evals/knowledge/prepare.mjs
```

For an installed package, `clinx resources --json` locates `skills.knowledge` and the
guides. The preparation script is `evals/knowledge/prepare.mjs` under that package root.
Preparation creates a fresh temporary project and returns `workspace`, `request`,
`retrievalRequest` and an evaluator path. It installs nothing and runs no model.

Give a fresh agent the workspace, returned request and the selected Skill; keep the
evaluator file and the explanation below out of its inputs. The exercise uses a small
JavaScript module for reproducibility, not as a required language or architecture.

The raw project includes:

- a normal README entry linking an operations guide;
- a quick reference repeating the stale guidance, reachable from the same entry;
- an old guide saying JSON export needs a new implementation;
- current CSV and JSON implementations with export tests;
- a newer approved seven-day retention policy, while code returns fourteen days.

The correct result is not another exporter and not a rewritten policy. The agent
should correct the stale capability claim, distinguish the retention defect from the
intended rule, and preserve the unresolved conflict in useful guidance. Existing export
tests may pass without proving retention compliance. Product code stays unchanged because
this request authorizes knowledge work only.

Inspect the changes, protected files and actual observations using the evaluator's
criteria. Do not grade by matching a preferred document heading or prose style.

After saving and reviewing the run, prepare the next checkpoint:

```sh
node evals/knowledge/prepare.mjs --after /path/to/previous/evaluator.json
```

Each call creates a new workspace and request, carries the agent's actual guidance
without repairing it, and leaves earlier workspaces intact. Give a fresh session only
that workspace, its returned `request` and the selected Skill. Evaluator files and
snapshots stay outside candidate access. The second checkpoint is read-only retrieval:
the agent must find the answer through the normal entry, not an evaluator-supplied path.

Continue the same way through a behavior-only change, a newly registered consumer while
the producer is unchanged, unavailable consumer source, a configuration-only change to
effective batch retention, and a historical observation that must not become current advice.
The final request restores
the source and authorizes implementation: use `clinx-delivery` to correct all registered
paths, preserve existing export behavior and add regression tests. This connects knowledge
to a later delivery instead of grading documentation alone. The synthetic fixture models
retention values, not production storage or elapsed-time cleanup.

Preparation runs no model or product code and does not award a pass. It rejects protected
input changes and unsafe or oversized copies; its separation is not an OS sandbox.
Stop writers before advancing and retain failed responses and traces. See the
[evaluation protocol](../../evals/knowledge/README.md) for the checkpoint sequence,
scope, limits and independent acceptance criteria. One trajectory is not eight independent
samples or evidence of general improvement.

## Put the result where it belongs

Do not create a `knowledge/` directory just to use this Skill. Prefer existing owners:

| Finding                                   | Natural home                       |
| ----------------------------------------- | ---------------------------------- |
| Reproducible failure                      | Regression test                    |
| Repeated mechanical step                  | Existing tool or focused procedure |
| Design reason and accepted tradeoff       | Design/decision record             |
| Entry, rule owner and consumer navigation | Small system map                   |
| Temporary task choice                     | Task record                        |

Keep purpose, applicability, evidence and recheck conditions discoverable in existing
prose or metadata. A source-local rule stays with its repository or team owner; a
workspace map links cross-source relationships. For read-only sources, keep a qualified
observation or proposed correction instead of pretending it is approved guidance.

An implementation observation, intended rule, inference and authorized decision are
different claims. When they conflict, determine what changed; do not automatically
prefer code or documentation. Historical approvals never authorize new operations.

Source freshness, evidence support, applicability and authorization are separate.
Versions and hashes come from observed sources, not model-generated identifiers; matching
bytes do not prove the conclusion. For a claim about all consumers, inspect relevant
registration and relationship changes too: a new consumer can invalidate a system-wide
conclusion without changing the cited producer. Recheck the affected scope, retain valid
findings and correct the normal retrieval entry, not just a hidden duplicate.

For consequential guidance, distinguish the evidence supporting it from the scope that
could invalidate its use. An unchanged consumer file supports that known relationship;
it does not prove no new consumer was registered. Retaining untouched guidance is not a
new confirmation. Before promoting an update, recheck material source/target changes and
the owner's current content; use revision-conditional writes or review when available.
Rechecking alone is not a transaction across sources. If freshness cannot be established,
retain a qualified observation and hold only the dependent promotion.

Correct affected links, quick references and generated summaries within authority; report
unreachable projections. Keep historical evidence but do not revive obsolete advice in
later summaries without current support. Rebuildable excerpts and authorized snapshots
are useful when clearly source-bound, not independently maintained authorities. No claim
database or new knowledge CLI is required for these practices.

## Use code intelligence when it helps

Start with available search, source reads and language tools. For a consequential change
with shared consumers, an already verified low-cost relationship binding is required
for the impact check; when no usable binding exists, native search and source navigation
must produce the equivalent candidate inventory. Add relationship queries for many
consumers, transitive impact or hard-to-follow boundaries; semantic explanations can
help with unfamiliar terminology. Small local changes do not require building an index.

The packaged [usage reference](../../skills/clinx-knowledge/references/code-intelligence.md)
describes native search/LSP, codebase-memory-mcp as a candidate to check against source, and GitNexus
as an optional specialist for process-flow analysis. It is not an installation recipe
certified for every version. clinx does not install or configure these tools.

For the chosen version, establish the actual root/worktree, indexed inputs, update
result, query limits and missing coverage. Read its help and relevant project bindings.
If it cannot establish freshness, inspect the current source or refresh within authority.
Preserve whether uncertainty came from failure, staleness, unsupported input, ambiguity
or truncation. No edge found does not prove no consumer exists.

Verify consequential links against current source, actual schema and consumer behavior.
Graph field checks do not replace nested/type/nullability/unit compatibility tests.
Runtime observations cover the observed environment and workload, not every possible path.
One main relationship backend is usually enough; use an independent technique for a
material disagreement, not a majority vote between correlated indexes.

## What the CLI does and does not do

`clinx init` installs both Skills; `clinx skill status/update/remove` manages their
files together. Either complete Skill folder can also be used independently.
`clinx resources` locates the packaged assets. Existing task/context/evidence commands
remain optional for delivery continuity; a knowledge-only request needs no artificial task.

There is no `clinx knowledge` command, graph provider registry, automatic correctness
score or semantic freshness verdict. Provenance and retrieval are part of the agent's
work. The [evaluation guide](evaluation.md) separates mechanical tests from agent effects;
neither document generation nor a small exercise establishes general improvement.
