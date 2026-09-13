# Synthetic Maven reactor

[中文](README.zh-CN.md)

Requires an existing Maven and JDK 17+. clinx does not install them. Maven resolves
pinned public build/test dependencies into this fixture's `.clinx/m2` cache.

```sh
clinx example copy maven-reactor --to ./maven-demo
cd maven-demo
clinx verify shared-policy --run
```

Use an installed CLI; no clinx checkout is needed. Two modules produce separate Surefire
reports and three named tests. Checking only the root POM or using old reports must
not satisfy the claim. From the clinx source checkout, `npm run test:maven` also exercises a zero-exit no-op against
the old reports as a negative control in an isolated copy.
The CLI uses the project's existing tools; its implementation language does not
constrain the business project.
