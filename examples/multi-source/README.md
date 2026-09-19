# A task across sibling sources

[简体中文](README.zh-CN.md)

This synthetic example verifies an HTTP consumer across a client, service and shared
policy source. A fourth analytics source is unrelated to the task. The coordination
directory is not a source and does not need Git. Node runs this fixture, not every
project using clinx.

```text
multi-source/
  workspace/   coordination directory; use this as --root
    knowledge/system-map.md       shared navigation, not copied source contracts
    clinx.config.json             real source paths and check definition
    clinx/tasks/visible-notices/
      prd.md                      original task requirement
      design.md                   task-specific reuse and verification decision
      contract.json               CLI task agreement and input references
    .clinx/                       generated only when recording runs/evidence
  client/      consumer and its HTTP test
  service/     HTTP boundary and owned contract documentation
  policy/      shared visibility rule
  analytics/   unrelated data
```

Only the service has a contract document; the client and policy need no new maps or
`AGENTS.md`. Their existing code and tests are the entry points. These directories
stand in for independently owned repositories; the fixture does not create Git repos.
The workspace links source-owned facts and holds cross-source navigation and task
decisions. No per-source initialization is needed. See [workspace ownership](https://github.com/yusu1210/clinx/blob/main/docs/en/workspace.md)
for read-only sources, existing documentation systems and parallel checkouts.

With an installed CLI, create an isolated copy without a source checkout:

```sh
clinx_demo=$(mktemp -d)
clinx example copy multi-source --to "$clinx_demo/multi-source"
clinx context visible-notices --root "$clinx_demo/multi-source/workspace"
clinx verify visible-notices --root "$clinx_demo/multi-source/workspace"
clinx verify visible-notices --root "$clinx_demo/multi-source/workspace" --run
```

Context links the original `service/docs/contract.md` without copying it, and selects
the shared map during discovery/design. The task binds its PRD, design and service
contract; the map is navigation only. Preview
shows three task sources and one check. Execution starts an ephemeral loopback HTTP
server, calls the actual consumer, asserts the visible items and total, and closes
the server. Exit 0 supports the declared local observation only.

To resume, pass the returned receipt path to
`clinx reconcile visible-notices --root WORKSPACE --receipt PATH`. A checkpoint can be
recorded using the [ordinary handoff command](https://github.com/yusu1210/clinx/blob/main/docs/en/walkthrough.md).
For the guides matching your installed version, use `clinx resources`.

The checkout's `test/multi-source.test.mjs` regression demonstrates:

- unrelated analytics bytes, availability or navigation changes preserve scoped bindings;
- policy/service/client inputs and the source-owned contract participate in the binding;
- changing the shared rule to expose inactive items stales old evidence and fails a new run;
- changed check semantics cannot rewrite an old observation into current acceptance;
- unknown sources, out-of-scope references, path escapes and symlinks are rejected;
- omitting task `sources` conservatively binds every configured source;
- source-owned navigation follows task scope; workspace navigation still follows focus;
- map-only edits do not stale evidence unless the map becomes a declared task input;
- changing the task design stales acceptance, while adding unbound validation notes does not;
- Skill onboarding in the workspace does not add files to source repositories.

Run those cases with `npm run build && node --test test/multi-source.test.mjs`.
Do not shrink task scope to hide an actual dependency. This example has no browser UI,
production identity, persistent application data or deployment; it is a runnable
coordination example and regression, not a measured agent-efficiency benchmark.
