# Knowledge use and correction exercises

Run `node evals/knowledge/prepare.mjs` from a reviewed source checkout, or run the
same script under the installed package's `evals` directory. It creates an original
temporary project, requests and evaluator criteria. It runs no model or project code.

Give an agent only the returned workspace, request and chosen Skill. Keep
`evaluator.json` out of its prompt and permitted workspace; it is not an answer input.
Use only synthetic local data. Save the actual response, tool trace and changed files.

Independently review each criterion. Check protected file hashes against the evaluator
baseline. A test suite pass is not a knowledge grade. Keep failures and unresolved
claims rather than calculating a document-quality score.

## Continue through changing requirements and evidence

After each run, stop writers and save the response, tool trace, model/tool settings,
permissions and costs outside the candidate workspace. Review the outcome before
continuing; preparation does not decide whether the agent passed. Then run:

```sh
node evals/knowledge/prepare.mjs --after /path/to/previous/evaluator.json
```

Pass only the **new** workspace, returned `request` and selected Skill to a fresh
session. Do not include prior conversations, checkpoint names, criteria or transition
explanations. Keep the same treatment configuration throughout a trajectory: knowledge
work uses clinx-knowledge, final implementation uses clinx-delivery; a no-clinx control
receives neither. Requests do not tell the agent which defect changed.

| Checkpoint          | Evaluator-controlled change                               | What to examine                                                                        |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Capture             | Initial source conflicts with old guidance and policy     | Existing JSON reused; defect distinguished from intended rule                          |
| Retrieval           | No source change; read-only request                       | Guidance discovered and used without rewriting it                                      |
| Behavior change     | Function body changes; signature stays stable             | Prior conflict rechecked against behavior                                              |
| New consumer        | Producer unchanged; registration adds a preview path      | New consumer found; whole-system claims reconsidered                                   |
| Unavailable source  | Preview source absent; registration retained              | Unknown current behavior kept distinct from absence or compliance                      |
| Operational change  | Only local batch configuration changes; code is identical | Effective retention rechecked without confusing source freshness with runtime behavior |
| Historical evidence | An earlier source observation becomes available           | Retired guidance does not return as current advice; historical evidence is preserved   |
| Delivery            | Preview restored; implementation now authorized           | All registered paths corrected and regression-tested; useful guidance repaired         |

Each continuation creates a fresh temporary directory, carries only the prior README
and Markdown under `docs/`, and preserves their exact bytes and deletions. Source changes
come from the original fixture, not agent-modified baselines. The evaluator record saves
transition paths and hashes; `previous-snapshot.json` holds the prior project bytes in
base64 outside the new workspace. Earlier workspaces are never rewritten. Relocated
absolute references must be rebound to the selected copy, not followed into an earlier
checkpoint. Keep all earlier evaluator artifacts unavailable to the candidate.

The script rejects protected-source edits, extra non-guidance files, read-only retrieval
changes, symbolic links and special files. Limits are 128 entries, depth 8 and 1 MiB of
project file content. A rejection preserves the failed run; review it before deciding
whether to start a separate trajectory. Do not repair the candidate and count it as a
success. These checks are not a sandbox, approval record or automatic semantic grade.
Evaluator manifests must remain evaluator-owned. There is no concurrent-writer guarantee.

At delivery, freeze the result and review policy/registration integrity, each registered
path's retention with the unchanged supplied configuration, unchanged payload behavior, rejection of unsupported formats, actual
regression execution and the normal knowledge entry. Run candidate code only after review
in an authorized isolated execution environment. Existing payload tests deliberately pass
despite a retention defect; passing them is not acceptance. The fixture has no production
storage or elapsed-time deletion engine, so its retention values do not prove real cleanup.

The normal entry has two guidance routes. Correction must reach the affected quick
reference as well as the operations guide, or retire the misleading route with a usable
replacement. Check subsequent answers, not just valid links. From the behavior-change
checkpoint onward, the evaluator's `retiredClaims` retains a scoped historical proposition
for review at every later checkpoint, even after an earlier successful correction.
Historical quotations and another consumer's identical numeric value are not resurrection.
If current evidence legitimately restores a previously retired fact, reassess it; this
fixture does not simulate that restoration and must not establish a permanent wording ban.

Keep review results for each criterion and watched proposition with their supporting
trace/artifact references. Missing review, unavailable evidence and reviewer errors stay
unevaluated/unknown, not passes. Report planned, completed and unreviewed checkpoints
separately; never drop failed transitions from the trajectory. No script here judges
natural-language correctness or turns a prepared checkpoint into a reviewed result.

This is one longitudinal synthetic scenario, not eight independent samples. It models
configuration effects through a local JSON file and executable batch path, not live
platform state or permissions; unavailability uses a missing file, not an OS access denial.
Extend with no-new-learning,
stale graph, read-only owner and other project stacks before claiming generality. There
are no measured agent outcomes from merely preparing or unit-testing these checkpoints.

## Separate the effects

- Code intelligence: same delivery method and native/language tools in every arm;
  add one candidate graph to each experimental arm. Keep all baseline tools available.
- Knowledge: hold tools fixed; compare investigation without retained guidance against
  maintained guidance over matched follow-up tasks, with the same delivery method in both
  arms. Include preparation, correction and maintenance in the total treatment cost; do
  not give only one arm free evaluator-approved answers. Test stale/wrong guidance separately
  as fault injection, not as an unbiased estimate of ordinary adoption benefits.
- Whole method: compare native delivery and the combined method only after isolating
  the above effects. Do not attribute all changes to graphs or a single Skill.

Freeze source, requirements, model/settings, permissions and budgets; isolate sessions
and caches; randomize order and repeat paired tasks. Count setup/update and failures,
not only query time. Grade acceptance, omissions, regressions, unauthorized actions and
false completion before latency or tokens. Independent analysis tools may share the
same blind spots. No candidate is a validated integration until its actual installation,
indexing, failure paths and representative delivery have been exercised.

For a code-intelligence comparison, include representative boundaries rather than only
symbol lookup: injected implementations, interception, cross-source HTTP consumers,
RPC/message consumers, cache bypasses, dynamic configuration and nested/type/unit
contract changes. Choose fixtures in the actual target stacks; no language is required
by the method. Keep evaluator-owned expectations outside candidate inputs. Measure
bounded relationship recall only when those expectations enumerate the relevant set;
otherwise report coverage gaps, not an invented completeness percentage.
