# Reset delivery-time overrides

Add `resetOverrides({ requestId, accountIds }, client)` to application.mjs. A user
can restore the system delivery time for selected accounts without changing their
region or other preferences. Use the supplied gateway contract; no UI, new service,
persistent queue, account provisioning or deployment is requested.

- Accept a nonblank request ID and an array of nonblank account IDs. Reject invalid
  input before effects; do not silently trim or rewrite identifiers. Duplicates refer
  to one account, preserving first occurrence. An empty array is a successful no-op.
- Clear each selected override, not the account or its other settings. The caller
  uses the same request ID and account list when retrying the same logical operation.
- Respect the existing gateway's batch size and the product limits of 48 distinct
  accounts and at most three batches per operation, excluding permitted retries.
  Reject larger operations before any effects, rather than
  silently dropping accounts or adding a long-running background workflow.
- Follow the gateway's failure and receipt contract. Do not report success when a
  batch is rejected or its outcome cannot be established. After partial success, a
  retry with the same request must not repeat already-applied effects. Atomicity
  across batches is not promised; report that limitation in the handoff.
- Recover one definitely-not-accepted transient failure when possible. For unknown
  acceptance, use the receipt: accepted means complete; authoritative absence allows
  the one same-key retry; a failed receipt query must stop this attempt.
- Keep existing behavior and tests. Add and run meaningful tests through the actual
  local receiving implementation, including relevant negative cases. Explain how
  to invoke, observe and recover; local tests do not establish remote integration.

These limits are policies for this project. If a future request exceeds them, it needs a new capacity decision.
