# Optional host entry

Use the workspace-local `.agents/skills/clinx-delivery` in Codex mode. In generic mode,
read `clinx/skills/clinx-delivery/SKILL.md` explicitly or register it through the host's
supported mechanism. Merge an entry into existing instructions only when useful;
do not replace project or host rules. Discovery may require a host refresh.

Source repositories do not each need this entry, a Skill installation or new docs.
Read their existing applicable instructions; do not assume this entry makes the host
discover instructions in sibling repositories automatically.

> Use clinx-delivery to handle the requested software delivery task. Start with the
> original requirement and relevant current engineering facts. Use existing tools,
> preserve the request's scope, and verify the actual outcome. Retain useful maps,
> procedures and task records with their canonical owners.

The Skill works without CLI configuration. init installs no map, guide or task.
Reuse existing maps and guides, or create useful ones from verified findings. For CLI
records, declare actual inputs, exclusions and checks in clinx.config.json; no path
names are implicitly excluded. Add `.clinx/` to the project's existing ignore policy
when using records: it contains private logs, attachments and a local lock.
