# Documentation

[中文](README.zh-CN.md)

Start with the [method](method.md) and [PRD-only workflow](cold-start.md).
Use the [walkthrough](walkthrough.md) when the optional CLI is useful.

| Topic                           | English                            | 中文                                 |
| ------------------------------- | ---------------------------------- | ------------------------------------ |
| Method and positioning          | [Method](method.md)                | [方法论](method.zh-CN.md)            |
| Requirement + repositories      | [Cold start](cold-start.md)        | [从 PRD 开始](cold-start.zh-CN.md)   |
| Coordination and authorization  | [Collaboration](collaboration.md)  | [协作与授权](collaboration.zh-CN.md) |
| Existing knowledge and tools    | [Integration](adoption.md)         | [项目接入](adoption.zh-CN.md)        |
| CLI adoption and task lifecycle | [Walkthrough](walkthrough.md)      | [操作流程](walkthrough.zh-CN.md)     |
| Commands, models and exits      | [CLI](cli.md)                      | [CLI](cli.zh-CN.md)                  |
| Observation attachments         | [Evidence](evidence.md)            | [证据附件](evidence.zh-CN.md)        |
| Ownership and limits            | [Architecture](architecture.md)    | [架构与边界](architecture.zh-CN.md)  |
| Reproduce implementation checks | [Verification](validation.md)      | [验证指南](validation.zh-CN.md)      |
| Measure agent effectiveness     | [Evaluation](evaluation.md)        | [评测协议](evaluation.zh-CN.md)      |
| Contribute and release          | [Contributing](../CONTRIBUTING.md) | [贡献指南](../CONTRIBUTING.zh-CN.md) |
| Trust and reporting             | [Security](../SECURITY.md)         | [安全边界](../SECURITY.zh-CN.md)     |

The [Skill](../skills/clinx-delivery/SKILL.md) is the portable agent entrypoint.
The Skill uses English instructions; user guides and example entrypoints are bilingual.
Commands and JSON identifiers are the same in both languages. Evaluation inputs are
shared unchanged across comparison groups.

Examples: [domain/HTTP](../examples/node-picker/README.md),
[browser/API/persistence](../examples/reading-list/README.md),
[multi-module build](../examples/maven-reactor/README.md).
Their stacks illustrate boundaries; they do not define the method's scope.
