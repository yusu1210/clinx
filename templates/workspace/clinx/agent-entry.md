# Optional host entry

Use workspace-local `clinx-delivery` or `clinx-knowledge` under `.agents/skills/` in Codex mode.
In generic mode, read the chosen Skill under `clinx/skills/` explicitly or register it through the host's
supported mechanism. Merge an entry into existing instructions only when useful;
do not replace project or host rules. Discovery may require a host refresh.

Source repositories do not each need this entry, a Skill installation or new docs.
Read their existing applicable instructions; do not assume this entry makes the host
discover instructions in sibling repositories automatically.

> Use clinx-delivery to handle the requested software delivery task. Start with the
> original requirement and relevant current engineering facts. Use existing tools,
> preserve the request's scope, and verify the actual outcome. Retain useful maps,
> procedures and task records with their canonical owners.

Reuse the workspace's existing knowledge entry and local project bindings to resolve
known engineering locations. Add a link here only if it closes a discovery gap; do not
copy the catalog or credentials. Ask for missing anchors or material ambiguity, not
the same repository paths on every task. Existing guidance does not grant new authority.

Keep useful findings from sustained investigation in this workspace before a
confirmation pause or handoff. Reuse an existing task note and link it from the normal
entry; include evidence, held decisions and the next safe action. A prose note needs
no CLI configuration. When using CLI records, the machine agreement belongs at
`clinx/tasks/<id>/contract.json`; adjacent notes are optional. This workspace-local
`clinx/` is not the separate clinx source project. Private case material stays with
its workspace rather than becoming an example in the tool's source repository.

Use clinx-knowledge for independent project knowledge, reusable findings, retrieval
and revalidation. Both Skills work without CLI configuration. init installs no map,
guide, graph or task, and does not configure third-party tools.
With an installed CLI, use `clinx COMMAND --help`, `clinx resources` and explicit
`--json` for programmatic results. Skill file installation and version status do not
establish host discovery or project readiness; `clinx skill status` checks local files.
Reuse existing maps and guides, or create useful ones from verified findings. For CLI
records, declare actual inputs, exclusions and checks in clinx.config.json; no path
names are implicitly excluded. Add `.clinx/` to the project's existing ignore policy
when using records: it contains private logs, attachments and a local lock. Keep
`.clinx/install/backups/` private too. Preserve the local `.clinx/install/state.json`
ownership record; never edit its hashes to bypass an upgrade conflict.
