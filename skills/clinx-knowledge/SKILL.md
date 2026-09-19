---
name: clinx-knowledge
description: 'Build, capture, organize or revalidate reusable engineering knowledge from projects and task findings. Use for project onboarding, source-backed guides, knowledge handoffs, or stale and conflicting engineering documentation; not general note taking or a substitute for implementing a requested feature.'
license: MIT
---

# clinx knowledge

Make the next engineering decision easier without creating a second account of the
system. Work with existing sources, tools and knowledge owners; no CLI, graph,
database or delivery task record is required.

Accept the user's engineering question directly; do not ask them to choose an intent,
graph backend, file layout or metadata template. Reuse the normal entry and existing
guidance, investigating only what the question and material uncertainty require.
Do not initialize delivery records or reinstall an already available Skill for this work.
Resolve familiar projects through the normal entry instead of requesting their paths
again. Use [project-context.md](references/project-context.md) when locating projects,
separating shared knowledge from local bindings, or resolving stale/ambiguous context.

## Choose the requested outcome

| Intent   | Useful outcome                                                                   |
| -------- | -------------------------------------------------------------------------------- |
| Build    | Answer scoped engineering questions about an unfamiliar system                   |
| Capture  | Retain a reusable finding from work already performed                            |
| Organize | Reconcile, place or retire existing findings                                     |
| Maintain | Recheck knowledge after relevant implementation, contract or operational changes |

These are independent intents, not sequential stages. Ask only for missing choices
that materially affect scope or authority. Investigate missing engineering facts
yourself. A documentation request does not authorize product changes, tool installation,
remote publication or production operations.

Read [knowledge.md](references/knowledge.md) for the shared investigation, ownership,
retrieval and correction rules. Read [code-intelligence.md](references/code-intelligence.md)
only when choosing or interpreting structural/semantic navigation tools.

## Deliver useful knowledge

Start from the user's questions and the existing canonical entry, not an inventory
of every class. Choose task-driven discovery or an explicitly scoped system survey.
For a survey, account for relevant entry points, rule/state owners, consumers and
operational boundaries; keep unsupported and unexamined areas visible.

Resolve consequential contradictions between observed implementation, intended rules,
environment observations and authorized decisions. Do not silently rewrite one to fit
another. Preserve unresolved candidates separately from guidance ready for reuse.

Prefer an existing regression test, tool, guide, decision record or small map over a
new document when that is the natural home. Follow its owner's normal review process.
When changes are not authorized, return a proposed correction and source-backed gaps.

Report what is usable, where to find it, what was actually checked, remaining limits
and the next recheck trigger. Test discovery from the normal entry using realistic
question terms. Distinguish a local navigation check from a fresh-session exercise;
neither proves future delivery gains. No reusable finding is a valid outcome.
