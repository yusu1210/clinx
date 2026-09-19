# Task brief — optional drafting aid

Use a conversation or existing task/design record first. Replace this outline with
the actual agreement; omit irrelevant sections. Do not maintain the same detailed
facts in both this brief and JSON. With CLI records, reference this file through
task context and keep the machine contract focused on scope and check mappings.

## Outcome and acceptance

What should the user or actual consumer be able to observe? What observation would
reject an apparently plausible implementation? Include relevant negative cases.
Name the original requirement and agreed delivery endpoint. Keep acceptance separate
from the implementation proposal so choosing an approach cannot silently redefine success.
For material outcomes, connect the owning requirement/rule, affected consumer, planned
observation and actual result or remaining gap here. Update this same record through
delivery; a passing subset of checks does not close outcomes it never examined.

## Current facts and capability choices

What exists, what is missing, and why reuse/extend/compose/new? Cite the owning
source and distinguish confirmed facts, inferences and unresolved questions.

## Scope, ownership and boundaries

What changes, what must not change, and which unchanged consumers need verification?
Name affected rule/state owners, interface semantics and consequential constraints.
For multiple projects or contributors, reference this same agreement and each
contributor's scope; do not independently redefine shared fields or states per repository.

## Execution and verification

What is the first runnable slice? Reference the actual command/cwd, target/identity,
input/setup, consumer observation, relevant version coverage and stop/recovery path.
State substitutes or unavailable boundaries without presenting them as verified.
Choose a fast discriminating check for the first uncertain change and the necessary
consumer observations for final acceptance; they need not be the same checks.

## Authority and decisions

Where does delivery end? What is allowed, held for confirmation or prohibited?
For a held action, name the actual decision owner, object, scope and decision source.
Keep important choices and remaining blockers here; routine implementation stays open.
