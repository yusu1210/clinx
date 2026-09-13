# clinx — AI-native 全栈研发

clinx 提供 AI-native 全栈研发方法论、可移植的 Agent Skill 和可选 CLI。
Agent 在约定授权内使用工程已有工具，让需求跨越所需边界，形成经过验证的实际结果。
CLI 按需在本地保存任务约定和检查结果；方法与 Skill 不依赖 CLI。

[English](README.md) · [文档](docs/zh-CN/README.md) · [方法论](docs/zh-CN/method.md) · [Skill](skills/clinx-delivery/SKILL.md) · [CLI](docs/zh-CN/cli.md)

给 Agent 需求和工程地址即可开始。Agent 阅读相关代码，约定目标行为，使用工程已有工具
实现并运行结果，最后说明实际验证了什么。这套过程称为**调查 → 约定 → 实现 → 验证 → 沉淀**。

## 先走一遍完整案例

[实操：从 PRD 到可运行的交付](docs/zh-CN/hands-on.md)从一个未完成需求的公告板开始：
复制原始工程 → 给 Agent 请求 → 确认方案 → 实现并操作页面 → 按需记录与续接。
包含完整命令、任务 JSON、预期现象，以及从零开发和企业工具接入的用法。
想先体验成品，可运行[阅读清单](examples/reading-list/README.zh-CN.md)。

## 用在你的需求上

让 Agent 访问已审阅的 clinx 本地目录，然后给出请求：

> 读取 /path/to/clinx/skills/clinx-delivery/SKILL.md。
> 需求：[PRD 或描述]。工程：[仓库 URL 或本地目录]。
> 实现所需行为。先检查已有能力，再运行相关测试和实际使用链路。
> 说明如何使用和停止、哪些检查通过、哪些结果尚未验证。
> 遵守约定的确认点。遇到无法从工程中查明的决定或权限问题再询问。
> 不合并、不部署。

如果只需要设计、诊断或评审，在请求中说明。开始时无需准备项目地图、技术方案或任务 JSON。
完整请求与流程见[从需求开始](docs/zh-CN/cold-start.md)。

可以指定确认点，例如先确认方案，再由 Agent 在约定范围内编码和测试。
既有强制审批仍然适用。范围与授权见[协作与授权](docs/zh-CN/collaboration.md)。

“全栈”覆盖结果所需的边界，不规定语言、框架、页面、API 或数据库。
新需求和部分复用需求共用同一闭环。

## 按需使用

| 组成           | 用途                                         |
| -------------- | -------------------------------------------- |
| 方法与 Skill   | 指导调查、实现、验证与交接                   |
| 工程地图与指南 | 保存已核实的事实与可复用操作步骤             |
| 可选 CLI       | 记录任务约定、检查点、检查结果及本地输入变化 |
| 工程已有工具   | 编辑、构建、测试、浏览器和已授权平台操作     |

优先复用现有知识与工具；[模板](templates/workspace)用于补齐实际缺口，按需使用。
详见[项目接入](docs/zh-CN/adoption.md)与[工作区布局与知识归属](docs/zh-CN/workspace.md)。
各源工程不必补齐统一文档骨架，也不必分别初始化。

## 需要记录时构建 CLI

需 Node.js 22.16+ 与 npm。命令执行支持 macOS/Linux；
这是 CLI 自身的运行依赖，不限制目标工程的语言。

```sh
git clone https://github.com/yusu1210/clinx.git
cd clinx
npm ci
npm run build
node bin/clinx.mjs --help
node bin/clinx.mjs inspect --root /path/to/project
```

运行前审阅源码与脚本；需要可复现性时固定提交。
`inspect` 从本地文件列出命令候选，不执行命令，也不判断运行环境是否就绪。

需要在工作目录安装 Skill 时，先预览再写入：

```sh
node bin/clinx.mjs init --root /path/to/project --agent codex
node bin/clinx.mjs init --root /path/to/project --agent codex --apply
```

这会添加 Skill、许可与 `clinx/agent-entry.md`；文件冲突时停止，不修改宿主指令。
省略 `--agent codex` 使用通用目录。只有实际任务需要时，才根据已核实的工程事实补充配置、地图或指南。
详见[CLI 操作流程](docs/zh-CN/walkthrough.md)。

## 运行示例

在已构建的 clinx 目录执行：

```sh
node bin/clinx.mjs verify eligible-picker --root examples/node-picker
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --run
```

前者预览检查，后者运行领域和回环 HTTP 测试并保存本地执行记录。
示例的 `release-ready` 声明仍为未决：本地测试不能证明发布条件已满足。

其他示例覆盖[页面/API/持久化](examples/reading-list/README.zh-CN.md)
与 [Maven 多模块构建](examples/maven-reactor/README.zh-CN.md)。
这些合成示例演示具体边界，不是生产应用。

跨仓任务可运行[兄弟工程 HTTP 示例](examples/multi-source/README.zh-CN.md)：
一个协调目录、源拥有的文件引用，以及按任务绑定的相关输入。

## 验证与适用范围

按[验证指南](docs/zh-CN/validation.md)执行测试、覆盖率、独立包安装与 Maven 检查。
[评测协议](docs/zh-CN/evaluation.md)单独测量 Agent 交付效果；目前尚未证明普遍提效。

命令继承当前权限、环境与网络。clinx 不是沙箱、Agent 运行时、环境构建器或部署平台。
本地执行记录与[附件](docs/zh-CN/evidence.md)不能提供审批或证明远端状态。
详见[安全边界](SECURITY.zh-CN.md)和[已知限制](docs/zh-CN/architecture.md#限制)。

MIT 许可。使用已审阅的源码或本地包；本项目尚未发布到 npm。
支持 Skill、CLI 与 JSON Schema。CLI 不调用模型，也不包含遥测或自动发布。
见[贡献指南](CONTRIBUTING.zh-CN.md)与[更新记录](CHANGELOG.zh-CN.md)。
