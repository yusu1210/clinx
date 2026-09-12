# Task evidence attachments

[中文](evidence.zh-CN.md)

Retain actual browser journeys, tool outputs or target observations that are not
runner-produced JUnit evidence. This is an optional local archive, not a remote
verifier, human approval mechanism, signature or route to force a claim through.
An attachment preserves failures as well as successes.

## Record a real observation

Perform the authorized observation and review/redact its artifacts first. Put the
reviewed local files under the project, for example `.clinx/inbox/` (explicitly exclude
`.clinx` from source inputs when selecting a broad scope). clinx does not fetch URLs or redact files. Never fabricate a transcript
to populate the archive.

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

`--file` is relative to the invoking shell; artifact paths inside JSON are relative
to `--root`, even when JSON is elsewhere. Artifacts must be regular non-symlink
files inside the project: at most 8 files, 8 MiB each, 16 MiB total, all nonempty.
For larger recordings, export a focused trace or retain a private archive reference
in the observation. Do not truncate necessary evidence and claim complete coverage.

`attach` copies bytes into a new `.clinx/evidence/TASK-ID/UUID/` directory, hashes them
and binds the capture to current contract/design, configuration and declared sources.
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
saved UUID with `--record` to inspect one. Unavailable source roots leave local
binding unknown without hiding intact attachments. Invalid project configuration
remains a command error. The command never deletes archives to fit a limit.

`evidence list` exit 0 means listing completed, possibly with invalid/unknown records.
Read every relevant entry. `verify` is deliberately unchanged: external obligations
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
list, with no release. After actually observing the following, a handoff can separate:

| Acceptance                                                   | Observation to report                                                              | Evidence location                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Input and permission rules                                   | Current local assertions and their actual selected cases                           | Exact run receipt and native output                       |
| Saved item survives refresh; unauthorized action is rejected | The agent's real browser journey on the identified test build and identity         | Reviewed trace, target/build identity and receiver result |
| Delivery endpoint                                            | Agent concludes the agreed integration acceptance is met, subject to stated limits | Original acceptance mapped to both observations           |

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
