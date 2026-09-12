# Contributing

[中文](CONTRIBUTING.zh-CN.md)

clinx provides an AI-native engineering method and portable Skill.
CLI features must solve a demonstrated deterministic support problem, not turn the
project into an environment installer or autonomous workflow engine.

## Development

Use existing Node.js 22.16+ and npm on macOS/Linux:

```sh
npm ci
npm run format
npm run check
npm run test:coverage
npm run test:package
npm run test:maven
```

Maven validation requires an existing JDK 17+ and Maven. Package tests use a local
tarball and temporary installation; nothing is installed globally or published.
Tests may retain temporary workspaces for diagnosis; remove only exact directories
you have identified as test-owned.

- Reproduce bugs with a failing behavioral regression where practical, then fix the cause.
  Cover negative and unresolved cases, not only successful scaffolding.
- Keep models in `src/schema.ts`; build regenerates schemas. Treat commands, fields,
  exit codes and packaged assets as public interfaces; keep help and docs aligned.
- Skill changes should improve a concrete decision. Keep the entry short, route
  detail, preserve user scope and authorization, and avoid mandatory process for small work.
- Maintain corresponding English/Chinese user guides together. Keep machine fields
  and the portable Skill's instructions single-source; do not translate identifiers.
- Use original synthetic examples. Do not copy proprietary code, private documentation,
  internal Skills, credentials, task records or enterprise-specific identifiers.
- Support claims with observations. Do not invent adoption, hosted-CI or production
  success. Use the [evaluation protocol](docs/evaluation.md) for agent-effectiveness claims.

## Issues and contributions

Use [issues](https://github.com/yusu1210/clinx/issues) for non-sensitive reports.
Include the version, OS/Node, minimal synthetic input, exact command, expected and
actual behavior. Review/redact logs first; do not upload an entire private checkout
or `.clinx` directory. Follow [security reporting](SECURITY.md#reporting) for vulnerabilities.

Explain the problem and tradeoff in a pull request; include tests and relevant guide
changes. Keep unrelated refactors separate. Contributions are distributed under the
repository's MIT license; only contribute material you have the right to share.

## Release readiness

Source publication and npm publication are separate decisions. The public repository is [yusu1210/clinx](https://github.com/yusu1210/clinx). The npm manifest keeps
`private: true` until registry publication is explicitly authorized.

Before a release, the owner must:

1. Review the exact candidate's source provenance, dependency licenses, docs and
   public-file scan. Heuristics cannot establish absence of confidential material.
2. Run the commands above, inspect the local tarball and test a separate installation.
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
