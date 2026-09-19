# Contributing

[简体中文](CONTRIBUTING.zh-CN.md)

clinx provides an AI-native full-stack engineering methodology and portable agent
Skills. Add CLI features for demonstrated onboarding, continuity, or verification needs.
The CLI is not an environment installer or autonomous workflow engine.

## Development

Use existing Node.js 22.16+ and npm on macOS/Linux:

```sh
npm ci
npm run format
npm run check
npm run test:coverage
npm run test:package
npm run test:maven
npm run bundle
```

Maven validation requires an existing JDK 17+ and Maven. Package tests use a local
tarball and temporary installation; the user's global tools are not changed and nothing is published.
Tests may retain temporary workspaces for diagnosis; remove only exact directories
you have identified as test-owned.

- Reproduce bugs with a failing behavioral regression where practical, then fix the cause.
  Cover negative and unresolved cases, not only successful scaffolding.
- Keep models in `src/schema.ts`; build regenerates schemas. Treat commands, fields,
  exit codes and packaged assets as public interfaces; keep help and docs aligned.
- Keep command help in `src/commands.ts`. Test default text and explicit `--json`,
  input/error semantics, installation from another cwd, and safe Skill lifecycle.
  User guides use installed commands; source entrypoints belong in development instructions.
- Version record shape changes in the schema. When saved evidence requires different
  interpretation, update `evidenceProtocolVersion` in `src/version.ts` and test that
  unsupported protocols remain unresolved. Product version alone is not that boundary.
- Skill changes should improve a concrete decision. Keep the entry short, route
  detail, preserve user scope and authorization, and avoid mandatory process for small work.
- Maintain corresponding English/Chinese user guides together. Keep machine fields
  and the portable Skill's instructions single-source; do not translate identifiers.
- Keep long-form guides in matching `docs/en/` and `docs/zh-CN/` paths. Keep the
  repository-level README, contribution, security and changelog files at the root
  so readers can find those entrypoints from the repository homepage.
- Use original synthetic examples. Do not copy proprietary code, private documentation,
  internal Skills, credentials, task records or enterprise-specific identifiers.
- Support claims with observations. Do not invent adoption, hosted-CI or production
  success. Use the [evaluation protocol](docs/en/evaluation.md) for agent-effectiveness claims.

## Documentation

Write for the reader's next task. Put the prerequisite and a usable command or
decision near the top of a guide. Keep commands, expected results, failure behavior,
and limits together. Check examples against the current CLI and source before
describing them as working. Link to the canonical explanation instead of repeating
it across pages; remove stale guidance when behavior changes.

Use short, descriptive headings and plain verbs. Replace phrases such as “ensure
robust end-to-end capability” with the behavior a reader can observe. Separate
confirmed facts from examples and hypotheses. A passing local check supports only
what that check observes. Keep English and Chinese guides equivalent in meaning,
without forcing sentence-by-sentence translation. In Chinese, use full-width
punctuation, spaces around English terms and numbers, and unchanged command/field
names. Check relative links and Markdown formatting with `npm run check`.

English is the reference for paired user guides; Chinese retains equivalent behavior,
commands and limits, not necessarily the same sentences. Code and schemas own CLI
semantics, and the Skill owns agent instructions. Correct a discovered error in both
guides rather than treating either language as proof that the implementation is right.

`docs/translations.json` records the exact bytes last reviewed together. After changing
either guide, review the pair against its canonical behavior and update the affected
entry. `node scripts/translations.mjs --snapshot` prints current hashes without writing
or approving anything. Do not refresh entries for unreviewed pairs. `npm run check`
rejects missing pairs, broken language links or changed bytes without a matching record.
This catches forgotten review; it cannot establish translation accuracy or reviewer identity.

## Issues and contributions

Use [issues](https://github.com/yusu1210/clinx/issues) for non-sensitive reports.
Include the version, OS/Node, minimal synthetic input, exact command, expected and
actual behavior. Review/redact logs first; do not upload an entire private checkout
or `.clinx` directory. Follow [security reporting](SECURITY.md#reporting) for vulnerabilities.

Explain the problem and tradeoff in a pull request; include tests and relevant guide
changes. Keep unrelated refactors separate. Contributions are distributed under the
repository's MIT license; only contribute material you have the right to share.

## Release readiness

Source publication and npm publication are separate decisions. The public repository
is [yusu1210/clinx](https://github.com/yusu1210/clinx). The npm manifest keeps
`private: true` until registry publication is explicitly authorized.

Before a release, the owner must:

1. Review the exact candidate's source provenance, dependency licenses, docs and
   public-file scan. Heuristics cannot establish absence of confidential material.
2. Run the commands above, inspect the local tarball and test a separate installation,
   including the normal command on PATH, example copying, upgrades and recovery.
   Check dependency advisories at release time with `npm audit --registry=https://registry.npmjs.org`.
3. Run hosted CI on the supported matrix and review actual results. Local macOS
   execution does not certify Linux; a workflow file is not a completed run.
4. Check private vulnerability reporting or the documented contact route. Review
   repository access and branch protection for the maintainer's release process.
5. Confirm the version and notes describe the exact reviewed artifact. Do not ship
   internal development history, local execution logs or real user task data.
6. For npm only: establish package-name ownership (or choose an owned scope), review
   repository/registry metadata, then remove `private` only in the authorized release.
   A registry lookup does not prove ownership. Publish through the chosen host's
   approved process; never infer permission from passing tests.

No automatic publication or deployment workflow is included.
Maintain `npm-shrinkwrap.json` as the single dependency lock for both source builds
and installed CLI packages. Review dependency changes and their advisories; package
tests compare installed runtime dependencies with this lock. Do not add a competing
`package-lock.json` or change the lock solely to bypass a failed installation.

`npm run bundle` creates a new ignored `artifacts/clinx-VERSION/` directory with the
CLI tarball, separate delivery and knowledge Skill archives and checksums; it does not upload them. Use
`npm run bundle -- --output NEW_DIRECTORY` for another candidate. Never overwrite a
reviewed candidate. Test that exact tarball without repacking:

```sh
npm run test:package -- --tarball ./artifacts/clinx-0.2.0-dev.0/clinx-0.2.0-dev.0.tgz
```

The test prints the candidate path and SHA-256. Match it to `SHA256SUMS`.
The release owner distributes exactly the tested bytes and
updates installation instructions only when the chosen distribution actually exists.
