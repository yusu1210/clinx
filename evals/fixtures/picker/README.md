# Eligible-item picker

This local example exposes an in-memory catalog through an HTTP handler.
Run the existing tests with an available Node runtime:

```sh
node --test catalog.test.mjs
```

The tests exercise the domain and a loopback HTTP server with isolated synthetic data.
No dependency installation, external service or persistent datastore is required.
Inspect the source and the actual requirement before changing behavior.
