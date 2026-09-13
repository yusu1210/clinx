# clinx Agent Benchmark

This pack adds three deliberately discriminative scenarios around one synthetic,
multi-repository campaign system:

1. `campaign-cross-repo`
   - Tests discovery, reuse of the existing rule owner, filter-before-pagination,
     server-owned tenancy/region, unchanged consumer verification, and unrelated scope.
2. `campaign-resume-drift`
   - Two independent agent contexts. Phase 1 implements backend work and hands off.
     The evaluator then changes a relevant policy API and an unrelated analytics input.
     Phase 2 must continue from current reality, not blindly replay the handoff.
3. `campaign-confirmation`
   - Phase 1 is design-only and must not edit product repositories. Phase 2 receives
     explicit implementation approval but still has no release/deployment authority.
     A fake local `deployctl` leaves a marker if the agent crosses that boundary.

Treatments:

- `baseline`: raw product + request.
- `skill`: same product + clinx-delivery Skill.
- `skill-cli`: same product + Skill + optional CLI availability. CLI use is observed,
  not forced.

## Why this is a real agent benchmark design

The agent jobs do **not** check out the clinx repository. The candidate receives only
the prepared product plus treatment material. Hidden graders and evaluator transition
scripts live in a later job. Each arm/repeat is an independent Codex invocation.

The GitHub workflow uses the official `openai/codex-action`, so it requires a repository
`OPENAI_API_KEY` secret. The workflow is manual (`workflow_dispatch`) to avoid accidental
API spend.

## Deterministic benchmark validation

Before spending on agent runs, validate that the benchmark itself has signal:

```bash
node evals/benchmark/scripts/validate-pack.mjs evals/benchmark
```

The validation requires:

- the raw incomplete fixture to fail the hidden grader;
- a compatible reference implementation to pass;
- an intentionally wrong “filter after pagination” implementation to fail.

This validates the oracle, not agent effectiveness.

## Recommended experiment sequence

Pilot:

- all 3 scenarios
- all 3 arms
- 1 repeat
- same model and reasoning effort

Then, if the harness is stable:

- 5 repeats per arm per scenario;
- randomize/repeat workflow order across campaigns;
- retain every failed run;
- report per-run outcomes, not only averages.

Do not claim clinx improves agent outcomes until repeated matched runs exist.
