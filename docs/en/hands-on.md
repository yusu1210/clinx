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

Connect the [Skill](installation.md) once. In a reviewed clinx checkout, ask the agent:

```text
Copy evals/fixtures/noticeboard into a new local working directory without overwriting
anything. Tell me its absolute path. Use skills/clinx-delivery/SKILL.md from this
checkout. Inspect the initial API tests and start the original app so I can see it.
Do not change the example yet. Stop only the process you started when we finish.
```

The agent prepares the copy and baseline. Running this example needs Node.js 22.16+
but no third-party dependencies; the Skill itself needs neither Node nor the CLI.
If using an [installed CLI](installation.md) instead of a checkout, the equivalent copy is:

```sh
clinx_demo=$(mktemp -d)
clinx example copy noticeboard --to "$clinx_demo/noticeboard"
printf '%s\n' "$clinx_demo/noticeboard"
```

Keep the printed workspace path and open your agent there. This copies only the raw
projects, not the evaluator or a completed answer. The temporary directory isolates this exercise,
not durable work. Use a controlled working directory for your real requirements.

Reuse an already available Skill. If one is not available, follow the installation
guide; adding task records later does not require installing the Skill again.

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

The agent runs these commands; use them yourself only if you want to repeat the baseline.
Replace the path with the actual copy location (no previous shell variables required):

```sh
clinx_case=/absolute/path/to/noticeboard
npm --prefix "$clinx_case/service" run test:api
node "$clinx_case/service/src/main.mjs"
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

## 4. Continue or hand off

If this conversation delivers the result, do not add CLI records afterward merely to complete a workflow. For interruption or handoff, have the agent retain enough context; in a fresh session say “continue this requirement” and provide the project location. Ask which task only when several could match.

When inspectable records help, the agent uses [records and resumption for this case](recorded-delivery.md) to prepare configuration, acceptance mappings and checkpoints. Users need not fill JSON, copy receipt paths or run each command. Execution and authority still need real verification.

## Apply this to your project

**From zero:** give the agent an actual empty directory and a product requirement,
using step 2's Skill request. For example: “Readers recommend books; librarians mark
them read; keep state after restart. Local demonstration, no deployment.” Confirm roles,
data lifetime and delivery endpoint, then run submission → server validation → save →
refresh/read-back early. Do not copy a finished answer and call it greenfield development.
To experience a completed product separately, run the [reading-list example](../../examples/reading-list/README.md).

**Existing query or bulk-operation work:** provide your PRD and reuse known project context;
add project locations only when they cannot be resolved. See [context reuse](project-context.md),
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
