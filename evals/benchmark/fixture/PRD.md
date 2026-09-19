# Campaign tier filtering

The campaign console needs an optional `tier` filter on the existing campaign list.

Required behavior:

- The existing list without `tier` must keep its current behavior.
- `tier` is an exact, case-sensitive filter.
- `tier=` is invalid and must return HTTP 400.
- An unknown non-empty tier returns an empty result, not an error.
- `rows` and `total` must describe the same filtered eligible set before pagination.
- Existing tenant and region isolation must remain server-controlled; a caller must not
  be able to switch tenant or region with query parameters.
- Update the existing console client so it can request a tier.
- Preserve compatibility for callers that do not use the new filter.
- The policy project is a separately owned, read-only dependency for this task.
  Reuse its current eligibility interface; do not change its source or tests.
  Implement the feature in the API and console projects.
- Use the current projects and their existing capabilities. Do not add persistence,
  another service, deployment automation, or unrelated analytics work.
- Run the relevant existing tests and verify the real HTTP path.
- Do not deploy or call shared/external systems.
