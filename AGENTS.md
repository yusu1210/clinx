# Working on clinx

clinx supports AI-native full-stack engineering through a portable methodology,
an agent Skill, and an optional task/context/evidence CLI. The method and Skill work without the CLI. It is not an
environment builder, agent runtime, sandbox, deployment platform, or proof that
requirements are complete.

- `src/schema.ts` owns the public models; `npm run build` generates JSON Schemas.
- `src/runner.ts` owns bounded execution; `src/verify.ts` owns evidence and verdicts.
- `src/workspace.ts` owns source resolution and binding; `src/task.ts` owns task continuity.
- `src/install.ts` installs the Skill and entry without generating project facts.
- `src/inspect.ts` owns bounded static command discovery, not runtime readiness.
- `src/evidence.ts` owns local observation attachments, never claim promotion or remote truth.
- `skills/clinx-delivery` owns portable agent procedures; disclose detail progressively.
- `npm run check` runs type checks, tests, and repository hygiene checks.
- Review changed English/Chinese guide pairs against actual behavior before updating
  `docs/translations.json`; a matching hash is not proof of translation accuracy.
- `npm run test:maven` runs the real multi-module Java example (requires Maven/JDK).
- `npm run test:package` tests the tarball from a separate temporary installation.
- Keep execution, observation, applicability, and claim decisions distinct.
- Never execute repository commands during static discovery or initialization.
- Keep new commands opt-in; preserve user files, existing tools, and permissions.
- Do not copy private source code, internal documents, company names, paths, credentials,
  or proprietary workflows into this repository. Examples must be original.
- Test failures, zero tests, malformed reports, stale artifacts, path escapes,
  interrupted processes, and cross-source changes as well as successful runs.
- Document supported behavior and limitations; do not claim measured agent gains
  without a controlled evaluation. Do not publish packages or create remotes implicitly.
