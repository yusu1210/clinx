# Optional records and resumption for one requirement

[简体中文](../zh-CN/recorded-delivery.md)

This is the agent/maintainer companion to the [hands-on case](hands-on.md), not required reading before a user starts. Use it when acceptance records or cross-session handoffs help. Commands and JSON expose an inspectable internal process normally performed by the agent.

## Retain a handoff without a verification plan

For continuity alone, declare the relevant source inputs in `clinx.config.json` and
omit checks until needed. A minimal task agreement can be:

```json
{
  "version": 1,
  "id": "2026-09-19-notice-visibility",
  "title": "Investigate notice visibility",
  "outcome": "Identify the current visibility rule and unresolved consumer behavior",
  "mode": "diagnosis",
  "scope": ["Visibility owner and affected consumers"]
}
```

Use `task add`, then `task checkpoint` and `context` with ordinary summary/next/blockers.
There is no acceptance verdict for this agreement. Before `verify`, use `task revise`
to add `defaultClaim`, `claims` and `obligations` together. Existing source and task
binding checks still apply; omitted claims do not authorize unbound capture or execution.
A task document alone remains sufficient when machine continuity adds no value.

## Record the same task

Skip this section if a single conversation already delivered the work. For long tasks,
handoffs, cross-project changes or retained check records, ask the agent to prepare and
explain configuration. The following is a complete starting point you can inspect.

Use an [installed CLI](installation.md) and the actual example copy path:

```sh
clinx_case=/absolute/path/to/noticeboard
clinx inspect --root "$clinx_case/service"
```

`inspect` reads command candidates without executing them; skip it when the relevant
commands are already known and reviewed. No `init` is needed to add records when the
Skill is already available. Let the agent add `.clinx/` to the project's private-output ignore rules. Use
`--json` for structured command results.

Ask the agent to create and review `noticeboard/clinx.config.json`:

```json
{
  "version": 1,
  "name": "noticeboard",
  "sources": [
    { "id": "service", "path": "service", "inputs": ["src", "test", "package.json"] },
    { "id": "viewer", "path": "viewer", "inputs": ["public"] }
  ],
  "checks": [
    {
      "id": "api-tests",
      "source": "service",
      "description": "Execute the reviewed HTTP test suite",
      "command": ["node", "--test", "--test-reporter=junit", "test/api.test.mjs"],
      "result": { "format": "junit", "from": "stdout", "minTests": 1 }
    }
  ]
}
```

JUnit here is an interchange report emitted by Node, not a Java requirement. Other
projects use their own test tools. The CLI also supports `exit-code` results, which record
exit status without claiming that tests ran; see [result formats](cli.md). This starting
point only rejects zero tests. After inspecting actual test names, add `expectedTests`
and an appropriate minimum. The CLI cannot judge assertion coverage: do not name
“test command passed” as “all product requirements satisfied.”

Then ask the agent to create `proposal.json` in the example root:

```json
{
  "version": 1,
  "id": "scheduled-notices",
  "title": "Scheduled public notices",
  "outcome": "The API and existing board show only notices visible at server time",
  "mode": "implementation",
  "scope": ["Service visibility rules, API tests and existing viewer integration"],
  "authority": [
    "Local implementation and verification after the requested design confirmation; no publication"
  ],
  "context": [{ "path": "PRD.md", "why": "Original acceptance requirements" }],
  "defaultClaim": "local-checks",
  "claims": ["local-checks", "local-product"],
  "obligations": [
    {
      "id": "api-suite",
      "description": "The selected HTTP test suite runs at least one passing test without failures",
      "claims": ["local-checks", "local-product"],
      "checks": ["api-tests"]
    },
    {
      "id": "product-acceptance",
      "description": "Review PRD coverage and observe the current browser journey",
      "claims": ["local-product"],
      "external": "Review actual assertions against the PRD and operate the final browser through normal, reload, empty, error and recovery states. Record observations and gaps."
    }
  ]
}
```

`authority` records the actual agreement; it does not grant access or fabricate approval.
Put additional confirmation conditions in the real proposal/agreement, not this example.
After review:

```sh
clinx task add --root "$clinx_case" --file "$clinx_case/proposal.json"
clinx verify scheduled-notices --root "$clinx_case" --claim local-product --run
```

`task add` validates the contract; there is no need to immediately repeat `validate`
or `context`. Review the commands and effects before execution; omit `--run` for an
optional CLI preview, not another mandatory human approval. `--run` saves receipts/logs
under `.clinx/runs/`. Select the claim needed now; do not run identical checks twice
just to demonstrate different labels. `local-checks` covers the suite only. The shown
`local-product` command still returns exit 2 because the CLI cannot automatically decide the browser
and PRD-review obligation. This does not tell the agent to stop or invalidate actual
browser observations: report native observations and machine aggregation separately.
See [evidence attachments](evidence.md) for retaining observations, which do not become
approval or an automatic passing verdict.

## Resume after interruption

At a useful handoff, ask the agent to create `resume.json` with actual status, for example:

```json
{
  "focus": "verify",
  "state": "handoff",
  "summary": "API suite passed; browser verification is not yet performed. No owned service remains running.",
  "next": "Start the service, operate the browser acceptance states, stop the owned process and report observations.",
  "blockers": []
}
```

Save this only if it is true. If browser verification is complete, record its results
instead of copying an unfinished state.

```sh
clinx task checkpoint scheduled-notices --root "$clinx_case" --file "$clinx_case/resume.json"
```

In a new conversation, provide the example directory and ask to continue this requirement.
The agent resolves the saved task, reads `context`, checks changed inputs and authority,
then continues. Supply a Skill path only if it is not already available; specify a task
when multiple could match. To
inspect an old check, use `clinx reconcile scheduled-notices --root <example-directory> --receipt <actual-receipt-path>`.
Paste the `receipt` path returned by `verify` unchanged; a relative receipt path is
resolved against `--root`, not your shell's current directory.
An old receipt describes its historical run; changed code, requirements or definitions
cannot be treated as currently supported. Diagnose changes and rerun affected checks,
without automatically replaying publication or other external actions.
