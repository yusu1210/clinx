# 跨兄弟工程完成一个任务

[English](README.md)

这个原创合成示例通过客户端、服务与共享策略三个源验证真实 HTTP 消费路径。
第四个 analytics 源与本任务无关。协调目录本身不是 Source，也不需要 Git。
示例用 Node 运行，不要求采用 clinx 的工程使用 Node。

```text
multi-source/
  workspace/   协调目录；--root 指向这里
    knowledge/system-map.md       共享导航，不复制源契约
    clinx.config.json             真实源路径与检查定义
    clinx/tasks/visible-notices/
      prd.md                      原始任务需求
      design.md                   本任务的复用与验证决策
      contract.json               CLI 任务约定与输入引用
    .clinx/                       记录运行与证据时才生成
  client/      消费者与 HTTP 测试
  service/     HTTP 边界及其拥有的契约文档
  policy/      共享可见性规则
  analytics/   无关数据
```

只有服务拥有契约文档；客户端与策略无需新建地图或 `AGENTS.md`，已有代码和测试就是入口。
这些目录代表独立维护的仓库，示例不创建 Git 仓库。工作区引用源拥有的事实，保存跨源导航
和任务决策，不必逐工程初始化。只读源、已有文档系统及并行副本见[工作区归属](../../docs/zh-CN/workspace.md)。

在 clinx 源码目录构建 CLI，使用隔离副本：

```sh
npm run build
clinx_demo=$(mktemp -d)
cp -R examples/multi-source "$clinx_demo/"
node bin/clinx.mjs context visible-notices --root "$clinx_demo/multi-source/workspace"
node bin/clinx.mjs verify visible-notices --root "$clinx_demo/multi-source/workspace"
node bin/clinx.mjs verify visible-notices --root "$clinx_demo/multi-source/workspace" --run
```

上下文直接引用原来的 `service/docs/contract.md`，不复制文档，在调查与设计焦点选择共享地图。
任务绑定 PRD、方案和服务契约；地图仅用于导航。
预览包含三个任务相关源和一个检查。执行时启动临时 loopback HTTP 服务，
调用实际消费者，断言可见条目及其数量，然后关闭服务。退出零只支持声明的本地观察。

续接时，把返回的回执路径传给
`reconcile visible-notices --root WORKSPACE --receipt PATH`。
需要检查点时使用[普通交接命令](../../docs/zh-CN/walkthrough.md)。

源码目录的 `test/multi-source.test.mjs` 回归覆盖：

- 无关 analytics 字节、可用性或导航变化不影响限定范围的绑定；
- 策略、服务、客户端输入及源拥有的契约参与绑定；
- 共享规则误放行非活跃条目时，旧证据陈旧，新执行失败；
- 修改检查语义不能把历史观察改写成当前验收；
- 拒绝未知源、范围外引用、路径越界和符号链接；
- 省略任务 `sources` 时，保守地绑定全部配置源；
- 源导航遵循任务范围，工作区导航仍按焦点选择；
- 仅修改地图不使证据陈旧，除非地图被声明为任务输入；
- 任务方案变化使验收陈旧，新增未绑定的验证笔记不会；
- 在工作区接入 Skill 不向源工程添加文件。

运行：`npm run build && node --test test/multi-source.test.mjs`。
不能通过缩小任务范围隐藏真实依赖。示例不含浏览器 UI、生产身份、持久化应用数据或部署；
它是可运行的协调示例与回归，不是 Agent 提效对照实验。
