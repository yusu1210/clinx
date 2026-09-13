# Architecture and boundaries

[中文](../zh-CN/architecture.md)

## Ownership

```text
User request + existing project
          |
          v
Host agent + clinx-delivery Skill -----> existing code/browser/enterprise tools
          |
          +---- optional CLI
                  |-- task contract + revision history
                  |-- static command/docs candidates (no execution)
                  |-- local Skill ownership, updates and recovery
                  |-- checkpoint + focused context index
                  `-- check execution -> observations -> applicability -> claim
```

The Skill directs engineering attention. The CLI contains no model calls, provider
SDK, conversational planner, environment installer or automatic phase progression.
Enterprise adapters are project-owned command/procedure configurations, not plugins
that must implement a universal corporate API.

`inspect.ts` owns static discovery. It reads bounded files in explicitly selected
roots without importing them or executing package scripts, Maven or shell probes.
Candidates and diagnostics are not persisted configuration or readiness verdicts.
The agent inspects the real procedure and decides whether an action is needed and
authorized. See [inspection semantics](cli.md#static-inspection-before-onboarding).

## Repository layout

The clinx source repository is not the workspace template for a user's application.

```text
clinx/
  skills/clinx-delivery/    portable instructions and progressively loaded references
  src/                     optional CLI implementation
  bin/                     executable entrypoint
  npm-shrinkwrap.json      one dependency lock for development and CLI distribution
  schemas/                 generated JSON Schemas; models live in src/schema.ts
  templates/workspace/     optional files for a user's coordination workspace
  examples/                runnable, completed synthetic examples
  evals/                   raw tasks, preparation and evaluator-owned acceptance checks
  test/                    regressions for clinx and its examples/evaluators
  scripts/                 build, documentation, package and release checks
  docs/en/                 English user guides
  docs/zh-CN/              corresponding Chinese guides
  .github/                 repository CI and dependency updates
  clinx.config.json         this repository's self-check configuration
  clinx/tasks/project/     this repository's self-check agreement
  dist/                    generated CLI build, not maintained source
  artifacts/               local release candidates, ignored and never published implicitly
```

`examples/` shows how completed pieces work; `evals/fixtures/` supplies unfinished
inputs for an independent delivery exercise. Keep evaluators and solutions out of
candidate task inputs. Neither directory contains production qualification results.
Root README, contribution, security and changelog files remain standard repository
entrypoints. The Skill's instructions are maintained in one place; host-specific display
metadata does not change its method or require that host.

## User workspace

A workspace is the local coordination root selected by `--root`. It can contain
one or more sources, including sibling repositories or a directory of requirements.
It need not be a Git repository. Sources retain their own code, domain facts and
procedures; a workspace map links those owners instead of copying their documentation.
`workspace.ts` resolves sources and file references; `task.ts` owns task records and
continuity; `install.ts` owns optional Skill file installation and lifecycle.
`commands.ts` owns discoverable command help, `output.ts` presents one result as text
or JSON, and `resources.ts` locates packaged assets and copies examples into new
directories without executing them. None plans or schedules agents.

| Artifact                              | Owner and meaning                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `clinx/installation.json`             | Skill placement, version, baseline hashes and file ownership; not an attestation     |
| `clinx/install-backups/UUID/`         | Original files and installation record retained before managed replacement/removal   |
| `clinx.config.json`                   | Workspace: explicit source roots/inputs, context routing, reviewed check definitions |
| Existing maps and guides              | Maintained by their owners: source facts, navigation and operating procedures        |
| Optional workspace map or guide       | Cross-source navigation and coordination procedures; links to existing owners        |
| `clinx/tasks/ID/contract.json`        | Task: outcome, scope, invariants, decisions, authority, obligations                  |
| Contract `context` references         | Task: local design content included in the contract binding                          |
| `checkpoints/NNNNNNNN.json`           | Immutable handoff note with input digests; not a task-completion flag                |
| `revisions/*.json`                    | Previous JSON contract and revision reason/digests; no code rollback                 |
| `.clinx/runs/UUID/receipt.json`       | Local execution record; not signed or independently attested                         |
| Sibling stdout/stderr/XML             | Bounded private evidence artifacts retained for inspection                           |
| `.clinx/evidence/ID/UUID/record.json` | Observer assertion and copied artifacts, bound at capture time; never a verdict      |

Delivery-record Zod definitions in `src/schema.ts` are the model source. `npm run build` generates
JSON Schemas. CLI validation adds cross-reference, uniqueness and filesystem checks;
JSON Schema shape validation alone is not equivalent. Markdown holds reasoning;
JSON holds machine records. The supported interfaces are the Skill, CLI, and JSON
schemas; the JavaScript modules are not a public SDK.

`clinx/` holds optional workspace guidance and task records; `.clinx/` holds
generated execution logs and captured attachments. Neither name implies public
content: protect private task records as well as logs. A **workspace** coordinates
delivery; a **source** supplies declared inputs. Neither has to be a Git repository.
`validate` checks structure and references; `verify` evaluates a selected claim
against its obligations. A **receipt** records one execution; an **attachment**
preserves an observation without certifying it. See the [CLI reference](cli.md).

Maps and guides have no mandatory location or filename. Add the
[workspace templates](../../templates/workspace) only for missing, useful knowledge;
source repositories do not require separate initialization or documentation scaffolds.
See [workspace ownership](workspace.md).

## Binding and recovery

Task digest hashes normalized task JSON plus the contents of explicit task context
files. A reference `{ "source": "service", "path": "docs/design.md" }` reads the file
inside the named source; omitting `source` selects the workspace root. References
cannot escape their root or traverse symlinks. Source fingerprints hash
declared local paths, contents and executable bits. Canonical JSON keys and source
paths sort by UTF-16 code units, independent of locale or Unicode collation rules.
Receipts capture before/after fingerprints; reconciliation checks current fingerprints
and artifact hashes. Checkpoints compare the task, relevant definitions and source bindings.
Input lists are explicit and have no default. Only project-declared exclusions apply;
an explicitly included path cannot itself be excluded. Previews expose these selectors.
No directory name or gitignore rule silently changes the scope. Context and task
record operations refresh project configuration instead of trusting a retained object.

Task `sources` selects the relevant source IDs; omitting it conservatively includes
all configured sources. Include dependencies and consumers, not only modified sources
or the check's working directory. All check and source-owned task context references
must belong to that scope. Revise the task when investigation changes the scope.

`definitionDigest` binds source selectors (including paths and exclusions) and operative
check definitions. Receipts bind only the selected claim's checks. Their `definition`
snapshot retains the relevant source selectors and selected checks together; its digest
and internal references can be checked independently of today's configuration. Damaged
definitions leave interpretation unknown, not a reconstructed pass. Valid historical
definitions still describe that run when current selectors or checks change.
Checkpoints and attachments bind all checks referenced by the task. Navigation, workspace
name and check descriptions do not participate. A config file explicitly included in
source `inputs` still binds its complete bytes; selectors are never silently rewritten.
Reconciliation interprets saved reports with the saved definition, compares current
bindings, and never promotes a stale historical pass. It does not merge receipts or
infer a check dependency graph. A task scope is reviewed input, not proof of completeness.
The receipt also binds its selected claim: changing `--claim` does not promote a
narrow run into broader acceptance, even when some checks overlap.

Tasks and raw runs are separate: a handoff can be useful without verified completion.
Revision creates a new current contract and retains the old one. It does not delete
old receipts or force all work back to stage zero. Current reconciliation determines
whether a historical receipt still applies. No `mark-complete` or `force-pass` exists.

Revision validates the new contract against current checks and reads its references.
It validates the old contract's own structure, internal relations and task identity
without requiring obsolete checks or design paths to remain usable. History retains
the original JSON values in `previous`; `previousContractDigest` hashes that JSON
canonically, not old referenced files. `nextDigest` binds the replacement and its
current references. The CLI does not reconstruct a historical input binding from
today's bytes. Version referenced designs in their existing repository if their old
contents must be recoverable. Corrupt or misidentified contracts require explicit
repair; revision is not a force-overwrite path.

`evidence.ts` retains optional reviewed observation attachments outside the verdict
path. It checks artifact integrity and local capture-time binding, not the target's
actual revision or remote freshness. Historical failures are not overwritten by new
passes. See [evidence](evidence.md) for size, privacy and interpretation limits.

Writes use an exclusive workspace lock. New files are written and synced to a private
same-directory temporary file, then published with an exclusive hard link; record
discovery does not select temporary names. Existing destinations are not replaced.
Writes enforce the same 8 MiB per-file bound as reads. This requires a filesystem
supporting hard links; there is no unsafe overwrite fallback or full power-loss guarantee.
Revisions replace only the explicitly named contract after preserving the previous JSON.
Skill installation preflights conflicts and records ownership. Updates/removal
preflight all managed paths, retain originals, and publish the installation record
last. Handled write failures attempt rollback without replacing concurrent edits.
User-owned files are not adopted, overwritten or deleted. Multi-file writes are not
crash-atomic; inspect the installation record and backups before recovery. Example
copying only creates a new directory and retains a failed partial copy for diagnosis.
See [installation lifecycle](installation.md).
The lock is not stolen automatically after a crash; see [CLI recovery](cli.md#recovery).

Task discovery isolates per-entry errors. A damaged newest checkpoint is reported,
not silently replaced with an older note; context requires reconciliation. A new
explicit checkpoint advances past its sequence and preserves the damaged file.
Record access is separate from source-root resolution: unavailable roots leave
current bindings unknown, while history remains readable. Retired source/check references
also keep structurally valid contracts, handoffs and historical observations readable;
revise the contract against current definitions before new work. Invalid workspace
configuration or corrupt contract structure remains a command error. Operations that capture
new bindings or execute checks require available inputs. See [recovery](cli.md#recovery).

## Result adapters

`exit-code` records whether a command exited zero. It makes no assertion about tests.
`junit` parses bounded XML, rejects DTD/entity declarations, count inconsistencies
and duplicate testcase IDs, records failed/skipped cases, and checks expected IDs
and minimum passing count. It handles Surefire reports and Node's direct testcase
children under `testsuites`. It is a strict subset of the many JUnit dialects;
unsupported output is inconclusive, never silently passing. Nested `testsuite` and
`testsuites` containers are traversed; unknown structural children are rejected.
Receipts retain aggregate counts only. Detailed case identities remain in the saved
XML and are re-parsed on reconciliation, avoiding a second expanded testcase store.

File-based reports must be created or rewritten during the command according to
content/metadata observation. They are copied into the run directory. This guards
against accidentally reusing old reports, not a malicious script rewriting old XML.
Commands preserve argv strings, including empty and whitespace arguments, with a
nonblank executable and no NUL bytes. They use `shell: false`; a command that invokes a shell remains
arbitrary trusted code. Checks execute sequentially within a workspace to limit shared-report
interference, not to implement a distributed job scheduler. Executable resolution
preserves the selected invocation path, including symlinks and child-relative PATH
entries. It does not substitute a canonical target that might change tool behavior.

## Limits

- Execution support is macOS/Linux, Node 22.16+. Method and Skill are host-neutral.
- This is not a sandbox. PATH, environment, credentials and network are inherited.
  Side-effect declarations are review aids and opt-in guards, not enforced policies.
- Local receipts can be forged by a writer with filesystem access. There is no
  remote attestation, CI identity, signed evidence import or tamper-proof ledger.
- A relevant input omitted from `sources.inputs` or explicitly excluded is not covered.
  Declare meaningful code, locks and configuration. For broad scopes, explicitly
  exclude generated outputs and private records; otherwise they are read like other
  inputs. Installed dependencies and remote state are not automatically bound.
- Fingerprints are bounded: 8 MiB per file, 128 MiB per source, 50,000 entries including
  directories; symlink inputs are rejected. These are operational limits, not a full
  snapshot-isolation or hostile-filesystem guarantee. Narrow a large project honestly.
- Source mutation followed by restoration between fingerprint reads can evade detection.
  `current` means declared local bindings match, not remote or toolchain freshness.
  Product version and the CLI runtime recorded at execution are provenance metadata,
  not comparisons with the machine reading the record. `protocolVersion` identifies
  evidence interpretation rules; an unsupported protocol is unknown, never supported.
  Environment requirements need real project checks or platform evidence. No toolchain,
  container or remote environment is automatically locked or revalidated.
- Each stream is capped at 2 MiB. Truncated stdout JUnit is inconclusive. Logs can
  contain secrets; they are not automatically redacted. Do not publish `.clinx`.
- JUnit paths are literal, relative to check cwd; no glob discovery. All skips make
  the check inconclusive. Expected test identity should be set for consequential checks.
- A workspace lock does not coordinate another workspace writing the same sibling
  source, remote jobs, IDE edits or manual commands. Compare inputs and investigate drift.
- No browser automation implementation or enterprise endpoint is embedded. Use the
  host's tools and local guide; external obligations remain unresolved in CLI verdicts.
- Models are versioned and strict. Internal JavaScript modules are not a public SDK.

## Implementation choices

TypeScript/Node provides the CLI runtime, JSON defines validated records, and Markdown
holds human and agent guidance. Execution uses existing project commands. The CLI
keeps a small set of result adapters; project tools retain ownership of other native
formats. New interfaces require a concrete use case, a stable boundary and behavioral
tests. See [contributing](../../CONTRIBUTING.md).
