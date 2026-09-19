# 观察平台任务结果

[English](README.md)

这个原创示例连接一种任务 API、观察器和可选的 clinx 证据归档。
仅需要 Node.js 22.16+，使用自行启动的本地回环 HTTP fixture；
不使用凭证、部署、真实 QA 平台或模型调用。

`provider.mjs` 中的合成契约定义了验收条件：对应操作、目标和构建身份，
要求成功终态以及指定用例的实际结果。HTTP 200、已受理或运行中的任务、零用例、
跳过用例及其他构建的结果均不能建立成功结论。即使任务状态成功，用例失败仍是失败。
未知状态、格式错误、超大响应或无法读取的结果均保持未决。
每次读取限制为两秒、64 KiB，不自动写入或重试。

在此目录运行原生测试：

```sh
node --test observe.test.mjs
```

已安装 CLI 时，复制到尚不存在的目录后运行：

```sh
clinx example copy platform-observation --to /tmp/platform-observation-example
cd /tmp/platform-observation-example
clinx verify observe-job --run
node demo.mjs
```

`demo.mjs` 输出三行 JSON，包含附件输入的绝对路径，并在 `.clinx/inbox/` 中记录
来自本地 fixture 的未决、失败及成功响应。这些响应是刻意构造的合成数据，
演示冲突历史的保留，不代表真实任务恢复。脚本会关闭自己启动的服务器。
对每个输出路径使用已有命令归档：

```sh
clinx evidence attach observe-job --file PRINTED-ATTACHMENT-PATH
clinx context observe-job
clinx evidence list observe-job
clinx verify observe-job --claim integration --run
```

本地声明应为 `supported`：实质测试验证了观察器。
集成声明仍为 `unresolved`（退出 2），保存通过附件也不会改变它；
示例从未在真实目标上执行产品行为。context 提供已存声明的发现入口，
`evidence list` 单独核对归档字节和本地绑定，不会用最近一次通过覆盖之前的失败。

真实工程应先直接使用原生平台 CLI/Skill，保留原始结果，核对业务响应、操作/构建/目标身份、
用例选择和终态。只有确有缺口时才增加项目自有断言，不照抄虚构 API 契约。
凭证和平台使用方法留在已有私有归属处。失败应对照同一操作及已授权的新执行进行核对，
两次历史均保留；等待时间过去不代表就绪，也不授权重新提交。

若原生命令已完成必要断言，可注册该已审阅命令和真实结果格式。
exit-code 检查仅记录退出契约；clinx 不把任意命令的退出 2 解释为平台“等待中”。
这种外部观察应明确保存，不能弱化或伪造成通过的 JUnit。
详见[证据指南](../../docs/zh-CN/evidence.md)。

修改 `observe.mjs` 后，旧本地回执会过期。先核对，再修复观察器、重跑受影响测试。
测试接受有效对照并拒绝错误身份、假成功及不完整结果；它验证机制，
不代表已测得 Agent 收益或生产效果。测试夹具代码不应进入生产工具。
