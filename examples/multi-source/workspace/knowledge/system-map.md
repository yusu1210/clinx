# Notice delivery: source navigation

This map locates the example's current owners; it does not redefine their rules.
Recheck links when the path, ownership or response contract changes. Each source is
maintained independently; no source needs a new instruction file or map for clinx.

| Capability                            | Owner   | Path to inspect                                                                                     |
| ------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Fetch visible notice titles and total | Client  | [Consumer](../../client/src/notices.mjs) and [HTTP test](../../client/test/notices.test.mjs)        |
| Serve the filtered response           | Service | [Implementation](../../service/src/server.mjs) and [owned contract](../../service/docs/contract.md) |
| Decide visibility                     | Policy  | [Existing rule](../../policy/src/visibility.mjs)                                                    |

The client calls the service; the service applies the policy and calculates the
response total from the filtered items. Analytics is another available source but
is not part of that path. Consult the source and the applicable task agreement before
relying on this navigation for a different change.

Run and resume instructions live in the [example guide](../../README.md).
Task-specific decisions live in the [task design](../clinx/tasks/visible-notices/design.md).
The configuration indexes this map for discovery/design; the task binds its PRD,
design and original service contract, not this navigation file.
