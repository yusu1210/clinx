# Preference application

An in-process application and gateway model. Use an existing Node runtime; there
are no third-party packages, external services, install hooks or long-lived servers.
Run the current baseline with `node --test existing.test.mjs`.

- application.mjs owns user-facing operations.
- gateway.mjs implements the receiving contract and provides read-back/receipts.
- delivery.mjs contains shared bounded batching and safe sending used by operations.

## Gateway contract

`patchBatch(key, patches)` accepts at most 16 account patches. `deliveryOverride`
omitted means unchanged; null clears it to the system default; a nonempty string
sets it. Empty strings, objects and arrays are invalid, not reset values. Other
fields remain untouched. A batch is validated before any of its writes.

A receipt is stored atomically with each successful batch. Reusing a key with the
same ordered patches returns its receipt without applying again; different patches
are rejected. Keys must be stable across retry and distinct between batches and
logical requests. Receipts in this model live as long as this gateway instance;
they are not proof of a production provider's durable idempotency.

`INVALID` and `DENIED` are permanent rejections. `RETRYABLE` means definitely not
accepted and permits one additional attempt. `UNKNOWN` means acceptance is unknown:
call `receipt(key)` before resending. A receipt resolves success; null is authoritative
absence in this model and permits a same-key retry. A failed receipt query leaves
the outcome unknown and must stop this attempt. At most two sends per batch are
allowed. Unclassified errors propagate; never convert them to success.

`read(accountId)` returns current settings, including unrelated region metadata.
The local receiver has no authentication, remote transport, timeout service-level
guarantee or persistent receipt store; a real integration must establish those.
