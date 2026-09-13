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

Give your agent access to a reviewed clinx checkout, then ask:

> Read /path/to/clinx/skills/clinx-delivery/SKILL.md.
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

## Build the CLI when you need records

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

Review source and scripts before running them; pin a commit when reproducibility
matters. `inspect` lists command candidates from local files without executing them.
It does not check runtime readiness.

To install the Skill in your working directory, preview then apply:

```sh
node bin/clinx.mjs init --root /path/to/project --agent codex
node bin/clinx.mjs init --root /path/to/project --agent codex --apply
```

This adds the Skill, license, and `clinx/agent-entry.md`. Conflicting files stop
the write; existing host instructions are untouched. Omit `--agent codex` for a
generic directory. Add configuration, maps, or guides only from verified project facts.
See the [CLI walkthrough](docs/en/walkthrough.md).

## Try it

From the built checkout:

```sh
node bin/clinx.mjs verify eligible-picker --root examples/node-picker
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --run
```

The first command previews the checks. The second runs domain and loopback HTTP
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
