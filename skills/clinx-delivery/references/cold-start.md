# Start with a requirement and unfamiliar projects

A PRD/file/link and repository URLs or paths are enough to begin investigation,
not a guarantee of access or complete product decisions. Use normal engineering tools;
clinx configuration and an engineering map are not user-supplied prerequisites.

## Resolve the original inputs

Read the requirement and relevant attachments, distinguishing original intent,
authorized changes and current implementation. If a meaningful source is inaccessible,
identify the precise uncertainty; do not substitute a search summary for the PRD.

For an existing checkout, inspect revision and dirty state. For a supplied repository
URL, obtain a separate checkout within scope using existing tools; preserve explicit
branch choices and existing directories. Read applicable instructions before executing
project code. Follow relevant caller/dependency references, not the entire parent
workspace. An inaccessible dependency's interface and runtime are different evidence.

Choose one coordination location without imposing new files on each source. Reuse
existing instructions and documents; missing maps or write access to a dependency
do not require an onboarding rewrite. See [integration.md](integration.md) for ownership.

## Discover enough for the next real action

Start from relevant entries, rule/state owners, consumers and tests. Existing maps
help navigation; distinguish intended contracts from observed implementation when they
disagree. Find actual commands in guides,
CI, scripts, manifests and locks; review their bodies and hooks. Optional static
discovery is incomplete, not a reason to replace an unsupported stack.

Bound search to the relevant capability and follow its authorized links, including
symlinked sources when needed. Record meaningful limits: a partial index, truncated
read or unsearched dependency does not establish absence. If a required source cannot
be read, hold only the decision or action that depends on it and identify the gap.

Record the working understanding: requested outcome, reusable/missing capabilities,
owners, execution path, acceptance observations and material unknowns. Keep it in
conversation for simple work. For complex or recurring work, create or update useful
maps and guides from these findings; see [integration.md](integration.md). The agent
drafts any needed configuration, not the user.

Classify capabilities individually, including mixed new/reused work. Reuse can avoid
code changes, not required compatibility checks. A failing out-of-scope dependency
requires an explicit boundary decision, not an automatic repair.

For an empty checkout, investigate actors, constraints and reusable external
capabilities; do not invent an existing call chain. Start the smallest input-to-effect
slice using ordinary tools and an agreement. Persist actual requirement/design files
if helpful, and add code inputs as they exist. CLI initialization is not a prerequisite.

## Move from investigation to feedback

Establish the delivery endpoint and honor any confirmation-before-action boundary;
see [collaboration.md](collaboration.md). A PRD is enough to investigate, not automatic
authorization to implement before requested design confirmation or to change a shared target.

Choose a complete observable slice and establish the real execution path using
[delivery.md](delivery.md). Restore normal project dependencies through reviewed
procedures when in scope. Existing authorized remote test resources can be preferable
to running every service locally; keep substitutes explicit.

Use [runtime.md](runtime.md) to make the command/target/input, actual consumer
observation and stop/recovery path concrete. Unsupported static discovery or report
parsing does not prevent using the project's existing tools and native evidence.

Ask at agreed confirmation points or where evidence cannot resolve a material product
choice, target, authority or access gap. Complete authorized independent work and state
the smallest blocker; do not implement a held action merely because it is reversible.
Otherwise implement, observe, diagnose and repair, then compare against original
acceptance after the last change. Preserve useful discoveries with their canonical
owners so the next task need not repeat them.
