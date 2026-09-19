# Observe a platform result

[简体中文](README.zh-CN.md)

This original example connects a representative job API to an observer and the
optional clinx evidence archive. It uses only Node.js 22.16+ and an owned loopback
HTTP fixture. No credentials, deployment, real QA platform or model calls are used.

The synthetic contract in `provider.mjs` defines acceptance: correlate operation,
target and build; require terminal success and the named executed cases. HTTP 200,
an accepted/running job, zero cases, skipped cases or a response from another build
cannot establish success. Failed cases remain failures even when the job says success.
Unrecognized, malformed, oversized or unavailable responses remain inconclusive.
Each read is bounded to two seconds and 64 KiB; there is no automatic write or retry.

Run the native tests from this directory:

```sh
node --test observe.test.mjs
```

With an installed CLI, copy the example into an absent directory and run it there:

```sh
clinx example copy platform-observation --to /tmp/platform-observation-example
cd /tmp/platform-observation-example
clinx verify observe-job --run
node demo.mjs
```

`demo.mjs` prints three JSON lines with absolute attachment-input paths. It records
pending, failed and successful responses from the local fixture in `.clinx/inbox/`.
Those responses are deliberately synthetic; this demonstrates preservation of
conflicting history, not recovery of a real job. The script closes its owned server.
For each printed path, archive the observation using the existing command:

```sh
clinx evidence attach observe-job --file PRINTED-ATTACHMENT-PATH
clinx context observe-job
clinx evidence list observe-job
clinx verify observe-job --claim integration --run
```

The local claim should be `supported`: substantive tests exercised the adapter.
The integration claim remains `unresolved` (exit 2), including after a passing
attachment. The example has never exercised the requested product on a real target.
Context shows saved assertions for discovery; `evidence list` separately checks
archive bytes and local bindings. It never selects the latest pass to erase a failure.

For a real project, first use the native platform CLI/Skill directly. Retain its raw
result and inspect the actual business envelope, operation/build/target identity,
test selection and terminal state. Implement a small project-owned assertion only
for a demonstrated gap; do not copy this invented API contract into a real adapter.
Keep credentials and provider recipes at their existing private owner. Reconcile a
failure against the same operation and authorized new execution, retaining both.
An elapsed wait does not establish readiness or authorize resubmission.

If a native command already implements the required assertions, register that
reviewed command and its actual result format. An exit-code check records its exit
contract only; clinx does not interpret exit 2 from an arbitrary command as a platform
"pending" state. Preserve such external observations explicitly instead of weakening
them or manufacturing passing JUnit. See [evidence](../../docs/en/evidence.md).

Changing `observe.mjs` makes an earlier local receipt stale. Reconcile it, repair the
adapter and rerun affected tests. The tests accept a valid control and reject wrong
identity, false success and incomplete results; this validates the mechanism, not
measured agent gains or production effectiveness. Fixture code remains outside
production tooling.
