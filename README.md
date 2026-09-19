# clinx — AI-native full-stack engineering

clinx helps agents turn requirements and existing projects into implemented, verified,
usable results, and retain useful learning for the next task. It provides a general
methodology, portable Skills and an optional CLI without replacing your stack or environment.

[简体中文](README.zh-CN.md) · [Start](docs/en/cold-start.md) · [Hands-on](docs/en/hands-on.md) · [Documentation](docs/en/README.md)

## Connect once, then give the task

[Connect a reviewed Skill](docs/en/installation.md), or reuse an available host/team copy.
Skill-only use needs no Node runtime, CLI, project map or task JSON. Do not initialize every repository.

Once connected:

> Use clinx for this PRD: `<file or link>`, in our current product context.
> Confirm the key design with me, then implement and verify autonomously. Do not push or deploy.

Known project locations come from the current task, knowledge entry and local bindings;
you need not repeat them. A new host without an entry needs one project or knowledge
anchor. See [context reuse](docs/en/project-context.md) for moved paths and ambiguous copies.

For low-risk work, authorize implementation directly. State when you want only design,
diagnosis or review. The agent investigates engineering facts, reuses existing capabilities
and chooses relevant tools and checks. It asks at agreed checkpoints or for a genuinely
missing decision or authority, not for technical configuration or a graph-provider choice.
[Scope and authorization](docs/en/collaboration.md) still apply.

Expect a usable result: what changed, how to run and stop it, what was actually verified,
and what remains incomplete. Full-stack means the boundaries the outcome needs, not a
mandatory page, API and database for every request.

## Where it fits

| Your task                                    | What clinx supports                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Build from zero                              | Resolve necessary decisions and run a complete slice early                         |
| Extend or reuse a system                     | Check existing semantics, ownership and affected consumers                         |
| Deliver across repositories                  | Coordinate once and reference sources without moving or initializing each one      |
| Resume interrupted work                      | Recover intent, changes and pending decisions without blindly replaying operations |
| Understand or maintain engineering knowledge | Verify sources, correct old guidance and make findings retrievable                 |

`clinx-delivery` guides software changes; `clinx-knowledge` handles independent knowledge work.
Both are self-contained and share knowledge rules. Hosts can select by intent; explicitly
name the relevant Skill when automatic selection is unavailable.
The method is **Discover → Contract → Build → Verify → Learn**, not five human approval gates.

The [hands-on case](docs/en/hands-on.md) starts with an unfinished PRD and shows the request,
design decision and observable result. The [knowledge case](docs/en/knowledge.md) covers
stale guidance, conflicting implementation and later revalidation.
These original synthetic projects are exercises, not production endorsements.

## CLI: add records when they help

The CLI retains agreements, inputs and execution results for long tasks, handoffs and
repeatable verification; it does not call models. Ordinary tasks can use only the Skill
and native project tools. When records help, the agent prepares technical fields and
runs commands while you review consequential boundaries.

This is a source/local-package preview, **not an npm registry release**. The optional CLI
requires macOS/Linux, Node.js 22.16+ and npm. This does not constrain the application's stack
or require npm files in business repositories. See [installation](docs/en/installation.md).

With the CLI available:

```sh
clinx status
clinx COMMAND --help
```

`status` summarizes local installation, configuration and tasks without running checks
or selecting work. No local ownership record does not mean the host lacks a Skill;
missing configuration does not block ordinary engineering.
For a needed workspace-local installation, use `clinx init --agent codex --apply`;
do not initialize again when a suitable copy is already available.
Machine callers use `--json`; preview is not a mandatory extra human confirmation.

See [records and resumption](docs/en/recorded-delivery.md), [CLI reference](docs/en/cli.md)
and [workspace ownership](docs/en/workspace.md) for deeper use.
Reuse existing tools; no graph engine, knowledge database or second deployment platform is required.

## Quality and boundaries

The method and Skills are company-, language- and domain-independent. CLI execution and
parsing have explicit support limits. Local checks are not integration verification,
release readiness is not authority, and saved knowledge is not necessarily correct.
Commands inherit current permissions, environment and network. clinx is not a sandbox,
agent runtime or environment builder.

[Verification](docs/en/validation.md) covers implementation and distribution checks.
[Evaluation](docs/en/evaluation.md) separately measures agent outcomes; general efficiency
gains are not yet established. See [Security](SECURITY.md) for trust and sensitive-data boundaries.

MIT licensed. Supported interfaces are Skills, CLI and JSON Schemas.
The CLI has no model calls, telemetry or automatic publication.
[Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)
