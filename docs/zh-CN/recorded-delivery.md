# 同一需求的可选记录与续接

[English](../en/recorded-delivery.md)

这是[实操案例](hands-on.md)的 Agent/维护者参考，不是用户开始任务前必须阅读的教程。需要留存验收或跨会话交接时再使用。命令与 JSON 展示可检查的内部过程，通常由 Agent 完成。

## 只保留续接，不建立验证计划

只需续接时，在 `clinx.config.json` 声明相关来源输入，需要检查时再添加 checks。
最小任务约定可以是：

```json
{
  "version": 1,
  "id": "2026-09-19-notice-visibility",
  "title": "Investigate notice visibility",
  "outcome": "Identify the current visibility rule and unresolved consumer behavior",
  "mode": "diagnosis",
  "scope": ["Visibility owner and affected consumers"]
}
```

使用 `task add`，再以普通 summary/next/blockers 使用 `task checkpoint` 和 `context`。
该约定没有验收结论。执行 `verify` 前，通过 `task revise` 一起添加 `defaultClaim`、`claims`
和 `obligations`。现有来源与任务绑定检查仍然生效；省略声明不授权无绑定采集或执行。
机器续接没有额外价值时，任务文档仍然足够。

## 记录同一需求

如果一次对话已经交付，跳过这节即可。长任务、多人交接、跨工程改动或需要检查记录时，
让 Agent 准备并解释配置；下面提供可直接核对的完整起点。

使用[已安装 CLI](installation.md)，指定案例副本的实际路径：

```sh
clinx_case=/absolute/path/to/noticeboard
clinx inspect --root "$clinx_case/service"
```

`inspect` 只读候选命令，不执行；相关命令已明确并审阅时可跳过。Skill 已可用时，
添加记录不需要 `init`。
让 Agent 把 `.clinx/` 加入项目私密输出忽略规则。
程序消费命令结果时显式加 `--json`。

让 Agent 创建并审阅 `noticeboard/clinx.config.json`：

```json
{
  "version": 1,
  "name": "noticeboard",
  "sources": [
    { "id": "service", "path": "service", "inputs": ["src", "test", "package.json"] },
    { "id": "viewer", "path": "viewer", "inputs": ["public"] }
  ],
  "checks": [
    {
      "id": "api-tests",
      "source": "service",
      "description": "Execute the reviewed HTTP test suite",
      "command": ["node", "--test", "--test-reporter=junit", "test/api.test.mjs"],
      "result": { "format": "junit", "from": "stdout", "minTests": 1 }
    }
  ]
}
```

这里的 JUnit 是 Node 输出的通用测试报告格式，不是要求使用 Java。其他工程使用自己的测试工具；
CLI 也支持只看退出状态的 `exit-code` 结果，但它不声称执行了测试。详见[结果格式](cli.md)。
这个起点只防止零测试；调查真实测试名称后，可增加 `expectedTests` 和恰当的最小数量。
CLI 不判断测试断言是否充分，不要把“测试命令通过”命名成“产品需求全部满足”。

再让 Agent 创建案例根目录下的 `proposal.json`：

```json
{
  "version": 1,
  "id": "scheduled-notices",
  "title": "Scheduled public notices",
  "outcome": "The API and existing board show only notices visible at server time",
  "mode": "implementation",
  "scope": ["Service visibility rules, API tests and existing viewer integration"],
  "authority": [
    "Local implementation and verification after the requested design confirmation; no publication"
  ],
  "context": [{ "path": "PRD.md", "why": "Original acceptance requirements" }],
  "defaultClaim": "local-checks",
  "claims": ["local-checks", "local-product"],
  "obligations": [
    {
      "id": "api-suite",
      "description": "The selected HTTP test suite runs at least one passing test without failures",
      "claims": ["local-checks", "local-product"],
      "checks": ["api-tests"]
    },
    {
      "id": "product-acceptance",
      "description": "Review PRD coverage and observe the current browser journey",
      "claims": ["local-product"],
      "external": "Review actual assertions against the PRD and operate the final browser through normal, reload, empty, error and recovery states. Record observations and gaps."
    }
  ]
}
```

`authority` 记录实际约定，不提供权限或伪造批准。把额外确认条件写进真实方案和约定，不能靠这个例子代替。
审阅后运行：

```sh
clinx task add --root "$clinx_case" --file "$clinx_case/proposal.json"
clinx verify scheduled-notices --root "$clinx_case" --claim local-product --run
```

`task add` 已校验约定，无需立即重复 `validate` 或 `context`。执行前审阅命令与副作用；
需要 CLI 预览时省略 `--run`，它不代表又一个强制人工确认点。`--run` 保存 `.clinx/runs/` 下的回执与日志。
选择当前需要的验收声明，不为展示不同标签重复运行同一检查。`local-checks` 仅覆盖测试套件；
示例中的 `local-product` 命令仍返回退出码 2：CLI 不能自动判定浏览器与 PRD 审阅项。
这不是要求 Agent 停工，也不是说已经做过的浏览器观察无效；交付时分别报告原生观察和机器聚合结果。
保留观察附件的方法见[证据附件](evidence.md)，附件不会变成人工审批或自动“绿灯”。

## 中断后继续

让 Agent 在需要交接时创建 `resume.json`，填写真实状态，例如：

```json
{
  "focus": "verify",
  "state": "handoff",
  "summary": "API suite passed; browser verification is not yet performed. No owned service remains running.",
  "next": "Start the service, operate the browser acceptance states, stop the owned process and report observations.",
  "blockers": []
}
```

仅在这些内容属实时保存；已完成浏览器验证就记录实际结果，不照抄未完成状态。

```sh
clinx task checkpoint scheduled-notices --root "$clinx_case" --file "$clinx_case/resume.json"
```

在新对话中提供案例目录，要求继续这个需求。Agent 定位已存任务，读取 `context`，
确认输入变化和授权后继续。仅在 Skill 尚不可用时提供其路径；多个任务可能匹配时再明确任务。
若要核对旧检查，执行 `clinx reconcile scheduled-notices --root <案例目录> --receipt <实际回执路径>`。
`--receipt` 原样粘贴 `verify` 返回的 `receipt` 路径；相对路径基于 `--root`，不是 shell 当前目录。
旧回执能说明当时发生什么，但源码、需求或检查定义变了，就不能直接支持当前版本；
Agent 应定位变化并重跑受影响验证，而不是自动重放发布等外部动作。
