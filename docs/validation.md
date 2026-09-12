# Reproduce verification

[中文](validation.zh-CN.md)

Run from a reviewed checkout using existing Node.js 22.16+ and npm on macOS/Linux:

```sh
npm ci
npm run check
npm run test:coverage
npm run test:package
npm run test:maven
```

`check` checks formatting and types, builds schemas, runs unit/integration regressions and
checks repository links, public-file hygiene and metadata. Coverage measures compiled
CLI modules and the entrypoint, not Skill effectiveness or browser acceptance.

`test:package` creates a local tarball, inspects its paths and extracted contents,
installs it in a separate temporary directory, and exercises the installed binary,
examples, preparation and execution of the evaluation CLI, and Skill onboarding. It does not publish or install globally.
`test:maven` requires an existing JDK 17+ and Maven; it runs both modules with named
tests and a no-op control that must reject unchanged reports. It can download public
dependencies into an isolated cache. Temporary test workspaces may be retained for diagnosis.

## Interpretable local records

The repository supplies a self-check contract:

```sh
node bin/clinx.mjs verify project
node bin/clinx.mjs verify project --run
node bin/clinx.mjs verify project --claim public-release --run
```

The last command is expected to return exit 2 while external release-owner conditions
remain unresolved, even when local checks pass. It never authorizes publication.
The self-check is narrower than the full release checklist above. Record the exact
revision, runtime, command, outcome and limitations for a release candidate outside
the distributable source; keep raw `.clinx` records private.

## What these checks do not establish

- All possible defects, security properties or arbitrary project/toolchain support.
- Real browser interaction from HTTP tests or DOM/fetch doubles.
- Enterprise integration, approval or production qualification from synthetic fixtures.
- Hosted CI success merely because a workflow is present.
- Measured agent efficiency from deterministic test passes.

Use [evaluation](evaluation.md) to measure method/Skill behavior with equal raw inputs.
Use [release readiness](../CONTRIBUTING.md#release-readiness) for owner-controlled publication.
