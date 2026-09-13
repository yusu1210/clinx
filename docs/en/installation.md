# Install, connect and maintain clinx

[简体中文](../zh-CN/installation.md)

Use the Skill to guide the agent. Add the CLI when you want repeatable local records,
verification receipts or workspace-local Skill management. Neither requires changing
the business project's language, package manager, build system or deployment tools.

## Install the CLI

The current version is a source/local-package preview, not an npm registry release.
Do not use a package fetched only by the name `clinx` until this repository announces
its verified registry identity. A GitHub source archive is not an installable CLI package:
the CLI package also contains the compiled runtime and declares its public dependencies.

With a reviewed `clinx-0.2.0-dev.0.tgz` package, install on macOS/Linux using Node.js
22.16+ and npm:

```sh
npm install --global --ignore-scripts /path/to/clinx-0.2.0-dev.0.tgz
clinx --version
clinx --help
```

The package includes `npm-shrinkwrap.json`, locking direct and transitive dependency
versions and integrity. Installation still needs the registry or cached dependencies;
the tarball is not a dependency-free offline executable. No lifecycle scripts are
needed at installation. Use an approved registry mirror when required. This is npm's
[publishable lockfile for CLI applications](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/),
not a requirement for the business project's package manager.

To prepare a local package from reviewed source today:

```sh
git clone https://github.com/yusu1210/clinx.git
cd clinx
npm ci
npm run bundle
npm install --global --ignore-scripts ./artifacts/clinx-0.2.0-dev.0/clinx-0.2.0-dev.0.tgz
clinx --version
```

Review the checkout and scripts before running them; pin the reviewed revision for
reproducibility. `bundle` builds and creates a new candidate directory with the CLI
package, a standalone Skill archive and `SHA256SUMS`. It refuses to overwrite an
existing candidate. Maintainers should run the [release checks](../../CONTRIBUTING.md#release-readiness)
before distributing it. Checksums detect changed bytes, not publisher authenticity.
No command above publishes a package or creates a GitHub release.

Team/CI installations can pin the same tarball in a separate tools directory instead
of using global installation. For example, with an existing, team-owned `/path/to/tools`:

```sh
npm install --prefix /path/to/tools --ignore-scripts --no-save /path/to/clinx-0.2.0-dev.0.tgz
/path/to/tools/node_modules/.bin/clinx --version
```

Add that tools directory's `node_modules/.bin` to the runner's `PATH` through its
normal configuration. Do not introduce a business-repository `package.json` just to
use clinx. Source development remains separate: contributors can run
`node bin/clinx.mjs` after `npm ci` and `npm run build`; no shell function is required.

## Connect a workspace

Choose the existing checkout for a single project, or a coordination directory for
several sources. Open the agent in that directory; do not initialize every sibling
repository. After installing the CLI:

```sh
cd /path/to/workspace
clinx init --agent codex --apply
clinx skill status
```

Omit `--apply` to inspect a read-only plan first. It is optional, not a mandatory
two-command confirmation protocol. `--root DIRECTORY` explicitly selects a different
directory; no parent workspace or latest task is selected automatically.

The Codex placement is `.agents/skills/clinx-delivery`. Generic placement
(`--agent generic`, the default for a new installation) is `clinx/skills/clinx-delivery`; read its
`SKILL.md` explicitly or register it through the host's supported mechanism.
Omitting `--agent` for an existing managed installation keeps its recorded placement.
Both modes add `clinx/agent-entry.md` and `clinx/installation.json`. Existing identical
files are recorded as user-owned, not claimed by the installer. Conflicting files
stop installation. Existing `AGENTS.md`, global settings and project tools are untouched.

Codex discovers repository Skills along its documented cwd-to-repository-root scope;
a Skill installed in a sibling coordination directory need not be visible from a
source repository. Start in the coordination directory or explicitly select the
intended Skill. Check discovery in the host; if changes do not appear, restart it.
See [official local Skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills).

These states are independent:

| State                        | How to establish it                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| CLI available                | `clinx --version`; this says nothing about project setup                  |
| Local Skill files installed  | `clinx skill status`; inspect local changes and versions                  |
| Host uses the intended Skill | Check the host's selected/discoverable Skill and its actual path          |
| Workspace records configured | Agent prepares reviewed inputs/checks; `clinx validate` checks structure  |
| Requirement verified         | Observe the agreed acceptance through actual project tools; retain limits |

No map, operating guide, task or config is generated by `init`. Use the
[optional templates](adoption.md) when needed. The agent should reuse
existing facts and prepare missing records when they help the task. Add `.clinx/` and
`clinx/install-backups/` to the project's private-output ignore rules when used.
The installation record is durable ownership metadata; do not edit its hashes to
make a conflict disappear. Share it with installed files only after a privacy review.

## Use the Skill without the CLI

Keep the complete reviewed `skills/clinx-delivery` folder, including its references
and license, in a host-supported location, or ask the agent to read its absolute
`SKILL.md` path. The standalone Skill archive from `bundle` has this same folder.
No Node runtime is needed merely to read the Skill. Follow the host's installation
and update mechanism for such a copy; it is not managed by clinx's installation record.
Avoid competing copies with the same name. The method itself remains host-independent.

## Start a requirement or try a case

Give the agent the [first-task request](cold-start.md) with the PRD, source paths,
desired endpoint and confirmation points. The user does not prepare technical JSON.
The CLI does not invoke a model or complete a PRD on its own.

For a self-contained exercise from any directory with an existing parent:

```sh
clinx example list
clinx example copy noticeboard --to ./noticeboard-demo
cd noticeboard-demo
clinx init --agent codex --apply
```

Then follow the [hands-on guide](hands-on.md). Copying only writes the public example
to a previously absent directory; it does not execute it or install dependencies.
`clinx resources` locates installed guides, schemas, templates and the Skill.
Example copying preserves executable wrappers, skips known local installation/history,
environment and generated-output paths, and rejects symlinks. It is bounded to 512
entries and 32 MiB total (8 MiB per file). These filters are not a general secret scanner.

## Upgrade and remove

Upgrade the CLI by installing the next reviewed package through the same package
manager. It does **not** update Skill copies already installed in workspaces.
In each workspace that you intend to update:

```sh
clinx skill status
clinx skill update
clinx skill update --apply
```

`skill update` uses the assets bundled with the selected CLI, not the network. The
preview is optional. Unchanged managed files can be replaced, missing managed files
restored, and retired managed files removed. A locally modified managed file blocks
the write unless it already exactly matches the new package. User-owned files remain
untouched; `matchesPackage: false` can remain after an update because of such files.
Keep project customizations in project-owned guidance rather than editing the shared
Skill. When edits must remain, reconcile them deliberately; there is no `--force`.

To remove unchanged managed files:

```sh
clinx skill remove
clinx skill remove --apply
```

Update/removal retains replaced files and the prior installation record under
`clinx/install-backups/UUID/`, with `operation.json` describing before/after hashes.
The command prints that location. Task data, configuration, logs, unmanaged files and
host instructions are preserved; directories are not recursively deleted. Backups
may contain private customizations and are not automatically published or pruned.
Handled write failures attempt to restore completed changes without overwriting a
concurrent edit. A crash is not a multi-file transaction: inspect the record, current
files and backup before restoring or retrying. Restore only the intended paths from
the selected backup, never copy an old installation record over unrelated new files.

CLI removal is separate and uses the installation's package manager, for example
`npm uninstall --global clinx`. Remove workspace Skill files first if desired.
Neither CLI uninstall nor Skill removal deletes delivery history.

## Troubleshooting

| Symptom                                       | Next action                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `clinx: command not found`                    | Check the npm installation prefix (`npm prefix --global`) and its executable directory on `PATH`; do not define a source-checkout shell wrapper |
| Permission denied during package installation | Use a user-owned or team-managed tools prefix; do not automatically retry with administrator privileges                                         |
| Unsupported runtime / incomplete installation | Use Node.js 22.16+; reinstall the reviewed tarball and its dependencies; contributors must build their checkout                                 |
| Skill installed but not selected              | Check host discovery, cwd and competing copies; select the actual Skill path or refresh the host                                                |
| No `clinx.config.json`                        | The Skill can proceed; let the agent prepare reviewed configuration only if records help, or select the intended `--root`                       |
| Installation conflict                         | Inspect `skill status` and the preview; preserve local work, then merge or move the relevant files deliberately                                 |
| Writer lock                                   | Confirm the recorded process is gone and no writer remains before removing only that lock; never steal it automatically                         |
| Example destination exists                    | Choose a new directory; existing work is never merged or replaced                                                                               |

Commands never prompt interactively. Agents and scripts should request `--json`;
errors use stderr with a code, message and recovery hint. See [CLI semantics](cli.md).
