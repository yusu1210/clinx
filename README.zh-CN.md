# clinx — AI-native 全栈研发

clinx 帮助 Agent 从需求和现有代码出发，交付可运行、经过验证的结果。项目提供一套可移植的工程方法、两份 Agent Skill，以及用于持久化上下文和证据的可选 CLI。

[English](README.md) · [开始使用](docs/zh-CN/cold-start.md) · [实操教程](docs/zh-CN/hands-on.md) · [文档导航](docs/zh-CN/README.md)

## 从需求开始

先[接入已审阅的 Skill](docs/zh-CN/installation.md)，或复用宿主、团队已有的副本。只用 Skill 不需要 Node.js、CLI 配置、工程地图或任务 JSON。

然后用普通语言把任务交给 Agent：

> 在当前业务上下文中，按 clinx 完成这份 PRD：`<文件或链接>`。
> 先跟我确认关键方案，再实现并在本地验证；不推送、不部署。

低风险任务可以在首次请求中直接授权实现；只需要设计、诊断或评审时也应明确说明。Agent 会调查相关代码和工程工具、复用已有能力，并在确实缺少产品决定或操作权限时询问。具体约定见[协作与授权](docs/zh-CN/collaboration.md)。

一次可用的交付应说明：

- 改了什么，复用了哪些已有能力；
- 如何运行、体验和停止结果；
- 实际观察了什么，包括相关失败场景；
- 还有哪些问题未解决或未验证。

“全栈”指结果涉及的完整边界，不要求每个任务都新增页面、API 和数据库。

## clinx 适合哪些任务

| 任务         | clinx 如何参与                               |
| ------------ | -------------------------------------------- |
| 从零实现     | 澄清必要决定，尽早跑通一条完整链路           |
| 修改现有系统 | 追踪当前语义、规则归属和受影响消费者         |
| 跨仓协作     | 从一个工作区协调，不搬迁或逐仓初始化         |
| 中断后继续   | 恢复需求、变化和未决事项，不盲目重放操作     |
| 维护工程知识 | 核对当前来源、纠正过期说明，让后续任务找得到 |

方法是 **调查 → 约定 → 实现 → 验证 → 沉淀**。这五步用于持续核对交付质量，不是五道审批门禁。

- [`clinx-delivery`](skills/clinx-delivery/SKILL.md) 用于软件变更。
- [`clinx-knowledge`](skills/clinx-knowledge/SKILL.md) 用于独立调查和可复用工程知识。

两份 Skill 都可以脱离 CLI 使用。[实操教程](docs/zh-CN/hands-on.md)从一份未完成的 PRD 开始；[知识教程](docs/zh-CN/knowledge.md)处理过期指南、实现冲突和后续复核。两个案例均为原创合成工程。

## 需要记录时再加 CLI

CLI 可以保存任务约定、选定输入、交接记录、检查结果和本地观察，适合长任务、跨会话续接和重复验证。它不调用模型，也不替代工程原生工具。

CLI 目前通过已审阅源码或本地发行包分发，**尚未发布到 npm registry**。运行环境为 macOS 或 Linux、Node.js 22.16 及以上版本和 npm。安装方式见[接入指南](docs/zh-CN/installation.md)。

```sh
clinx status
clinx COMMAND --help
```

`clinx status` 只报告本地接入状态和已保存任务，不运行检查，也不自动选择任务。机器调用使用 `--json`。任务记录、续接方式和精确命令语义见[记录与续接](docs/zh-CN/recorded-delivery.md)、[CLI 参考](docs/zh-CN/cli.md)和[工作区归属](docs/zh-CN/workspace.md)。

## 适用边界与证据

clinx 不限定业务工程的语言、框架或部署平台，而是复用工程已有的构建、测试、浏览器和平台工具。

本地检查通过，只能支持该检查实际观察到的结论，不能证明远端状态、集成验收、发布授权或已保存知识的正确性。命令继承当前进程的权限、环境和网络访问。clinx 不是沙箱、Agent 运行时、环境构建器或部署系统。

[验证指南](docs/zh-CN/validation.md)说明仓库与发行检查；[评测协议](docs/zh-CN/evaluation.md)说明 Agent 效果试验，目前尚未证明普遍提效。信任模型和敏感数据边界见[安全说明](SECURITY.zh-CN.md)。

MIT 许可。公开接口包括 Skill、CLI 和 JSON Schema。CLI 不收集遥测，也不会自动发布。

[贡献指南](CONTRIBUTING.zh-CN.md) · [更新记录](CHANGELOG.zh-CN.md)
