# 实操：从一份 PRD 到可运行的交付

[English](../en/hands-on.md)

这篇教程让你亲手走一遍：给已有公告板增加定时展示。起点是未完成需求的两个工程，
不是已经通过验收的答案。你提供 PRD 和路径，Agent 用 Skill 调查、提出方案、实现和验证；
需要留存检查与续接信息时，再为同一任务使用 CLI。

案例使用公开合成数据，但代码、HTTP 请求、页面交互和检查记录都能在本机实际运行。
它不是生产系统背书，也不要求你的项目使用案例中的语言或框架。

## 先分清谁做什么

| 你                                           | Agent 与 Skill                                                                          | 可选 CLI                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 提供需求、工程访问和授权；确认约定的关键决定 | Skill 是 Agent 阅读的操作指导；Agent 使用现有编辑、终端、测试、浏览器和平台工具完成工作 | 安装 Skill、记录任务、运行显式检查、保留输入与结果、辅助续接 |

Skill 不是可执行程序；CLI 不调用模型、不会自己开发或部署。没有 CLI 也能完成下文需求。
不要先让自己编写工程地图、配置和任务 JSON：需要时由 Agent 根据调查结果准备，你审阅重要边界。

## 1. 准备本地案例

需要已有 Node.js 22.16+ 与 macOS/Linux shell；案例没有第三方依赖。
先取得并审阅 [clinx 源码](https://github.com/yusu1210/clinx)，在源码根目录运行：

```sh
clinx_repo="$PWD"
clinx_demo=$(mktemp -d)
cp -R "$clinx_repo/evals/fixtures/noticeboard" "$clinx_demo/noticeboard"
printf '%s\n' "$clinx_repo/skills/clinx-delivery/SKILL.md" "$clinx_demo/noticeboard"
```

记住打印的两个绝对路径。这里使用 `evals/fixtures` 中的原始工程；不需要运行评测器。
临时目录用于隔离体验，不适合保存长期工作。你的真实需求应使用自己的受控工作目录。

```text
noticeboard/
  PRD.md           原始需求
  service/         已有 HTTP 服务、领域规则、测试及历史设计说明
  viewer/          已有页面；由 service 提供，不需单独安装或构建
```

[PRD](../../evals/fixtures/noticeboard/PRD.md)要求：只展示已发布且在服务端当前时间窗口内的公告；
开始包含、结束不包含；缺失或 null 表示不限制；非法时间及倒置窗口不能暴露内容。
API 与页面一致，`total` 和列表一致，保留顺序和既有接口，调用方不能伪造当前时间。
不增加调度器、数据库、身份系统或部署平台。

先体验改动前的系统：

```sh
npm --prefix "$clinx_demo/noticeboard/service" run test:api
node "$clinx_demo/noticeboard/service/src/main.mjs"
```

打开终端打印的 URL。初始页面会显示 `Welcome` 和已经过期的 `An old event`，
而原有测试仍能通过。这就是本次需求的缺口：**旧测试通过，不代表新需求完成。**
在这个终端按 Ctrl+C 停止自己启动的服务，再继续。

## 2. 把需求交给 Agent

在能读取本地文件、编辑并执行命令的 Agent 中发送下面的请求，将路径换成上一步打印的实际值。
不依赖宿主自动发现 Skill；直接要求读取文件即可。

```text
读取 <clinx绝对路径>/skills/clinx-delivery/SKILL.md，并按相关引用执行。
PRD：<案例绝对路径>/PRD.md。
工程：同目录的 service 和 viewer。
目标：实现 PRD，并在本地运行 API 和实际页面完成验证，交付使用与停止说明。
先调查当前实现、测试和历史说明，给我一份简短方案；等我确认后再实现。
确认后可自主修改这两个本地工程、测试和文档，并运行隔离的本地验证。
不要改写 PRD，不访问生产，不安装额外平台，不合并、不推送、不部署。
遇到工程能查明的问题请自行调查；真正缺少产品决定或权限时再问我。
```

下面是你应能核对的调查结果，不是声称某个 Agent 必然说出这些话：

- 当前规则由 `service/src/catalog.mjs` 提供；HTTP 服务调用它，页面消费 API。
- 现有 `createApp({ notices, now })` 可注入时钟，不必靠真实等待测试边界。
- 页面已有刷新、空态和错误态；应核验它们，不预设必须重写前端。
- 历史设计说明只能提供线索，不能替代当前源码和 PRD。

一个合适的方案应解释：时间规则由谁负责、如何保留接口、如何处理无效输入和精度、
直接 API 调用是否同样受限，以及准备怎样验证页面。不需要先决定每个函数名。
如果 Agent 提出新建调度系统，应让它解释这为什么是本需求所必需的。

审阅方案后，可以这样回复：

```text
确认你上条方案中所述的服务端过滤与既有页面复用方案。
按 PRD 的边界语义实现，完成原有测试、新增边界测试和真实浏览器验证。
确认后连续推进，无需逐文件问我。若发现会改变已确认语义或授权范围的问题，再停下确认。
交付目标仍是本地实现并验证，不包含上线。
```

这段确认应针对你实际看过的方案，不能不看内容直接作为通用批准。
低风险任务也可在初始请求中明确允许方案与实现连续推进；企业强制审批不因此失效。

## 3. 看见实际结果，而不只看“已完成”

Agent 应运行最终代码，并给出实际 URL、测试命令与结果。你也可以重新执行步骤 1 的启动命令。
在默认演示数据下，完成后的页面应只显示 `Welcome`，数量为 1；点击 Reload 仍保持一致。
直接打开同一服务的 `/api/notices`，返回列表与页面一致；附加 `?now=2099-01-01T00:00:00Z`
不能改变服务端判定时刻。

| 验收内容                             | 应看到的证据                                           |
| ------------------------------------ | ------------------------------------------------------ |
| 开始包含、结束不包含，缺省时间不限制 | 注入固定时钟的真实 HTTP 测试，覆盖端点前后             |
| 无效日期、无时区、倒置窗口不暴露内容 | 非法输入与反例测试，不只断言新增函数的返回值           |
| 时间转换不提前放行或提前隐藏         | 在输入精度高于运行时表示精度时验证边界判定             |
| 列表、顺序、总数、既有字段与路由     | API 响应及回归测试                                     |
| 页面、刷新、空态、失败和恢复         | 在最终版本上实际操作浏览器；仅取回 HTML 不等于页面验证 |

空态和错误态由 Agent 使用自有隔离数据、测试服务或浏览器工具制造并恢复；
不要为演示新增生产调试接口，也不要停止其他人的进程。
如果没有浏览器工具，Agent 应完成能做的 HTTP 验证，并给你具体页面操作、预期结果和未验证项，
不能写“全栈已验证”。最后一次相关修改之后，受影响验收需要重新执行。

交付至少应能回答：改了哪些工程、复用了什么、怎么运行和停止、哪些原始要求有实际证据、
哪些仍未验证。这不是要求另填一套表，而是让你能够接手结果。

## 4. 为同一需求使用 CLI

如果一次对话已经交付，跳过这节即可。长任务、多人交接、跨工程改动或需要检查记录时，
让 Agent 准备并解释配置；下面提供可直接核对的完整起点。

在步骤 1 的同一个 shell 中构建已审阅的 CLI：

```sh
cd "$clinx_repo"
npm ci
npm run build
clinx() { node "$clinx_repo/bin/clinx.mjs" "$@"; }
clinx inspect --root "$clinx_demo/noticeboard/service"
clinx init --root "$clinx_demo/noticeboard" --agent codex
clinx init --root "$clinx_demo/noticeboard" --agent codex --apply
```

`inspect` 只读候选命令，不执行。两次 `init` 分别预览与写入；写入
`.agents/skills/clinx-delivery/` 和 `clinx/agent-entry.md`，不改宿主指令，不自动生成工程事实。
已有文件冲突时先人工合并，不覆盖。不能自动发现 Skill 的宿主继续使用步骤 2 的明确路径请求。
让 Agent 在案例根目录的忽略规则中加入 `.clinx/`，避免把本地执行日志、路径等提交出去。

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
clinx task add --root "$clinx_demo/noticeboard" --file "$clinx_demo/noticeboard/proposal.json"
clinx validate scheduled-notices --root "$clinx_demo/noticeboard"
clinx context scheduled-notices --root "$clinx_demo/noticeboard" --focus verify
clinx verify scheduled-notices --root "$clinx_demo/noticeboard"
clinx verify scheduled-notices --root "$clinx_demo/noticeboard" --run
clinx verify scheduled-notices --root "$clinx_demo/noticeboard" --claim local-product --run
```

预览不执行检查；`--run` 才执行并保存 `.clinx/runs/` 下的回执与日志。
成功的默认检查应支持 `local-checks`，但最后一条仍返回退出码 2：CLI 不能自动判定浏览器与 PRD 审阅项。
这不是要求 Agent 停工，也不是说已经做过的浏览器观察无效；交付时分别报告原生观察和机器聚合结果。
保留观察附件的方法见[证据附件](evidence.md)，附件不会变成人工审批或自动“绿灯”。

## 5. 中断后怎么继续

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
clinx task checkpoint scheduled-notices --root "$clinx_demo/noticeboard" --file "$clinx_demo/noticeboard/resume.json"
clinx context scheduled-notices --root "$clinx_demo/noticeboard"
```

在新对话中给 Agent Skill 路径、案例目录与任务 ID，要求读取当前上下文，确认输入变化和授权后继续。
若要核对旧检查，执行 `clinx reconcile scheduled-notices --root <案例目录> --receipt <实际回执路径>`。
`--receipt` 原样粘贴 `verify` 返回的 `receipt` 路径；相对路径基于 `--root`，不是 shell 当前目录。
旧回执能说明当时发生什么，但源码、需求或检查定义变了，就不能直接支持当前版本；
Agent 应定位变化并重跑受影响验证，而不是自动重放发布等外部动作。

## 换成你的需求

**从 0 到 1：**给 Agent 一个真实空目录和产品需求，仍使用步骤 2 的 Skill 请求。
例如“读者推荐图书，管理员标记已读，重启后保留；本地演示，不部署”。
先确认角色、数据寿命和交付目标，再尽早跑通提交→服务校验→保存→刷新读回的切片。
不要复制现成答案再称为从零开发。想先看成品体感，可单独运行[阅读清单示例](../../examples/reading-list/README.zh-CN.md)。

**既有查询或批量操作需求：**把你的 PRD 和所有相关工程给 Agent，核对现有查询、展示与写入能力。
重点由实际语义决定：过滤和总数归属、清空字段的真实编码、批量上限、响应丢失后的重试效果，
都要追到接收方验证；不是把本教程的时间过滤硬套进去。可用[原始批量需求](../../evals/fixtures/bulk-reset/PRD.md)练习。

**企业环境：**直接使用企业已有仓库、文档、构建、部署 CLI 和对应 Skill，不再造一层同名工具。
需要补充的通常是工程入口、环境/制品身份、授权与审批边界、成功和恢复的观察方式。
“已有部署 CLI”解决调用入口，不会自动说明哪个服务、哪个版本可部署、由谁批准、怎样确认线上结果。
将这些事实保存在原有工程指南，按需引用；见[项目接入](adoption.md)和[协作与授权](collaboration.md)。
