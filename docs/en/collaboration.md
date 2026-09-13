# Collaboration and authorization

[中文](../zh-CN/collaboration.md)

Agent-led delivery does not require an approval click for every step. Agree what the
agent can do, what needs a decision and who owns that decision. Existing organizational
policy and platform permissions still apply. This is a working agreement followed by
the agent, not an approval engine or a promise that clinx can prevent every bypass.

## One agreement across contributors

Default to one primary agent responsible for the end-to-end outcome, even across
repositories. Keep existing team ownership and one shared definition of changed
semantics. Delegation is optional and must be permitted by the host and user.

Use a separate contributor for a bounded independent investigation, non-overlapping
change or justified second perspective, not to reproduce the delivery stages as
an agent hierarchy. Provide the relevant original inputs, current agreement, allowed
read/write scope, dependencies and expected evidence. Coordinate shared files and
runtime resources through existing tools; isolation of code is not isolation of effects.

The primary agent inspects returned work, resolves conflicts and verifies the combined
behavior. Material agreement changes must reach affected contributors; obsolete work
must stop or be revised. A child's completion report is not integrated acceptance,
and delegation cannot authorize a held action. Detailed coordination is in the Skill's
[collaboration procedure](../../skills/clinx-delivery/references/collaboration.md).

## Two independent choices

**Delivery endpoint:** a design, locally verified implementation, verified integration,
release readiness, or an authorized release with observation. A request for development
does not implicitly include production deployment.

**Confirmation boundaries:** which decisions or actions need confirmation before the
agent proceeds. A design checkpoint does not require approving every later edit.

| Working arrangement      | Agent proceeds with                                | Person or policy intervenes at                           |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------- |
| Autonomous within scope  | Work already authorized for the requested endpoint | Material unknowns, new authority and mandatory approvals |
| Decision checkpoints     | Investigation and agreed work between checkpoints  | Named decisions, such as design before implementation    |
| Work-package checkpoints | The current authorized package of work             | The next agreed package                                  |

These are conversational presets, not CLI flags, schema values or separate workflows.
They may be combined: confirm the design, then autonomously implement and test, with
release governed by the existing platform. A valid preauthorization can cover a
repeatable operation without a new click each time. An agent cannot create that
authorization by selecting a preset or copying an approval into a local file.

For a clear low-risk change, use the existing request without a setup questionnaire.
For unfamiliar changes with consequential shared effects, start with investigation
and propose focused decision checkpoints. Impact, reversibility, uncertainty and
existing policy matter more than repository size. Explicit user checkpoints apply
even to easy work; users cannot waive someone else's mandatory approval requirements.

## A usable request

```text
Use the clinx delivery Skill with this PRD and these repositories.
Delivery endpoint: implemented and locally verified; no merge, deployment or shared-data writes.
Working arrangement: decision checkpoints.
Investigate the existing behavior and prepare the technical proposal first.
Ask me to confirm the design before implementing the feature; do not implement it while waiting.
After confirmation, autonomously implement, test, diagnose and repair within the agreed scope.
Ask again if a material finding changes the approved behavior, compatibility, capacity or recovery.
Keep routine implementation choices with the agent. Report actual evidence and integration gaps.
```

Here the requester confirms the local implementation design, not a production release.
If the intended action requires another owner, identify that owner and the actual
approval channel. Do not treat a technical review or another agent's opinion as the
human or platform approval required for the action.

For an autonomous small change, it is enough to request the change and its limits,
for example: "Update this documentation example and check its links; no need to
confirm routine edits. Do not change behavior or publish." No task JSON is required.

## Make confirmation specific and reusable

For the held action, identify the proposed choice, relevant alternative, evidence,
material uncertainty and effect on validation/recovery. State who can decide and
what they are deciding: the design revision or change, artifact/configuration,
environment and affected scope as relevant. Include the authentic decision reference,
conditions, expiry or reuse bounds when applicable. Keep one current agreement.

After confirmation, continue within that scope. Do not ask again about every function
or refactor; do ask when a material change invalidates the decision's basis. A code
edit within an approved design need not invalidate design approval, whereas approval
for a particular release artifact does not transfer to a different artifact.

On resume, recheck conditions, revocation and target identity against the actual
decision source. A local hash match is not a live approval check. Silence, timeout,
an ambiguous response or an unavailable required approval cannot become consent.

While waiting, continue only independent authorized work. "Confirm before implementation"
also excludes implementing tests or a speculative branch for that feature unless those
activities were authorized separately. If nothing useful remains within scope, hand off
the exact pending decision. On rejection, stop the affected action; do not bypass it.

## Existing tools enforce; clinx retains context

Use existing code-review, identity and deployment systems for required approvals,
separation of duties and access enforcement. Before a consequential operation, match
the effective approval to the actual target and action. Availability of credentials,
a deployment CLI or a successful test does not establish authorization.

When optional CLI records are useful, existing fields are sufficient:

| Field                    | Use                                                       | Does not establish                                |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------- |
| `outcome`, `scope`       | Requested delivery endpoint and limits                    | Permission for every operation needed to reach it |
| `authority`              | Allowed actions, confirmation boundaries and prohibitions | Enforced access control                           |
| `decisions`              | Working arrangement, choice and actual decision source    | Identity or authenticity of an approver           |
| `context`                | Reference the maintained local agreement/design           | Current remote approval status                    |
| `obligations[].external` | Keep an externally decided acceptance condition visible   | Automatic approval from an attached observation   |

Task context participates in local input binding: changing a referenced file requires
reconciliation. That mechanical drift signal does not decide whether a human approval
remains valid. `mode` is the work type, not autonomy. `--allow-external` is an explicit
execution opt-in, not a permission grant. An external obligation remains unresolved
in CLI verdicts even when an attachment says "pass"; consult the real authority system.

See [method](method.md), [project integration](adoption.md) and [security](../../SECURITY.md).
