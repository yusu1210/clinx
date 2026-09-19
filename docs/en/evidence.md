# Task evidence attachments

[中文](../zh-CN/evidence.md)

Retain reviewed files from browser journeys, native tools or target observations
alongside CLI run receipts. This is an optional local archive, not a remote
verifier, human approval mechanism, signature or route to force a claim through.
An attachment preserves failures as well as successes.

## Record a real observation

Perform the authorized observation and review/redact its artifacts first. Put the
reviewed local files under the workspace, for example `.clinx/inbox/`, or reference
an original file in a declared task source. Exclude
`.clinx` explicitly when selecting a broad source scope. clinx does not fetch URLs
or redact files. Never fabricate a transcript to populate the archive.

This is a schema illustration, not an observation made by this documentation:

```json
{
  "obligations": ["browser-behavior"],
  "observedAt": "2026-01-01T10:00:00.000Z",
  "observer": "reviewer or tool identity",
  "method": "manual",
  "target": {
    "identity": "explicit service/environment/consumer",
    "revision": "observed artifact/config/client versions; say unknown if unresolved"
  },
  "outcome": "inconclusive",
  "summary": "Actual actions, expected behavior and observed result",
  "artifacts": [{ "path": ".clinx/inbox/journey.txt", "description": "Reviewed raw observation" }],
  "limitations": ["Missing version identity prevents current integration acceptance"]
}
```

`method` is `manual` or `tool`; neither makes the assertion trusted. `outcome` is the
observer's `pass`, `fail` or `inconclusive`, not a CLI verdict. Obligation IDs must
exist. Future timestamps, blank required fields, no artifacts, duplicate IDs and
unsupported fields are rejected. State observed revisions or explicit gaps; do not
guess a deployment version.

```sh
clinx evidence attach TASK-ID --root PROJECT --file observation.json
clinx evidence list TASK-ID --root PROJECT
clinx evidence list TASK-ID --root PROJECT --record UUID
```

`--file` is relative to the invoking shell. Each artifact accepts an optional `source`:
`{ "source": "service", "path": "reports/journey.txt", "description": "Reviewed trace" }`.
Its path is relative to that declared task source; without `source`, it is relative
to `--root`, even when JSON is elsewhere. Do not copy source-owned files into the
workspace just to attach them. Unknown or out-of-task sources, duplicate qualified
references, root escapes and symlinks are rejected. Source scope is not authority.
Artifacts must be regular files: at most 8 files, 8 MiB each, 16 MiB total, all nonempty.
For larger recordings, export a focused trace or retain a private archive reference
in the observation. Do not truncate necessary evidence and claim complete coverage.

`attach` copies bytes into a new `.clinx/evidence/TASK-ID/UUID/` directory, hashes them
and binds the capture to current contract/design, task-related definitions and sources.
Each saved artifact retains its qualified `original` reference. Later removal or
replacement of the original does not erase the copied bytes; changes to declared
inputs can still change the local binding. Archive integrity is checked against the
copy, not by fetching the original again.
It never overwrites earlier observations or invokes project commands. Metadata is
published last; interrupted capture can leave an invalid partial record. Inspect
that specific directory; clinx does not perform automatic destructive cleanup.
Keep `.clinx/` ignored. File permissions do not replace sensitive-content review.

## Read the distinctions

| Field                      | Meaning                                         | Does not mean                          |
| -------------------------- | ----------------------------------------------- | -------------------------------------- |
| `integrity: intact`        | Saved artifacts match record hashes/lengths     | The record is authentic or correct     |
| `localBinding: matches`    | Declared local inputs match capture-time inputs | The remote target ran those inputs     |
| `localBinding: changed`    | Local input binding changed                     | Every historical observation was false |
| `localBinding: unknown`    | Current binding cannot be established           | It is safe to reuse the observation    |
| `remoteState: not-checked` | No remote version/freshness query occurred      | Remote truth is current                |

Listing rechecks bytes, isolates malformed records and retains conflicting outcomes;
it never silently selects the newest pass. Missing or edited artifacts are invalid.
Binding describes capture time, not necessarily the earlier observation time.
Remote data, configuration or consumer changes can invalidate an observation without
local changes. Hashes cannot prevent replacing both a record and its artifacts.

Listing caps artifact reads at 128 MiB and the directory at 1024 records. Entries
past the byte budget are `integrity: not-checked`, not invalid or passing; use a
saved UUID with `--record` to inspect one. Listing saved attachments does not require
valid configuration, a current contract or source access. If any is unavailable,
`localBinding` is unknown with a reason; archive identity and artifact integrity are
still checked. This does not repair the missing inputs or permit new capture.
The command never deletes archives to fit a limit.

`evidence list` exit 0 means listing completed, possibly with invalid/unknown records.
Read every relevant entry. `verify` does not use attachments: external obligations
remain unresolved and attachments do not satisfy deterministic checks. Review both
before making a delivery statement; a narrow local pass cannot hide failed integration.

If an existing authorized tool deterministically validates the target and behavior,
register its real check/result format instead. Do not synthesize passing JUnit from
a human assertion. Attachments help traceability while keeping lower trust visible.

## Close the delivery, not just the CLI verdict

The host agent judges the agreed outcome from actual observations and decision
sources. A CLI `unresolved` can mean it cannot interpret an external condition, not
that nobody observed the target. Do not stop available verification at that boundary;
do not ignore a real failure, missing version or pending approval either.

For example, suppose the agreed endpoint is integration verification of a reading
list, with no release. A handoff after the observations would state:

- **Input and permission rules:** Name the local assertions and selected cases;
  link the exact run receipt and native output.
- **Refresh and authorization:** Describe the browser actions on an identified
  build and identity, including the saved item and rejected action; link the
  reviewed trace and receiving result.
- **Delivery judgment:** Map both observations to the original acceptance and
  state the limits of the integration conclusion.

This is a hypothetical reporting shape, not a completed run. State the actual test
target, build, date and limitations instead of copying those conclusions. If the
browser condition is stored as `external`, explain that CLI aggregation still says
`unresolved` because attachments are not attestations. Keep that verdict intact.
Release was not requested and was not performed. If the journey instead fails or
cannot identify the build, report the integration as failed or incomplete and give
the next executable step; a newer attachment or local pass cannot close that gap.

For mandatory approval, cite the current decision from its authorized source and
check its exact object/scope and validity using the existing platform. The agent's
delivery judgment and a local attachment cannot supply that authority.
