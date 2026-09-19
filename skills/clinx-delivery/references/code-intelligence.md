# Use code intelligence for the question

Code intelligence is optional. Use a suitable existing tool when it materially reduces
uncertainty; do not install a provider, modify host configuration or index additional
repositories merely because this reference names it.

## Select the shortest useful route

| Question                                         | Useful starting point                                    |
| ------------------------------------------------ | -------------------------------------------------------- |
| Definition, symbol identity, precise references  | Available language service/compiler index and source     |
| Configuration, literals, scripts, error messages | Native search and focused file reads                     |
| Callers, consumers, transitive impact            | Relationship graph, then material source/contract checks |
| Unfamiliar domain or terminology                 | Existing guidance or a source-linked semantic summary    |
| Field type, nullability, units, compatibility    | Actual schema, encoder/decoder and consumer tests        |
| Effective routing, flags, deployment behavior    | Authorized environment observation and configuration     |

These are complementary capabilities, not mandatory layers. A tool name, deterministic
parser or confidence score does not establish accuracy. Language grammar support is not
complete type/framework resolution. Semantic explanations may help form hypotheses;
they do not establish intended behavior or authorize a decision.

Choose against the current bottleneck, not a fixed tool sequence. An empty project
needs a working slice, not an index; a focused change may need only source reads.
Reuse effective tools already available. For a recurring relationship-search problem,
trial one suitable backend with the same native tools and acceptance checks retained.
Judge omissions and delivery outcomes before query speed; include cold indexing,
updates and failures before recommending it for that workspace.

If a useful local tool or index is discoverable only through old experiment logs,
retain a short binding at the workspace's existing navigation entry: executable and
runtime, index location/repository identity, one verified query and refresh limits.
Mark temporary locations as disposable; recheck them before reuse rather than installing
or reindexing automatically. Keep these machine-specific facts out of portable Skills.
An index runner mismatch can differ from source drift; inspect both before rebuilding.

## Bound discovery and retain resolved anchors

Start from the decision the investigation must support. Keep its unresolved questions
beside resolved source anchors in the existing task note; resume from those anchors
instead of repeating the repository survey. Stop expanding a branch once its evidence
supports the decision, unless a changed premise or unresolved consumer requires more.

- Locate a file before reading a guessed path: use a known module and filename search
  such as `rg --files module -g '*Reward*'`, then read the relevant symbol range.
- Search literals with `rg -n -F` in the selected module. Use `rg -l` when only filenames
  are needed. Batch independent queries within an output budget; a truncated result
  needs a narrower scope or file list, not the same broad search again.
- No match is a diagnostic result, not proof of absence. Check spelling, source root
  and ignore rules. Include a specific generated directory when evidence points there;
  do not disable ignores across the workspace by default.
- For dependency-owned definitions, resolve the owning artifact and version from the
  build configuration first. Inspect that artifact or generated source; avoid scanning
  every dependency archive to find one protocol.
- When a lookup or command fails repeatedly, change the hypothesis, scope or tool.
  Save the failed premise so continuation does not repeat it. Separate missing source
  access from an unsupported navigation edge and from genuinely absent behavior.

Record timing or tool counts when diagnosing efficiency. Distinguish navigation,
semantic checks, implementation, verification and waiting; unavailable measurements
stay unknown. Fast lookup alone does not show faster delivery, and a declaration's
existence does not establish lifecycle, idempotency or failure semantics.

## Establish the tool's actual contract

Read the installed version's help and applicable project guidance. Confirm what inputs
it covers, output meanings and side effects. Before using a consequential result, check:

- actual repository root, branch/worktree, source revision and relevant uncommitted edits;
- index generation/version, successful update, exclusions and parse failures;
- exact symbol identity, query direction, depth/limit and cross-source coverage;
- whether a relationship is parsed, heuristically inferred or observed at runtime;
- unsupported constructs, ambiguous matches, truncation and unresolved boundaries.

A full-content retention flag does not prove the returned symbol text is complete.
Check inline truncation markers and whether the relevant branch is present. An
index-time snippet cap cannot be repaired by raising the response token budget; read
the referenced current source range instead. Use a path query to establish a link,
impact to enumerate affected candidates, and source to inspect failure/control flow.

Distinguish a compiler/language-server index from a tool's own type-resolution heuristics;
similar feature names do not guarantee equivalent resolution. Reuse a checked tool
contract until its version, project configuration or observed behavior materially changes.

Resolve checkout metadata at each actual source root, not only the coordination
root. For Git, use repository-aware commands such as `git -C <source> rev-parse
--show-toplevel` and `git -C <source> status --short`; testing for a `.git` directory
misses linked worktrees, and an unversioned coordination directory says nothing
about the repositories beneath it.

If the tool cannot report an item, do not invent it. Refresh within scope or inspect
the relevant current source directly. Preserve the reason for incomplete evidence.
Same HEAD is not proof of the same indexed working tree. A watcher is not a guarantee
that a just-saved edit is already indexed.

## Candidate integrations

No backend is required or designated best. These are usage boundaries, not claims of
completed integration tests; verify the chosen version in the actual environment.

- **GitNexus:** keep as an optional specialist for process-flow views, framework-aware
  symbol context and impact questions when those views justify its heavier index. Check
  the actual repository/worktree, index warnings and cross-boundary coverage. Its result
  is still a candidate set; source, protocol and tests remain authoritative. Use
  index-only mode and external/private storage where supported.
- **codebase-memory-mcp:** inspect indexing status, symbol search and call-path tools.
  Consider it for repeated caller/callee and architecture queries after checking a
  representative relationship against receiver types in current source. Confirm the index generation corresponds to the relevant inputs, not merely
  that status reports the current filesystem HEAD. Use a persistent stdio session when
  multiple queries are needed; one-shot CLI startup can dominate the query time. Resolve
  the exact qualified symbol through search before tracing; do not invent its indexed name. Do not
  treat an accepted request as a durable runtime-graph import without checking
  implementation and persisted results.
- **Understand Anything or generated domain views:** use explanations to select topics
  and source locations. Verify the analyzed root/worktree and whether behavior-only
  changes refresh summaries. Keep inference and source references visible.
- **Existing LSP, SCIP, IDE or enterprise navigation:** reuse working project bindings.
  Confirm build/dependency/index coverage; precise symbol navigation alone does not
  establish cross-service contracts or runtime activation.

### Trial selection criteria

Use these criteria to select a bounded trial. They are starting hypotheses, not a
backend ranking or a reproducible performance result.

| Need                                                                      | Default                                                | Use a graph backend when                                                                              | Avoid or defer when                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| One or a few definitions, literals, filenames, or exact consumers         | `rg` plus the project language service                 | the result set is too broad to inspect safely                                                         | indexing would take longer than the bounded search                                        |
| Repeated callers, callees, or blast-radius questions in one investigation | an already-running LSP or one persistent graph session | several related queries justify the cold index and coverage audit                                     | starting a new CLI process for each query                                                 |
| Cross-module Java/TypeScript call graph                                   | existing LSP or a source-checked graph session         | the index reports the relevant files as parsed and the graph answers a concrete relationship question | dynamic dispatch, generated code, MQ/HTTP, or framework wiring is material and unverified |
| Process flows, framework-aware context or specialist impact review        | source and a checked backend; GitNexus where useful    | process-level views justify the heavier cold index and its warnings are reviewable                    | a bounded search or ordinary caller/callee query answers the question                     |
| Project orientation and generated context files                           | manually maintained project guidance                   | a separate context generator is explicitly authorized to write its files                              | it would write instructions, hooks, or IDE files into a source checkout without review    |

Compare equivalent successful queries with the same symbol, direction, depth and
coverage. Separate process startup, cold indexing and warm queries; include symbol
resolution and failed lookups in total investigation cost. Persistent sessions may
avoid repeated startup, but low query latency alone does not justify a default.
Keep measured numbers with the exact tool identity/version, input revision, query,
raw result and acceptance review in the authorized evaluation record. Do not carry
private or unreproducible measurements into portable instructions as performance claims.

More edges do not establish better coverage: check receiver types, heuristic matches
and material omitted external calls. Resolve and validate one query before repeating
a benchmark; do not rank fast errors as successful searches. These checks do not
require running two backends on every task. A context generator that writes instruction
files or hooks belongs to the authorized project-context workflow; inspect its actual
writes and refresh behavior before adopting it for that purpose.

For any candidate backend, record the version, cold-index time, warm-query time, update
result, parsed/partial/unusable counts, exclusions, generated files and storage path.
Prefer external/private index storage and an index-only mode where supported. A clean
status or a successful request does not prove freshness. Preserve native search and
source/test checks as the fallback and acceptance path.

Use one primary relationship backend by default. A second independent technique can
resolve a high-risk ambiguity; do not average confidence numbers or count agreement
between correlated indexes as proof. Keep tests, contracts and source inspection available.

## Verify the slice, not the graph

For a contract-change investigation, start with a concrete question such as:
"Which consumers depend on this field's units, default or null meaning?" Identify
the actual schema and producer, then use the available tool's symbol/context and
incoming-reference or impact queries to enumerate candidates. Inspect each material
boundary: serialization, client decoding, intermediate caches and asynchronous readers.
Follow unresolved service boundaries through existing protocol and registration sources;
an unsupported edge stays unknown until another source resolves it.

Keep a compact result where the task already records impact: consumer, original source,
relationship basis, verified semantics and remaining check. Reuse this inventory for
consumer tests rather than treating the query response as acceptance. After an edit,
recheck the changed producer and consumers against the current worktree. If the index
is unavailable or stale, continue this investigation using source and language tools;
do not report an empty impact set or block unrelated work merely for lack of a graph.

Use graph results to select likely entries and affected consumers. Follow material
boundaries through actual protocols, registration/configuration, caches and asynchronous
effects. Check unchanged consumers when their behavior can be affected. Missing graph
edges do not justify skipping required acceptance checks.

Treat indexes as replaceable caches. Retain only useful conclusions and source evidence
at their canonical owners, not a second permanent export of the entire graph. Local
indexing does not establish that subsequent model requests, telemetry or other tool
operations keep source private; honor the actual access and data-handling rules.
