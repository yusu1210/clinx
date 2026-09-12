# Noticeboard service

Requires an existing Node 22.16+; no dependencies to install. From this directory:
`npm run test:api` tests the actual HTTP boundary; `npm run dev` starts a loopback
server on an available port and prints its URL. Ctrl+C stops it. Data is an in-memory
demonstration, not persisted content management. The fixture has no default test script.

Keep the sibling viewer beside this service; static resources come from its public
directory. See [viewer instructions](../viewer/README.md). `createApp({ notices, now })`
is the existing testable server factory; main.mjs is the process entrypoint.
The injected clock supplies generatedAt. API clients use `GET /api/notices`.

An [earlier design note](docs/earlier-design.md) is historical context, not a current
source of truth. Confirm behavior in the current server and viewer before reuse.
