# 验证指南

[English](../en/validation.md)

在已审阅的源码目录中，使用 macOS/Linux、已有 Node.js 22.16+ 和 npm：

```sh
npm ci
npm run check
npm run test:coverage
npm run test:package
npm run test:maven
```

`check` 检查格式与类型、构建 Schema、运行单元/集成回归，并检查链接、翻译复核字节绑定、公开文件卫生和元数据。
翻译摘要检测指南变化，不证明语义等价。
覆盖率统计编译后的 CLI 模块与入口，不代表 Skill 效果或浏览器验收。

`test:package` 创建本地包、检查路径和解包后的内容，在独立临时目录安装，
验证安装后的命令、示例、评测 CLI 的准备与执行，以及 Skill 接入；不发布、不全局安装。
独立安装会从 npm 注册表解析固定版本的公开依赖，除非它们已有缓存。
`test:maven` 要求已有 JDK 17+ 与 Maven，运行两个模块的指定用例，
然后用空操作反例确认旧报告不能通过。可能下载公开依赖至隔离缓存。
临时测试目录可能保留用于诊断。

## 可解释的本地记录

仓库提供自检约定：

```sh
node bin/clinx.mjs verify project
node bin/clinx.mjs verify project --run
node bin/clinx.mjs verify project --claim public-release --run
```

最后一条在外部发布条件未解决时应返回退出码 2，即使所有本地检查通过。
它不授予发布权限。自检范围小于上方完整发布检查。
发布候选的版本、运行时、命令、结果和限制应在分发源码之外记录，
原始 `.clinx` 记录保持私密。

## 不能据此推断什么

- 已覆盖一切缺陷、安全属性或所有工程工具链。
- HTTP 测试或 DOM/fetch 替身已经验证真实浏览器交互。
- 合成示例已经证明企业集成、审批与生产资格。
- 工作流文件存在就表示托管 CI 已经通过。
- 确定性测试通过就说明 Agent 普遍提效。

方法与 Skill 的实际收益按[评测协议](evaluation.md)测量；
发布由[维护者检查清单](../../CONTRIBUTING.zh-CN.md#发布准备)控制。
