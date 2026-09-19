# 可选 CLI 操作流程

[English](../en/walkthrough.md)

本篇供 Agent/维护者按需查阅，不是用户每次需求都必须执行的步骤。
先按[安装指南](installation.md)安装 CLI，再进入选定工作区；也可从其他位置用 `--root` 明确选择：

```sh
clinx --version
cd /path/to/project
```

不需要源码目录或 shell 包装函数。默认输出可读文本，程序消费时使用 `--json`，
命令细节与例子见 `clinx COMMAND --help`。只有需求和工程时，
先按[从需求开始](cold-start.md)调查，不需要初始化。

## 1. 选择必要结构

新能力尽早运行完整切片；混合需求逐能力判断复用、扩展、组合、新建或未知。
小任务用 Skill 和普通工具即可，长任务再考虑持久化。

```sh
clinx inspect --root /path/to/project
```

`inspect` 只读命令和文档候选，不执行或初始化工程。已有 Skill 直接复用；仅在需要安装工作区副本时执行：

```sh
clinx init --root /path/to/project --agent codex --apply
```

去掉 `--apply` 可先只读预览。写入 Skill、许可、入口与文件归属记录，不等于业务工程已配置。
阅读 `clinx/agent-entry.md`，按需与宿主指令整合。将 `.clinx/`
加入既有私密输出忽略规则。init 不生成业务配置。

Agent 调查后用[配置模板](../../templates/workspace/clinx.config.json)起草实际配置：
选择相关源代码、配置、依赖锁和检查；广泛选择目录时显式排除生成报告与私密记录。
没有隐式忽略目录的规则，也不能为了让结果“新鲜”而排除实际相关输入。

## 2. 调查与约定

例如：“把现有可选项查询接入选择器。追踪当前 UI/API/领域链路，
查明过滤规则和总数归属，在兼容处复用。不要新增价格逻辑、存储或发布。”

这只是调查方向，不预设当前服务确实拥有相应能力。
诊断任务不直接实现；要求确认方案时，等待确认前不提前编码或实现该功能的测试。

长任务用[约定模板](../../templates/workspace/clinx/contract.example.json)记录实际结果、范围、
不变量、决策与授权。把真实验收条件对应到检查或明确外部缺口；详细方案用引用避免重复。

```sh
clinx task add --root /path/to/project --file /path/to/proposal.json
```

结构有效不表示方案正确或验收完备，这仍需要 Agent 与责任方判断。

## 3. 实现与验证

Agent 使用现有编辑器、终端、浏览器和已授权平台工具。CLI 不启动模型或自动推进阶段。

```sh
clinx verify TASK-ID --root /path/to/project --run
```

所选 argv、脚本、输入与副作用已审阅且有授权时，直接执行。
不熟悉或发生实质变化时，去掉 `--run` 先预览；不是每次都必须额外调用预览。
执行结果提供记录路径和结论；
看 `verdict.checks` 定位具体检查、原因和原始日志。
缺工具查真实安装/运行步骤，零用例查选择与报告，UI/API 不一致查请求与状态。
修原因，不修报告；最后一次改动后重跑受影响检查，再对照原始需求。

本地条件获得支持不意味着浏览器或真实集成已经验证。
有权限与工具时完成必要观察；遇到真实阻碍则交接目标、动作、预期结果与恢复条件。
真实原生观察已支持约定结果、但 CLI 聚合仍未决时，按[交付示例](evidence.md#完成交付而不只是获得-cli-通过)
分别说明，不需要新增审批命令或伪造通过报告。

## 4. 保存足够的续接信息

需要交接、中断或重要里程碑时，写符合
[检查点 Schema](../../schemas/checkpoint-input.schema.json) 的说明，
包含 `focus`、`state`、`summary`、`next` 和必要的 `blockers`。

```sh
clinx task checkpoint TASK-ID --root /path/to/project --file /path/to/note.json
```

新会话已知任务时直接恢复：

```sh
clinx context TASK-ID --root /path/to/project
```

只有不确定目标任务时才用 `clinx task list`；需要下一页时把返回的 `nextAfter`
传给 `--after`。配置或当前源不可用时，`clinx task show TASK-ID` 可读取已存约定与交接，
不代表当前适用性。保存检查点后不必立即列任务或恢复上下文。

新 Agent 先确认任务、输入变化、仍在运行的进程和授权状态，再继续。
旧记录中的下一步不授权重放远端写操作。

## 5. 按授权修订

用户明确改变语义后，判断哪些工作仍有效，准备完整的新任务约定：

```sh
clinx task revise TASK-ID --root /path/to/project --file /path/to/revised.json --reason "User clarified count semantics"
clinx reconcile TASK-ID --root /path/to/project --receipt .clinx/runs/RUN-ID/receipt.json
```

保留原 JSON，旧记录因约定变化失去当前适用性；不回滚代码、不重放命令。
检查受影响工作；要取得当前 CLI 支持，重新运行所选声明，核验不会跨陈旧记录复用通过项。
旧方案路径迁移或检查被替换时，新约定引用实际后继即可，不必恢复占位旧文件。
方案历史内容由已有版本管理保留。详见[恢复](cli.md#恢复)。

## 6. 保留可复用知识

稳定能力或不变量变化时修正原地图与指南，失败变成回归测试，一次性决定留在任务。
没有有用新知识无需另写复盘。不要把推送、部署或知识发布当作自动后续动作。
详见[项目接入](adoption.md)和[CLI 语义](cli.md)。
