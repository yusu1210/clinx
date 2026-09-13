# Synthetic eligible-item picker

[中文](README.zh-CN.md)

A synthetic domain and HTTP example demonstrating rule ownership, filtering before
pagination, matching counts and a loopback HTTP boundary. It has no browser UI.

With an installed CLI, copy the example and run inside it:

```sh
clinx example copy node-picker --to ./picker-demo
cd picker-demo
clinx verify eligible-picker
clinx verify eligible-picker --run
clinx verify eligible-picker --claim release-ready --run
```

The first execution should support `local-behavior`; the final command deliberately exits 2
because external release obligations are unresolved. Edit the predicate or the
referenced contract, then reconcile the old receipt: it must be stale. Regression
tests in the clinx test suite exercise the broken predicate as a negative control.

To adapt this pattern to a real picker, inspect existing selection ownership,
pagination, API and UI behavior first. A similar noun does not imply the same domain
model. Choose the smallest integration change consistent with the actual contract.
