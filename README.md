# clinx — AI-native full-stack engineering

clinx provides an AI-native full-stack engineering methodology, a portable agent
Skill, and an optional CLI. Within agreed authority, agents use the project's tools to
take a requirement through the boundaries needed for a verified result. The CLI
stores task agreements and check results locally when useful; the method and Skill
work without it.

[中文](README.zh-CN.md) · [Documentation](docs/en/README.md) · [Method](docs/en/method.md) · [Skill](skills/clinx-delivery/SKILL.md) · [CLI](docs/en/cli.md)

Start with a requirement and a repository. The agent reads the relevant code,
agrees on the requested behavior, implements it with the project's tools, runs
the result, and reports what it verified. The method calls this **Discover →
Contract → Build → Verify → Learn**.

## Try a complete task

[Hands-on: from a PRD to a running delivery](docs/en/hands-on.md) starts with an
unfinished noticeboard: copy the raw projects → send the agent a request → confirm
the proposal → implement and operate the page → optionally record and resume.
It includes commands, complete task JSON, expected observations, and adaptations for
greenfield work and enterprise tools. To try a finished product first, run the
[reading list](examples/reading-list/README.md).

## Use it for your requirement

After [connecting the Skill](docs/en/installation.md), give the agent the request:

> Use clinx-delivery and its relevant references.
> Requirement: [PRD or description]. Repositories: [URLs or local paths].
> Implement the requested behavior. Check what already exists, run the relevant
> tests and actual consumer path, then report how to use and stop the result, what
> passed, and what remains unverified. Ask about decisions or access you cannot
> resolve from the project. Honor agreed confirmation points. Do not merge or deploy.

For design, diagnosis, or review only, say so in the request. You do not need a
project map, technical plan, or task JSON to start. See the [first-task guide](docs/en/cold-start.md)
for the full request and workflow.

You can set a confirmation point, such as approving the design before implementation.
Existing mandatory approvals still apply. See [collaboration](docs/en/collaboration.md)
for scope and authorization.

“Full-stack” covers the boundaries the outcome needs; it does not prescribe a language,
framework, UI, API or database. New and partly reused capabilities follow the same loop.

## Use the parts you need

| Component               | Use                                                                        |
| ----------------------- | -------------------------------------------------------------------------- |
| Method and Skill        | Guide investigation, implementation, verification, and handoff             |
| Project maps and guides | Keep verified facts and repeatable procedures for later tasks              |
| Optional CLI            | Record agreements, checkpoints, check results, and changes to local inputs |
| Existing project tools  | Edit, build, test, browse, and operate authorized platforms                |

Reuse existing knowledge and tools. [Templates](templates/workspace) help fill a real
gap; they are optional. See [project integration](docs/en/adoption.md) and
[workspace layout and ownership](docs/en/workspace.md). Source repositories do not
need a uniform documentation scaffold or separate initialization.

## Install and connect once

The optional CLI requires Node.js 22.16+ and npm on macOS/Linux. This does not
constrain the target project's language or require adding npm files to it.
The current preview is distributed from reviewed source/local tarballs, **not the
npm registry**. Follow [installation](docs/en/installation.md) to obtain a normal
`clinx` command; contributors use the separate source-build instructions.

```sh
clinx --version
cd /path/to/project
clinx init --agent codex --apply
```

This installs the workspace-local Skill and entry and records file ownership.
It preserves existing host instructions and stops on conflicting files. Omit
`--apply` for a read-only preview; preview and apply are not two mandatory steps.
Use `--root /path/to/workspace` when invoking from elsewhere. Generic hosts can
use `--agent generic` and read the installed Skill explicitly.

Now give the agent your PRD and project paths. No maps, configuration or task JSON
are prerequisites. The agent prepares useful records from verified facts when needed.
Skill installation, host discovery, workspace configuration and verified delivery
are different states; see [integration](docs/en/adoption.md).

```sh
clinx inspect
clinx task add --help
clinx skill status
```

Results are readable text by default. Agents and scripts use `--json` for structured
output. [Skill-only use, upgrades, removal and troubleshooting](docs/en/installation.md)
do not require a second development environment.

## Try it

No source checkout is needed after CLI installation:

```sh
clinx example copy node-picker --to ./picker-demo
cd picker-demo
clinx verify eligible-picker
clinx verify eligible-picker --run
```

The copy creates a new directory without executing project commands. Verification
without `--run` previews checks; `--run` runs domain and loopback HTTP
tests and saves a local receipt. The example's `release-ready` claim remains
unresolved because local tests do not establish release conditions.

Other examples cover [browser/API/persistence](examples/reading-list/README.md) and
[a multi-module Maven build](examples/maven-reactor/README.md). These synthetic examples
demonstrate specific boundaries, not production-ready applications.

For a task spanning repositories, try the [sibling-source HTTP example](examples/multi-source/README.md):
one coordination directory, source-owned references and task-scoped input bindings.

## Verify and understand the limits

Use the [verification guide](docs/en/validation.md) to run tests, coverage, package
installation and Maven checks. The [evaluation protocol](docs/en/evaluation.md) measures
agent outcomes separately; no general efficiency improvement has yet been established.

Commands inherit your permissions, environment, and network. clinx is not a
sandbox, agent runtime, environment builder, or deployment platform. Local receipts
and [attachments](docs/en/evidence.md) do not grant approval or prove remote state.
Read [security](SECURITY.md) and [known limits](docs/en/architecture.md#limits).

MIT licensed. Use a reviewed checkout or local tarball; the package is not
published to npm. Supported interfaces are the Skill, CLI, and JSON schemas.
The CLI makes no model calls and includes no telemetry or automatic publication.
See [contributing](CONTRIBUTING.md) and [release notes](CHANGELOG.md).
