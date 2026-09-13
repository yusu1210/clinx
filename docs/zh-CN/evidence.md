# 任务证据附件

[English](../en/evidence.md)

附件保存已审阅的浏览器操作、原生工具输出或目标观察，可与 CLI 执行记录一并查看。
这是可选本地归档，不是远端验证器、人工审批、签名或强制通过入口；失败同样应保留。

## 记录真实观察

先完成已授权观察并审阅、脱敏。文件可放在工作区内，例如 `.clinx/inbox/`，或直接引用任务源内的原文件；
选择宽源范围时显式排除 `.clinx`。工具不下载 URL、不自动脱敏，也不应编造观察填表。

以下仅展示结构，不声称已发生相应观察：

```json
{
  "obligations": ["browser-behavior"],
  "observedAt": "2026-01-01T10:00:00.000Z",
  "observer": "reviewer or tool identity",
  "method": "manual",
  "target": {
    "identity": "explicit service/environment/consumer",
    "revision": "observed version or explicit unknown"
  },
  "outcome": "inconclusive",
  "summary": "Actual actions, expected behavior and observed result",
  "artifacts": [{ "path": ".clinx/inbox/journey.txt", "description": "Reviewed raw observation" }],
  "limitations": ["Target version has not been established"]
}
```

`method` 为 manual 或 tool，不代表可信认证；
`outcome` 是观察者声明的 pass/fail/inconclusive，不是 CLI 验收结论。
条件 ID 必须存在；未来时间、空白字段、无附件、重复 ID 和未知字段会拒绝。
未知版本明确写未知，不猜。

```sh
clinx evidence attach TASK-ID --root PROJECT --file observation.json
clinx evidence list TASK-ID --root PROJECT
clinx evidence list TASK-ID --root PROJECT --record UUID
```

输入 JSON 路径相对 shell cwd。附件可使用可选的 `source`：
`{ "source": "service", "path": "reports/journey.txt", "description": "Reviewed trace" }`。
路径相对指定的任务源；省略 `source` 时相对 `--root`，与 JSON 放在哪里无关。
无需先把源文件复制到工作区。未知或任务范围外的源、重复的完整引用、越界和符号链接均拒绝。
源范围不是操作授权。
最多 8 个非空普通文件，每个 8 MiB、合计 16 MiB。
大录屏可导出聚焦片段或引用私密归档，但不能截掉必要证据后宣称覆盖完整。

attach 复制文件到新的 `.clinx/evidence/TASK-ID/UUID/`，计算哈希，
并绑定采集时任务/方案、任务相关定义与源。每个制品保留带源身份的 `original` 引用；
后续删除或替换原文件不改变已复制的字节，但声明输入变化仍会影响本地绑定。
归档完整性以副本为准，不重新读取原文件。它不覆盖旧记录、不执行项目命令。
元数据最后写入；中断可能留下无效部分记录，需要检查指定目录，不自动破坏性清理。
保持 `.clinx/` 不进入版本控制，文件权限不能代替敏感信息审阅。

## 正确解释列表

| 字段                       | 表示                       | 不表示                 |
| -------------------------- | -------------------------- | ---------------------- |
| `integrity: intact`        | 字节长度和哈希匹配记录     | 内容正确或来源可信     |
| `localBinding: matches`    | 本地声明输入匹配采集时状态 | 远端运行的就是这些输入 |
| `localBinding: changed`    | 本地绑定变化               | 原观察全部错误         |
| `localBinding: unknown`    | 无法建立当前绑定           | 可以放心复用           |
| `remoteState: not-checked` | 没有查询远端版本/新鲜度    | 远端事实仍有效         |

列表重新检查字节、隔离坏记录、保留相互冲突的结果，不静默选最新 pass。
缺失或改过的附件无效。绑定时间是采集时间，不一定是早先观察时间。
本地未变时远端数据或消费者也可能变化；有权限者可同时替换记录与哈希。

列表最多处理 1024 条目录记录、读取 128 MiB 附件；
超出字节预算的条目标为 `integrity: not-checked`，不当作无效或通过。
使用 `--record UUID` 单独检查。源根不可用时，本地绑定未知，但仍可查看完整附件。
配置无效仍是命令错误；工具不为适应上限而删除旧记录。

列表退出零只表示完成列举。外部验收仍未决，附件不满足确定性检查；
做交付陈述时要同时查看，不能让局部通过遮住集成失败。
已有授权工具能确定性验证真实目标时，可注册它的真实检查与结果格式；
不能把人工文字声明伪造成通过的 JUnit。

## 完成交付，而不只是获得 CLI 通过

宿主 Agent 根据真实观察和决策来源判断是否达到约定目标。
CLI 的 `unresolved` 可能仅表示不能解释外部条件，不代表没人观察过目标。
不能因此停止仍可完成的验证，也不能忽略真实失败、未知版本或尚未取得的批准。

例如，约定目标是阅读清单的集成验证，不包含发布。完成相应观察后，交接应写明：

- **输入与权限规则**：实际运行了哪些本地断言和用例，附确切执行记录与原生输出。
- **刷新与授权**：在已识别的构建版本和身份上操作浏览器，记录保存后的显示、被拒绝的操作，
  并附已审阅的 Trace 与接收端结果。
- **交付判断**：将两类观察逐项对应原始验收，说明集成结论的限制。

这里只展示假设成立时的报告形态，不是一次已完成的运行。应填入实际目标、构建、时间和限制，
不能照抄结论。浏览器条件若保存为 `external`，同时说明 CLI 仍为 `unresolved`，
原因是附件不具备认证效力；保留该原始结果。发布不在本次范围，也未执行。
若操作失败或无法识别版本，则报告集成失败或未完成，并给出可执行的下一步；
新的附件或本地通过不能消除这个缺口。

强制审批必须从有权来源核对当前决定、准确对象、范围与有效性，沿用既有平台。
Agent 的交付判断和本地附件都不能产生审批权限。
