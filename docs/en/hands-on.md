# Hands-on: from a PRD to a running delivery

[简体中文](../zh-CN/hands-on.md)

Add scheduled publication to an existing noticeboard. Start with two projects that
do not yet satisfy the requirement, not a completed answer. Supply their paths and
the PRD; the agent uses the Skill to investigate, propose, implement and verify.
Add CLI records to the same task when checks or continuity need to be retained.

The data is synthetic and public, but the code, HTTP requests, browser interactions
and check records run locally. This is not production evidence or a requirement to
use the example's language or framework.

## Who does what

| You                                                                          | Agent and Skill                                                                                                 | Optional CLI                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Provide requirements, project access and authority; confirm agreed decisions | The Skill supplies instructions; the agent uses existing editing, terminal, testing, browser and platform tools | Install the Skill, record tasks, run explicit checks, retain inputs/results and support continuity |

A Skill is not an executable. The CLI does not call a model, develop software or
deploy by itself. You can complete this requirement without it. Do not start by
writing a map, configuration and task JSON yourself: have the agent prepare what
the investigation actually requires, then review important boundaries.

## 1. Prepare the local project

Use an existing Node.js 22.16+, a macOS/Linux shell and an [installed CLI](installation.md).
The example has no third-party dependencies. Copy its raw inputs from the package:

```sh
clinx_demo=$(mktemp -d)
clinx example copy noticeboard --to "$clinx_demo/noticeboard"
clinx init --root "$clinx_demo/noticeboard" --agent codex --apply
printf '%s\n' "$clinx_demo/noticeboard"
```

Keep the printed workspace path and open your agent there. This copies only the raw
projects, not the evaluator or a completed answer. The temporary directory isolates this exercise,
not durable work. Use a controlled working directory for your real requirements.

For Skill-only practice, instead copy `evals/fixtures/noticeboard` from a reviewed
source checkout into a new directory and give the agent the absolute path of the
checkout's `skills/clinx-delivery/SKILL.md`. No CLI build or evaluator is required.

```text
noticeboard/
  PRD.md           Original requirement
  service/         Existing HTTP service, domain rule, tests and historical design note
  viewer/          Existing page; served by service, with no separate install or build
```

The [PRD](../../evals/fixtures/noticeboard/PRD.md) requires published notices within the
current server-time window: inclusive start, exclusive end, absent/null boundaries
unbounded, invalid dates and reversed windows hidden. API and page must agree; total
must match items, retaining order and interfaces. Callers cannot spoof the clock.
Do not add a scheduler, database, identity system or deployment platform.

Experience the initial system:

```sh
npm --prefix "$clinx_demo/noticeboard/service" run test:api
node "$clinx_demo/noticeboard/service/src/main.mjs"
```

Open the printed URL. The initial page shows `Welcome` and the expired `An old event`,
while existing tests pass. That is the gap: **passing old tests does not complete a
new requirement.** Stop your server with Ctrl+C in that terminal before continuing.

## 2. Give the task to an agent

Use an agent that can read local files, edit and execute commands. Open it in the
copied workspace and check that clinx-delivery is available. Replace the PRD path
below with the printed workspace path. If the host cannot discover the Skill, ask
it to read the installed Skill's absolute SKILL.md path explicitly.

```text
Use clinx-delivery and its relevant references.
PRD: <absolute-example-path>/PRD.md.
Projects: service and viewer in the same directory.
Deliver the PRD locally, verifying the API and actual page, with use/stop instructions.
First investigate the implementation, tests and historical note. Propose a concise
design and wait for my confirmation before implementation.
After confirmation, you may independently edit these local projects, tests and docs
and run isolated local verification.
Do not rewrite the PRD, access production, install extra platforms, merge, push or deploy.
Investigate facts available in the projects yourself; ask for genuinely missing
product decisions or authority.
```

These are facts you should be able to check, not a claim about a guaranteed agent response:

- `service/src/catalog.mjs` owns the current rule; HTTP calls it and the page consumes the API.
- Existing `createApp({ notices, now })` supports a clock injection; boundary tests need not wait in real time.
- The page already has reload, empty and error states. Verify them instead of assuming a frontend rewrite.
- The historical design note is a lead, not a replacement for current code and the PRD.

A useful proposal explains rule ownership, interface preservation, invalid input and
precision, direct API enforcement, and page verification. It need not decide every
function name. If the agent proposes a scheduler, ask why this requirement needs one.

After reviewing the proposal, you might respond:

```text
I confirm the server-side filtering and existing-viewer reuse proposal in your last message.
Implement the PRD boundaries; run existing tests, new boundary tests and the real browser.
Continue without file-by-file confirmation. Pause if a discovery changes the approved
meaning or authority. The endpoint remains locally implemented and verified, not deployed.
```

This must refer to the proposal you actually reviewed, not function as unread blanket
approval. For low-risk work, the initial request can authorize design and implementation
continuously. Mandatory organizational approvals still apply.

## 3. Observe the result, not just “done”

The agent should run final code and provide an actual URL, test commands and results.
You can also repeat step 1's start command. With default demonstration data, the finished
page should show only `Welcome`, with a count of 1; Reload should preserve that result.
Open `/api/notices` on the same server to compare the API. Adding
`?now=2099-01-01T00:00:00Z` must not change the server's decision time.

| Acceptance                                                       | Observation to look for                                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Inclusive start, exclusive end, absent bounds                    | Real HTTP tests with a fixed injected clock, before/at/after endpoints                 |
| Invalid dates, missing timezone and reversed windows stay hidden | Invalid inputs and counterexamples, not only assertions about a new function           |
| Conversion does not expose or hide content early                 | Boundary decisions when input precision exceeds the runtime representation             |
| Items, order, total, existing fields and routes                  | API responses and regressions                                                          |
| Page, reload, empty state, failure and recovery                  | Actual browser interaction with the final version; fetching HTML alone is insufficient |

The agent can create and restore empty/error states using owned isolated data, test
servers or browser tools. Do not add production debug endpoints or stop other people's
processes for a demonstration. Without browser access, complete available HTTP checks
and provide exact page actions, expected results and gaps; do not claim full-stack
verification. Recheck affected acceptance after the final relevant change.

The handoff should make clear which projects changed, what was reused, how to run and
stop, which original requirements have observations, and what remains unverified.
This is usable handoff information, not another mandatory form.

## 4. Use the CLI for this same task

Skip this section if a single conversation already delivered the work. For long tasks,
handoffs, cross-project changes or retained check records, ask the agent to prepare and
explain configuration. The following is a complete starting point you can inspect.

Use the same installed CLI and shell variables as step 1:

```sh
clinx inspect --root "$clinx_demo/noticeboard/service"
clinx skill status --root "$clinx_demo/noticeboard"
```

`inspect` reads command candidates without executing them. `skill status` checks the
files installed in step 1, not project readiness or host discovery. Skill-only users
can connect with `clinx init --agent codex --apply --root WORKSPACE` if now adding the
CLI. Let the agent add `.clinx/` and `clinx/install-backups/` to the project's private
output ignore rules. Use `--json` for structured command results.

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
clinx task add --root "$clinx_demo/noticeboard" --file "$clinx_demo/noticeboard/proposal.json"
clinx validate scheduled-notices --root "$clinx_demo/noticeboard"
clinx context scheduled-notices --root "$clinx_demo/noticeboard" --focus verify
clinx verify scheduled-notices --root "$clinx_demo/noticeboard"
clinx verify scheduled-notices --root "$clinx_demo/noticeboard" --run
clinx verify scheduled-notices --root "$clinx_demo/noticeboard" --claim local-product --run
```

Preview does not execute checks; `--run` executes and saves receipts/logs under
`.clinx/runs/`. A successful default check should support `local-checks`. The last
command still returns exit 2 because the CLI cannot automatically decide the browser
and PRD-review obligation. This does not tell the agent to stop or invalidate actual
browser observations: report native observations and machine aggregation separately.
See [evidence attachments](evidence.md) for retaining observations, which do not become
approval or an automatic passing verdict.

## 5. Resume after interruption

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
clinx task checkpoint scheduled-notices --root "$clinx_demo/noticeboard" --file "$clinx_demo/noticeboard/resume.json"
clinx context scheduled-notices --root "$clinx_demo/noticeboard"
```

In a new conversation, provide the Skill path, example directory and task ID. Ask the
agent to read current context, check changed inputs and authority, then continue. To
inspect an old check, use `clinx reconcile scheduled-notices --root <example-directory> --receipt <actual-receipt-path>`.
Paste the `receipt` path returned by `verify` unchanged; a relative receipt path is
resolved against `--root`, not your shell's current directory.
An old receipt describes its historical run; changed code, requirements or definitions
cannot be treated as currently supported. Diagnose changes and rerun affected checks,
without automatically replaying publication or other external actions.

## Apply this to your project

**From zero:** give the agent an actual empty directory and a product requirement,
using step 2's Skill request. For example: “Readers recommend books; librarians mark
them read; keep state after restart. Local demonstration, no deployment.” Confirm roles,
data lifetime and delivery endpoint, then run submission → server validation → save →
refresh/read-back early. Do not copy a finished answer and call it greenfield development.
To experience a completed product separately, run the [reading-list example](../../examples/reading-list/README.md).

**Existing query or bulk-operation work:** provide your PRD and related projects,
then inspect existing query, presentation and write capabilities. Actual semantics
determine the focus: ownership of filtering and counts, reset encoding, batch limits
and lost-response retries must be checked at their receivers. Do not transplant this
tutorial's time filter into unrelated work. The [raw bulk-operation PRD](../../evals/fixtures/bulk-reset/PRD.md)
is another practice input.

**Enterprise environment:** use existing repositories, documentation, build/deployment
CLIs and their Skills. Do not create a second tool with the same role. Missing context
usually concerns project entrypoints, target/artifact identities, authority/approval,
success observations and recovery. Having a deployment CLI does not specify which
service/version may be deployed, who approves it or how to observe the result. Keep
those facts in existing project guides and reference them as needed; see
[project integration](adoption.md) and [collaboration](collaboration.md).
