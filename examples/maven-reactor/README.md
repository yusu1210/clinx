# Synthetic Maven reactor

[中文](README.zh-CN.md)

Requires an existing Maven and JDK 17+. clinx does not install them. Maven resolves
pinned public build/test dependencies into this fixture's `.clinx/m2` cache.

```sh
node bin/clinx.mjs verify shared-policy --root examples/maven-reactor --run
```

Run from the clinx repository after building. Two modules produce separate Surefire
reports and three named tests. Checking only the root POM or using old reports must
not satisfy the claim. `npm run test:maven` also exercises a zero-exit no-op against
the old reports as a negative control in an isolated copy.
