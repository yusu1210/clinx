# Architecture and boundaries

[中文](architecture.zh-CN.md)

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

## Canonical artifacts

| Artifact                                 | Owner and meaning                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `clinx.config.json`                      | Project: explicit source roots/inputs, context routing, reviewed check definitions |
| Existing map or `clinx/system-map.md`    | Project: navigation to source truth, not a parallel code database                  |
| Existing guide or `clinx/local-guide.md` | Project: procedures and private platform semantics                                 |
| `clinx/tasks/ID/contract.json`           | Task: outcome, scope, invariants, decisions, authority, obligations                |
| Contract `context` references            | Task: local design content included in the contract binding                        |
| `checkpoints/NNNNNNNN.json`              | Immutable handoff note with input digests; not a task-completion flag              |
| `revisions/*.json`                       | Previous JSON contract and revision reason/digests; no code rollback               |
| `.clinx/runs/UUID/receipt.json`          | Local execution record; not signed or independently attested                       |
| Sibling stdout/stderr/XML                | Bounded private evidence artifacts retained for inspection                         |
| `.clinx/evidence/ID/UUID/record.json`    | Observer assertion and copied artifacts, bound at capture time; never a verdict    |

Zod definitions in `src/schema.ts` are the model source. `npm run build` generates
JSON Schemas. CLI validation adds cross-reference, uniqueness and filesystem checks;
JSON Schema shape validation alone is not equivalent. Markdown holds reasoning;
JSON holds machine records. The supported interfaces are the Skill, CLI and JSON schemas, not a public JavaScript SDK.

## Binding and recovery

Config digest hashes normalized configuration. Task digest hashes normalized task
JSON plus the contents of explicit task context files. Source fingerprints hash
declared local paths, contents and executable bits, with deterministic ordering.
Receipts capture before/after fingerprints; reconciliation checks current fingerprints
and artifact hashes. Checkpoints compare the same contract/config/source bindings.
Input lists are explicit and have no default. Only project-declared exclusions apply;
an explicitly included path cannot itself be excluded. Previews expose these selectors.
No directory name or gitignore rule silently changes the scope. Context and task
record operations refresh project configuration instead of trusting a retained object.

Bindings are deliberately coarse: the whole configuration, task and every declared
source participate, even when a run selects only some checks. An unrelated declared
source or check-definition change can make an entire receipt stale. Reconciliation
reads one receipt; it does not combine passing checks from several runs or compute
check-level dependencies. Preserve unaffected engineering work, but do not confuse
that judgment with automatic reuse of its old evidence. Choose a meaningful project
scope before recording, without omitting real dependencies to obtain a current result.
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

Writes use an exclusive project lock. New files are written and synced to a private
same-directory temporary file, then published with an exclusive hard link; record
discovery does not select temporary names. Existing destinations are not replaced.
Writes enforce the same 8 MiB per-file bound as reads. This requires a filesystem
supporting hard links; there is no unsafe overwrite fallback or full power-loss guarantee.
Revisions replace only the explicitly named contract after preserving the previous JSON.
Initialization preflights conflicts, but multi-file filesystem writes are not a
transaction: an I/O failure can leave a partial scaffold; inspect and retry safely.
The lock is not stolen automatically after a crash; see [CLI recovery](cli.md#recovery).

Task discovery isolates per-entry errors. A damaged newest checkpoint is reported,
not silently replaced with an older note; context requires reconciliation. A new
explicit checkpoint advances past its sequence and preserves the damaged file.
Record access is separate from source-root resolution: unavailable roots leave
current bindings unknown, while history remains readable. Operations that capture
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
arbitrary trusted code. Tests execute sequentially per project to limit shared-report
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
  CLI version/runtime changes require revalidation; this is not a lock of every
  program invoked by the CLI, a container or remote environment.
- Each stream is capped at 2 MiB. Truncated stdout JUnit is inconclusive. Logs can
  contain secrets; they are not automatically redacted. Do not publish `.clinx`.
- JUnit paths are literal, relative to check cwd; no glob discovery. All skips make
  the check inconclusive. Expected test identity should be set for consequential checks.
- A project lock does not coordinate a separate project writing the same sibling
  source, remote jobs, IDE edits or manual commands. Compare inputs and investigate drift.
- No browser automation implementation or enterprise endpoint is embedded. Use the
  host's tools and local guide; external obligations remain unresolved in CLI verdicts.
- Models are versioned and strict. Internal JavaScript modules are not a public SDK.

## Implementation choices

TypeScript/Node provides the CLI runtime, JSON defines validated records, and Markdown
holds human and agent guidance. Execution uses existing project commands. The CLI
keeps a small set of result adapters; project tools retain ownership of other native
formats. New interfaces require a concrete use case, a stable boundary and behavioral
tests. See [contributing](../CONTRIBUTING.md).
