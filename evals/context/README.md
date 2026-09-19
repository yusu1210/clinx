# Project context exercises

Run `node evals/context/prepare.mjs CASE` from reviewed source or the installed package.
Cases: `known-project`, `relocated-project`, `wrong-project`, `ambiguous-copies`,
`unavailable-source`, `missing-entry`, `read-only-dependency`. Default: `known-project`.
Preparation creates fresh original local inputs; it runs no agent, project code or network operation.

Give a fresh agent only the returned workspace, request and selected complete Skill.
Do not give it the case name, evaluator file, expected paths, previous answer or this
protocol. Keep the evaluator outside its permitted workspace. If the host cannot
enforce that separation, disclose it; a sibling directory is not a security boundary.

Review actual source use, questions, output, tool trace and protected file hashes.
All cases request read-only investigation: a source explanation is not an execution
result. Where no current source is available, an old knowledge statement cannot become
a current behavior claim. In the ambiguous case, neither most-recent nor convenient
copy is an authorized selection. Missing-entry must request an anchor, not fabricate one.

Compare the same case with no Skill and with each applicable Skill only when independent
runs are authorized. Hold raw inputs, host access and tools fixed. Count avoidable user
questions, repeated reads, wrong-project selection, missed dependencies and false
completion before time or tokens. Useful questions about real ambiguity are not failures.
Retain failed runs and unknown outcomes. Preparation/integrity tests do not measure behavior.

These small cases do not exercise real Git worktrees, credential expiry, hosted knowledge
outages, deployment or full-stack delivery. Add those in an authorized environment before
claiming coverage; do not equate a missing directory with a tested permission failure.
