# clinx — AI-native 全栈研发

面向 Agent 主导需求交付的方法论、可移植 Skill 与可选 CLI。
从需求和新建或既有工程出发，在约定授权内实现并验证实际行为。

[English](README.md) · [文档](docs/README.zh-CN.md) · [方法论](docs/method.zh-CN.md) · [Skill](skills/clinx-delivery/SKILL.md) · [CLI](docs/cli.zh-CN.md)

**Discover / 调查 → Contract / 约定 → Build / 实现 → Verify / 验证 → Learn / 沉淀。**
Agent 调查真实系统，明确改动，运行并修复完整切片，对照原始需求验收，再保留有用知识。
实际研发使用工程已有工具；clinx 提供方法与可选记录能力。

## 从需求与工程开始

让 Agent 访问已审阅的 clinx 本地目录，然后给出请求：

> 读取 /path/to/clinx/skills/clinx-delivery/SKILL.md，完成以下需求。
> PRD：[文件或链接]；工程：[仓库 URL 或本地目录]。
> 调查当前能力和归属，选择最小完整改动，实际运行并验证结果。
> 交付使用/停止方法、证据与剩余缺口。遵守约定确认点；
> 只询问调查无法解决的重要决定或访问缺口。不合并、不部署。

如果只需要设计、诊断或评审，请明确说明。不要求预先准备地图、技术方案或任务 JSON。
实际过程见[从 PRD 开始](docs/cold-start.zh-CN.md)。

交付终点与确认频率分别约定。例如：实现前确认方案，之后在约定范围内自主编码与测试。
既有强制审批仍然适用。详见[协作与授权](docs/collaboration.zh-CN.md)。

“全栈”覆盖结果所需的边界，不规定语言、框架、页面、API 或数据库。
新需求和部分复用需求共用同一闭环。

## 选择需要的支持

| 组成           | 用途                                         |
| -------------- | -------------------------------------------- |
| 方法与 Skill   | 调查、能力选择、实现、验证与恢复             |
| 工程地图与指南 | 保存有来源的知识与可执行步骤                 |
| 可选 CLI       | 保存任务约定、检查点、命令结果，核对输入变化 |
| 工程已有工具   | 编辑、构建、测试、浏览器和已授权平台操作     |

优先复用现有知识与工具；[模板](templates/project)用于补齐实际缺口，按需使用。
详见[项目接入](docs/adoption.zh-CN.md)。

## 构建可选 CLI

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

安装和执行前审阅源码与脚本；需要可复现性时固定已审阅的提交。
`inspect` 发现本地命令候选，不执行命令，也不判断运行环境已就绪。

需要项目内 Skill 时，先预览再写入：

```sh
node bin/clinx.mjs init --root /path/to/project --agent codex
node bin/clinx.mjs init --root /path/to/project --agent codex --apply
```

这会添加 Skill、许可与 `clinx/agent-entry.md`；文件冲突时停止，不修改宿主指令。
省略 `--agent codex` 使用通用目录。配置、地图和指南在有用时根据调查结果创建。
详见[CLI 操作流程](docs/walkthrough.zh-CN.md)。

## 运行示例

在已构建的 clinx 目录执行：

```sh
node bin/clinx.mjs verify eligible-picker --root examples/node-picker
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --run
```

前者预览，后者运行领域和回环 HTTP 测试并保存本地执行记录。
增加 `--claim release-ready` 仍是未决：本地测试不能证明发布条件已满足。

其他示例覆盖[页面/API/持久化](examples/reading-list/README.zh-CN.md)
与 [Maven 多模块构建](examples/maven-reactor/README.zh-CN.md)。
这些合成示例演示具体边界，不是生产应用。

## 验证与限制

按[验证指南](docs/validation.zh-CN.md)执行测试、覆盖率、独立包安装与 Maven 检查。
[评测协议](docs/evaluation.zh-CN.md)单独测量 Agent 交付效果；目前尚未证明普遍提效。

命令继承权限、环境与网络。clinx 不是沙箱、Agent 运行时、环境构建器或部署平台。
本地执行记录与[附件](docs/evidence.zh-CN.md)不提供可信认证或审批。
详见[安全边界](SECURITY.zh-CN.md)和[已知限制](docs/architecture.zh-CN.md#限制)。

MIT 许可。使用已审阅的源码或本地包；本项目尚未发布到 npm。
支持 Skill、CLI 与 JSON Schema，不调用模型、不收集遥测、不自动发布。
见[贡献指南](CONTRIBUTING.zh-CN.md)与[更新记录](CHANGELOG.zh-CN.md)。
