# Reproduce verification

[中文](../zh-CN/validation.md)

Run from a reviewed checkout using existing Node.js 22.16+ and npm on macOS/Linux:

```sh
npm ci
npm run check
npm run test:coverage
npm run test:package
npm run test:maven
```

`check` checks formatting and types, builds schemas, runs unit/integration regressions and
checks repository links, translation-review byte bindings, public-file hygiene and metadata.
Translation hashes detect changed guides, not semantic equivalence. Coverage measures compiled
CLI modules and the entrypoint, not Skill effectiveness or browser acceptance.

`test:package` creates a local tarball, inspects its paths and extracted contents,
installs it in a separate temporary directory, and exercises the installed binary,
examples, evaluation CLI preparation and execution, and Skill lifecycle. It also
installs under an isolated npm global prefix and invokes `clinx` through PATH from
another cwd, testing help, text/JSON, example copying and actual verification.
It does not publish or change the user's global installation.
The separate installation resolves the package's pinned public dependencies from
the npm registry unless they are cached.
`test:maven` requires an existing JDK 17+ and Maven; it runs both modules with named
tests and a no-op control that must reject unchanged reports. It can download public
dependencies into an isolated cache. Temporary test workspaces may be retained for diagnosis.

`npm run bundle` prepares a new local CLI tarball, standalone Skill archive and
checksums without uploading. Use a fresh `--output` directory for another candidate;
see [installation](installation.md). A generated bundle is not itself a release approval.
Pass `-- --tarball PATH` to `npm run test:package` to test that exact package instead
of creating another one; the test prints its SHA-256 and verifies the bytes did not change.

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
Use [release readiness](../../CONTRIBUTING.md#release-readiness) for owner-controlled publication.
