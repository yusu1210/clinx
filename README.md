# clinx — AI-native full-stack engineering

clinx helps an agent turn a requirement and existing code into a working, verified result. It provides a portable engineering method, two agent Skills, and an optional CLI for tasks that need durable context or evidence.

[简体中文](README.zh-CN.md) · [Start](docs/en/cold-start.md) · [Hands-on tutorial](docs/en/hands-on.md) · [Documentation](docs/en/README.md)

## Start with the requirement

[Connect a reviewed Skill](docs/en/installation.md), or reuse a copy already available to your host or team. Skill-only use needs no Node.js runtime, CLI configuration, project map, or task JSON.

Then give the agent the task in ordinary language:

> Use clinx for this PRD: `<file or link>`, in our current product context.
> Confirm the key design with me, then implement and verify it locally. Do not push or deploy.

For low-risk work, you can authorize implementation in the initial request. Say when you want design, diagnosis, or review only. The agent inspects the relevant code and project tools, reuses existing capabilities, and asks when a product decision or additional authority is actually needed. See [collaboration and authorization](docs/en/collaboration.md).

A useful handoff tells you:

- what changed and which existing capabilities were reused;
- how to run, exercise, and stop the result;
- what was observed, including relevant failure cases;
- what remains unresolved or unverified.

Full-stack describes the boundaries required by the outcome. It does not require every task to add a UI, API, and database.

## What clinx supports

| Task                           | How clinx helps                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Build from zero                | Settle the necessary decisions and run a complete slice early                        |
| Change an existing system      | Trace current semantics, ownership, and affected consumers                           |
| Work across repositories       | Coordinate from one workspace without moving or initializing each repository         |
| Resume interrupted work        | Recover intent, changes, and pending decisions without replaying operations blindly  |
| Maintain engineering knowledge | Check current sources, correct stale guidance, and keep useful findings discoverable |

The method is **Discover → Contract → Build → Verify → Learn**. These are questions to revisit during delivery, not five approval gates.

- [`clinx-delivery`](skills/clinx-delivery/SKILL.md) guides software changes.
- [`clinx-knowledge`](skills/clinx-knowledge/SKILL.md) guides investigations and reusable engineering knowledge.

Both Skills work without the CLI. The [hands-on tutorial](docs/en/hands-on.md) starts from an unfinished PRD; the [knowledge tutorial](docs/en/knowledge.md) covers stale guidance, conflicting implementation, and later revalidation. Both use original synthetic projects.

## Add the CLI when records help

The CLI records task agreements, selected inputs, handoffs, checks, and local observations. It is useful for long-running work, cross-session handoffs, and repeatable verification. It does not call a model or replace project-native tools.

The CLI is currently distributed from reviewed source or local release bundles; it is **not published to the npm registry**. It requires macOS or Linux, Node.js 22.16 or later, and npm. See [installation](docs/en/installation.md).

```sh
clinx status
clinx COMMAND --help
```

`clinx status` reports local setup and saved tasks without running checks or selecting work. Machine callers use `--json`. For task records, resumption, and exact command semantics, see [recorded delivery](docs/en/recorded-delivery.md), the [CLI reference](docs/en/cli.md), and [workspace ownership](docs/en/workspace.md).

## Scope and evidence

clinx is independent of application language, framework, and deployment platform. It reuses the project's own build, test, browser, and platform tools.

A local pass supports only what that check observed. It does not establish remote state, integration acceptance, release authorization, or the correctness of saved knowledge. Commands run with the current process permissions, environment, and network access. clinx is not a sandbox, agent runtime, environment builder, or deployment system.

[Verification](docs/en/validation.md) describes repository and distribution checks. [Evaluation](docs/en/evaluation.md) covers agent-outcome experiments; general productivity gains have not been established. See [Security](SECURITY.md) for trust and sensitive-data boundaries.

MIT licensed. Public interfaces are the Skills, CLI, and JSON Schemas. The CLI has no telemetry or automatic publication.

[Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)
