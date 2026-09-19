# Reading list: a runnable full-stack slice

[简体中文](README.zh-CN.md)

A local example: a reader recommends a book, a librarian
marks it read, and the saved state survives a server restart. It contains a browser
interface, actual HTTP API, server-owned demo roles, and serialized file persistence.
Uses Node built-ins with no external services or third-party dependencies.

## Start, use and stop

Use an existing Node.js 22.16+ on macOS/Linux. If you do not yet have a copy, an
installed CLI can create one without a source checkout:

```sh
clinx example copy reading-list --to ./reading-list-demo
cd reading-list-demo
```

From the example directory:

```sh
node server.mjs
```

The first line prints an ephemeral loopback `url`, isolated temporary `dataDir`,
and separate `demoCodes.reader` / `demoCodes.librarian`. Open the exact URL and paste
the reader code. Submit a title and author; refresh and check the saved recommendation.
Choose **Change demo identity**, enter the librarian code and **Mark as read**.
Stop the owned server with Ctrl+C in its terminal (SIGTERM also stops it gracefully).

To check persistence, restart with the actual printed data directory:

```sh
node server.mjs --data-dir /path/to/your/temporary/data-directory
```

That path must be an isolated directory inside the system temporary directory or
`/tmp`, with an existing parent. Without `--data-dir`, startup creates a new list.
An optional `--port 43210` selects a port; conflicts fail, never kill another process.
Codes rotate on restart; open the newly printed URL and use the new code.
Temporary data survives process restart, not guaranteed OS cleanup or power loss.

## Verify the running boundaries

```sh
node --test test/http.test.mjs
clinx inspect
clinx verify reading-list --run
clinx verify reading-list --claim local-product --run
```

The clinx commands use the installed CLI. The first verify
supports `local-http`: real child processes, HTTP requests, role checks, invalid
inputs, concurrent saves, write failure and process restart. The JUnit reporter
contains **10 named testcases**; Node's summary also counts their parent (11).
Tests create and remove only their own temporary data and stop their own servers.
The parent repository's `npm run check` also runs two controlled client-ordering
regressions: newer refreshes win, and old responses cannot restore a logged-out view.
Those tests evaluate the actual client source with DOM/fetch doubles, not a browser.

The second verify deliberately returns exit **2: unresolved**. These automated tests
do not operate the actual browser; a `local-product` claim also needs that observation.
Exercise reader submission, validation, refresh, librarian action and offline feedback
with the browser before describing the product as locally verified. A historical
browser observation does not establish behavior after a later change.

## What it demonstrates

The slice connects the browser, API and persisted state.
The API, not a role selector, enforces the librarian action. Data is written before
success is returned. A failed disk write is visible and cannot become a saved item.
The default CLI claim is deliberately narrower than the product: tests and tool
availability do not prove that every requested user interaction works.

For a new independent Skill trial, use `node evals/prepare.mjs greenfield` from the
clinx root. It creates an empty project, not a copy of this solution. This example
must not be exposed as the expected answer during that trial.

## Deliberate limits

- Demo codes are random bearer capabilities visible to anyone reading the starting
  terminal. This is not production authentication, individual revocation, audit or
  TLS. The browser stores its code in tab-scoped sessionStorage. Test data only.
- One server owns a data directory through `server.lock`. After a forced crash,
  verify that no process still owns that dataset before manually removing only the
  stale lock. clinx and the example never steal it automatically.
- File writes are serialized and atomically renamed; no database backup, replication
  or power-loss durability is claimed. Corrupt saved data stops startup.
- Repeating mark-read is idempotent. Repeating recommendation creates another entry;
  after a lost response, refresh before retrying. There is no automatic write retry.
- Refresh explicitly to observe concurrent changes. No account administration,
  notifications, edit/delete/undo, deployment or arbitrary file serving is included.
- Production load, all mobile browsers, assistive technologies and hostile local
  filesystem mutation are not qualified. This is a learning/verification fixture,
  not an application security framework or a deployment template.
