# Visible notices: delivery decision

Use the existing path: the HTTP consumer calls the service, which applies the shared
visibility rule. Do not duplicate the rule in the consumer or change its response shape.

- [Policy](../../../../policy/src/visibility.mjs) owns whether a notice is active.
- [Service contract](../../../../service/docs/contract.md) owns the response meaning.
- [Service](../../../../service/src/server.mjs) filters items before calculating the total.
- [Consumer test](../../../../client/test/notices.test.mjs) starts the real local service
  with active and inactive notices and checks the consumer's titles and total.

The task depends on all three sources even though a future fix might edit only one.
Analytics is not on this path. The test uses a loopback server on an assigned free
port and closes the server it creates. No shared environment or deployment is authorized.

This design and the PRD are task inputs. Execution results belong in receipts or
separate validation notes, not in this design. The local check does not establish
browser behavior, production access, persistence or deployment readiness.
