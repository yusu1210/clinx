# clinx — AI-native full-stack engineering

A methodology, portable Skill and optional CLI for agent-led delivery—from a
requirement and new or existing projects to verified behavior, within agreed authority.

[中文](README.zh-CN.md) · [Documentation](docs/README.md) · [Method](docs/method.md) · [Skill](skills/clinx-delivery/SKILL.md) · [CLI](docs/cli.md)

**Discover → Contract → Build → Verify → Learn.** The agent investigates the real
system, agrees the change, runs and repairs a complete slice, verifies the original
acceptance, and retains useful knowledge. Existing project tools do the engineering;
clinx provides the method and optional records.

## Start with a requirement and projects

Give your agent access to a reviewed clinx checkout, then ask:

> Read /path/to/clinx/skills/clinx-delivery/SKILL.md. Implement this requirement:
> [PRD and repository URLs or local paths]. Investigate current capabilities and
> owners, choose the smallest complete change, run and verify the actual outcome,
> and provide use/stop instructions with evidence and remaining gaps.
> Honor agreed confirmation points; ask for material decisions or access that
> investigation cannot resolve. Do not merge or deploy.

Specify design, diagnosis or review instead if implementation is not wanted.
No map, technical plan or task JSON is required to begin.
See [cold start](docs/cold-start.md) for the working sequence.

Choose the delivery endpoint separately from confirmation frequency. For example,
confirm a design before implementation, then let the agent code and test within that
agreement. Existing mandatory approvals still apply. See [collaboration](docs/collaboration.md).

“Full-stack” covers the boundaries the outcome needs; it does not prescribe a language,
framework, UI, API or database. New and partly reused capabilities follow the same loop.

## Choose the support you need

| Component               | Use                                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| Method and Skill        | Investigate, choose capabilities, implement, verify and recover           |
| Project maps and guides | Retain source-backed knowledge and usable procedures                      |
| Optional CLI            | Save task agreements, checkpoints, command results and input-drift checks |
| Existing project tools  | Edit, build, test, browse and operate authorized platforms                |

Reuse existing knowledge and tools. [Templates](templates/project) help fill a real
gap; they are optional. See [project integration](docs/adoption.md).

## Build the optional CLI

Requires Node.js 22.16+ and npm. Command execution supports macOS/Linux; this runtime
requirement does not constrain the target project's language.

```sh
git clone https://github.com/yusu1210/clinx.git
cd clinx
npm ci
npm run build
node bin/clinx.mjs --help
node bin/clinx.mjs inspect --root /path/to/project
```

Review source and scripts before installation or execution; pin a reviewed commit
when reproducibility matters. `inspect` discovers local command candidates without
executing them. It is not a runtime-readiness check.

To install the Skill in a project, preview then apply:

```sh
node bin/clinx.mjs init --root /path/to/project --agent codex
node bin/clinx.mjs init --root /path/to/project --agent codex --apply
```

This adds the Skill, license and `clinx/agent-entry.md`. Conflicting files stop the
write; host instructions are untouched. Omit `--agent codex` for a generic directory.
Create configuration, maps and guides from discovered facts when useful.
See the [CLI walkthrough](docs/walkthrough.md).

## Try it

From the built checkout:

```sh
node bin/clinx.mjs verify eligible-picker --root examples/node-picker
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --run
```

The first command previews; the second runs domain and loopback HTTP tests and saves
a local receipt. `--claim release-ready` remains unresolved because local tests do
not establish release conditions.

Other examples cover [browser/API/persistence](examples/reading-list/README.md) and
[a multi-module Maven build](examples/maven-reactor/README.md). These synthetic examples
demonstrate specific boundaries, not production-ready applications.

## Verification and limits

Use the [verification guide](docs/validation.md) to run tests, coverage, package
installation and Maven checks. The [evaluation protocol](docs/evaluation.md) measures
agent outcomes separately; no general efficiency improvement has yet been established.

Commands inherit permissions, environment and network. clinx is not a sandbox,
agent runtime, environment builder or deployment platform. Local receipts and
[attachments](docs/evidence.md) are not attestations or approvals.
Read [security](SECURITY.md) and [known limits](docs/architecture.md#limits).

MIT licensed. Install from a reviewed checkout or local tarball; this project is not
published to npm. Supported interfaces are the Skill, CLI and JSON schemas.
No model calls, telemetry or automatic publication. See [contributing](CONTRIBUTING.md)
and [release notes](CHANGELOG.md).
