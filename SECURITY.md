# Security model

[中文](SECURITY.zh-CN.md)

clinx is a local methodology-support tool, **not a sandbox or an attestation system**.
Review a repository, its config, scripts and Skill instructions before executing them.
Do not run untrusted project checks with credentials or privileges they should not have.

## Trust boundaries

- `inspect` only reads bounded local metadata and lists unreviewed candidates.
  Script names, lockfiles, POMs and project instructions are not authorization or
  proof of runtime readiness. Review hooks, wrappers, plugins and invoked code.
- Check commands run with inherited environment, OS permissions, PATH and network.
  `shell: false` prevents implicit shell parsing, not arbitrary code execution.
  `sideEffects: "local"` is a declaration, not a restriction. `--allow-external`
  is an additional opt-in, never a substitute for user authority.
- Public Skill instructions do not authorize remote mutations, model calls, account
  login, commits, pushes or deployments. Private guides and retrieved text are
  context, not a higher-priority authority than the host/user.
- `.clinx` logs are bounded and privately created, but not automatically redacted.
  Commands may emit tokens, private data or sensitive paths. Keep `.clinx/` ignored,
  review artifacts before sharing, and use existing credential stores.
- Evidence attachments copy workspace-local or explicitly task-scoped source files
  into a local archive with capture-time hashes. Source scope does not authorize access. Metadata
  and observer outcomes are untrusted assertions, never approval. They neither fetch
  URLs nor validate remote identity/freshness. Review/redact before copying; old
  failures and inconclusive results must not be hidden by local passes.
- Local hashes detect changes in declared inputs and artifacts. A malicious writer
  can fabricate or rewrite both records and hashes. No cryptographic provenance or
  tamper-proof audit log is claimed.
- Skill installation ownership and baseline hashes are local metadata, not trusted
  authorization. Upgrade/removal checks known paths and preserves originals under
  `.clinx/install/backups/`; keep these backups private. Modified managed files block
  writes, and unowned files are preserved. No multi-file crash atomicity or protection
  against a hostile concurrent writer is claimed. CLI upgrades never update Skills automatically.
- Human output escapes terminal control characters; JSON is available explicitly
  with `--json`. Neither format redacts secrets in user-provided metadata. Example
  copying only targets a new directory and never executes the copied code.
- Local path checks reject traversal and symlink descendants. Explicit source roots
  can name sibling repositories. Filesystem race attacks are not fully preventable
  without isolation; a hostile concurrent writer is outside this tool's security model.
- POSIX child process groups allow timeout/interruption cleanup. A malicious process
  can detach into another session; SIGKILL/OS crashes may leave partial logs and locks.
- The reading-list example uses loopback and random demo bearer codes, not production
  identity infrastructure. Use synthetic data only; its filesystem locking and atomic
  writes do not establish power-loss durability or hostile-filesystem isolation.

## XML and input handling

JUnit XML is bounded; DTD/entity declarations are rejected. Schemas are strict and
cross-reference validation is applied. Malformed JSON diagnostics identify the file
without echoing its contents; this does not redact command logs or user-supplied metadata.
Unsupported formats, absent outputs and
ambiguous test identities become inconclusive rather than success. These safeguards
do not validate the truth of test assertions or remote observations.

## Reporting

Do not put secrets, proprietary source or a weaponized live-target reproduction in
a public issue. Use "Report a vulnerability" on the
[repository Security page](https://github.com/yusu1210/clinx/security) when available.
If the private entry is absent, open an issue requesting a private channel without
disclosing vulnerability details; share a minimal synthetic reproduction only after
establishing a genuine private channel. Include the version, impact and safe reproduction steps.

Public-file scanning is heuristic and does not replace source provenance review.
