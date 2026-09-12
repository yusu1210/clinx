# 阅读清单：可运行的全栈切片

[English](README.md)

原创本地示例：读者推荐图书、管理员标记已读，状态在服务重启后保留。
包含页面、真实 HTTP API、服务端演示权限与串行文件持久化，不需要第三方依赖或外部服务。

## 启动、使用与停止

使用 macOS/Linux、已有 Node.js 22.16+，在本目录运行：

```sh
node server.mjs
```

首行打印临时回环 `url`、隔离数据目录 `dataDir` 和两个角色的 `demoCodes`。
打开实际 URL，输入 reader 代码，提交标题和作者，刷新检查结果。
选择 **Change demo identity**，输入 librarian 代码，执行 **Mark as read**。
在自己启动的终端用 Ctrl+C 停止，SIGTERM 也会正常关闭。

验证重启持久化时使用实际打印的数据目录：

```sh
node server.mjs --data-dir /path/to/your/temporary/data-directory
```

目录必须隔离在系统临时目录或 `/tmp` 中，父目录已存在。
不传 `--data-dir` 会新建清单；可用 `--port 43210` 选择端口，冲突只报错，不杀别的进程。
重启后演示代码轮换，使用新打印的 URL 和代码。
数据可跨进程重启，不保证跨系统清理或断电保留。

## 验证边界

```sh
node --test test/http.test.mjs
node ../../bin/clinx.mjs inspect
node ../../bin/clinx.mjs verify reading-list --run
node ../../bin/clinx.mjs verify reading-list --claim local-product --run
```

clinx 命令要求父项目已构建。默认 `local-http` 验证真实子进程、HTTP、角色、非法输入、
并发保存、写失败和重启；JUnit 有 10 个具名用例，Node 汇总另计父用例，共 11 个。
测试只清理自己创建的数据和进程。根项目还通过实际客户端源码和 DOM/fetch 替身
验证两个响应顺序回归：保留新刷新结果，不让旧响应恢复已退出的视图。这不是真实浏览器验证。

`local-product` 有意返回退出码 2：还缺实际页面观察。
应操作读者提交、输入校验、刷新、管理员动作与离线反馈，再称产品已本地验证。
早先浏览器结果不能自动覆盖后来的改动。

## 用途与限制

这是实际纵向切片：服务端实施管理员权限，持久化成功后才返回成功，磁盘失败可见。
局部测试的默认声明比完整产品验收窄。用于新建 Skill 试验时，应从根目录运行
`node evals/prepare.mjs greenfield` 得到空工程，不能把此参考解暴露给候选 Agent。

- 演示代码是终端可见的随机 bearer 能力，不是生产身份、独立撤销、审计或 TLS；浏览器保存于 sessionStorage。
- 每个数据目录由 server.lock 控制；崩溃后确认无人持有才手动移除那个锁，不自动抢锁。
- 写入串行且原子替换，不提供数据库备份、复制或断电持久性；数据损坏会阻止启动。
- 标记已读可重复，重复推荐会新增；丢失响应后先刷新再决定，不自动重试写入。
- 显式刷新观察其他修改；不包含账号管理、通知、编辑删除撤销、部署或任意文件服务。
- 未对生产负载、所有移动浏览器、辅助技术或敌意文件系统变化进行资格认证。
  只用合成数据，不作为应用安全框架或生产部署模板。
