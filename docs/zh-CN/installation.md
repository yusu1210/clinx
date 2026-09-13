# 安装、接入与维护 clinx

[English](../en/installation.md)

Skill 指导 Agent 工作；需要可重复的本地记录、执行证据或工作区 Skill 管理时再使用 CLI。
两者都不要求业务工程更换语言、包管理器、构建系统或部署工具。

## 安装 CLI

当前版本是源码/本地包预览版，尚未发布 npm 包。在本仓库公布经过核实的注册表身份前，
不要仅按 `clinx` 这个名字下载包。GitHub 源码压缩包不等于可安装 CLI 包：后者包含编译后的
运行时代码，并声明公开依赖。

拿到已审阅的 `clinx-0.2.0-dev.0.tgz` 后，在 macOS/Linux、Node.js 22.16+ 与 npm 环境安装：

```sh
npm install --global --ignore-scripts /path/to/clinx-0.2.0-dev.0.tgz
clinx --version
clinx --help
```

包内包含 `npm-shrinkwrap.json`，锁定直接与传递依赖的版本和完整性摘要。
安装仍需要注册表或已缓存的依赖；tarball 不是无依赖的离线可执行文件，安装不需要运行生命周期脚本。
有组织要求时，使用已批准的镜像。这是 npm 为 CLI 应用提供的
[可分发锁文件](https://docs.npmjs.com/cli/v11/configuring-npm/npm-shrinkwrap-json/)，不要求业务工程采用 npm。

目前也可以从已审阅源码自行准备一次本地包：

```sh
git clone https://github.com/yusu1210/clinx.git
cd clinx
npm ci
npm run bundle
npm install --global --ignore-scripts ./artifacts/clinx-0.2.0-dev.0/clinx-0.2.0-dev.0.tgz
clinx --version
```

运行前审阅源码与脚本；需要可复现性时固定已审阅提交。`bundle` 构建后在全新候选目录生成
CLI 包、独立 Skill 压缩包和 `SHA256SUMS`，拒绝覆盖已有候选。维护者分发前应完成
[发布检查](../../CONTRIBUTING.zh-CN.md#发布准备)。校验和检测字节变化，不证明发布者身份。
这些命令不会发布 npm 包或创建 GitHub Release。

团队与 CI 可以在独立工具目录固定同一 tarball，而非全局安装。例如已有团队工具目录 `/path/to/tools`：

```sh
npm install --prefix /path/to/tools --ignore-scripts --no-save /path/to/clinx-0.2.0-dev.0.tgz
/path/to/tools/node_modules/.bin/clinx --version
```

通过执行环境的正常配置，把该工具目录的 `node_modules/.bin` 加入 `PATH`。
不要为了使用 clinx 向业务仓库添加 `package.json`。源码开发另行处理：贡献者运行
`npm ci` 和 `npm run build` 后，可直接使用 `node bin/clinx.mjs`，不需要定义 shell 函数。

## 接入工作区

单工程使用已有检出目录，多工程选择一个协调目录。让 Agent 从该目录开始；不逐一初始化兄弟仓库。
安装 CLI 后执行：

```sh
cd /path/to/workspace
clinx init --agent codex --apply
clinx skill status
```

去掉 `--apply` 可先查看只读计划，预览不是必须执行的第一步。
`--root DIRECTORY` 明确选择其他目录；CLI 不自动选择父工作区或最近任务。

Codex 模式写入 `.agents/skills/clinx-delivery`；通用模式 `--agent generic`（新安装时的默认值）
写入 `clinx/skills/clinx-delivery`，明确读取 `SKILL.md` 或按宿主支持的方式注册。
已有受管安装省略 `--agent` 时，沿用记录中的位置。
两种模式都生成 `clinx/agent-entry.md` 与 `clinx/installation.json`。
已存在且内容相同的文件仍记录为用户所有，不被安装器接管；不同内容会阻止安装。
不修改已有 `AGENTS.md`、全局设置或工程工具。

Codex 按其文档规定的 cwd 到仓库根目录范围发现仓库 Skill；在兄弟协调目录安装的 Skill，
不一定能从源仓库内发现。应从协调目录开始，或明确选择目标 Skill。
在宿主中核对发现结果；更新未出现时重启宿主。见[官方本地 Skill 发现规则](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)。

这些状态相互独立：

| 状态                  | 如何确认                                            |
| --------------------- | --------------------------------------------------- |
| CLI 可用              | `clinx --version`，不表示业务工程已准备好           |
| 本地 Skill 文件已安装 | `clinx skill status`，检查版本与本地变化            |
| 宿主使用目标 Skill    | 核对宿主实际发现/选中的 Skill 和路径                |
| 工作区记录已配置      | Agent 准备真实输入和检查，`clinx validate` 校验结构 |
| 需求已验证            | 用工程工具观察约定的验收行为，并说明限制            |

`init` 不生成地图、操作指南、任务或配置；需要时使用[可选模板](adoption.md)。
Agent 应复用既有事实，在确有帮助时补齐记录。使用记录与安装备份时，将 `.clinx/` 和
`clinx/install-backups/` 加入已有私密输出忽略规则。安装记录是持久的归属信息，
不要修改其中的哈希来消除冲突。若与 Skill 文件一起共享，应先审查隐私。

## 不使用 CLI，单独使用 Skill

保留完整且已审阅的 `skills/clinx-delivery` 目录，包括引用与许可；放到宿主支持的位置，
或让 Agent 明确读取它的绝对 `SKILL.md` 路径。`bundle` 生成的独立 Skill 包包含同一目录。
仅阅读 Skill 不需要 Node。通过宿主安装的副本沿用宿主的安装与更新机制，不由 clinx 的安装记录管理。
避免多个同名副本竞争。方法论本身不绑定宿主。

## 开始需求或体验案例

把 PRD、工程路径、交付终点与确认点填入[首次请求](cold-start.md)交给 Agent，不要求用户准备技术 JSON。
CLI 本身不调用模型，也不会独立完成 PRD。

在任意目录体验完整案例，目标父目录须已存在：

```sh
clinx example list
clinx example copy noticeboard --to ./noticeboard-demo
cd noticeboard-demo
clinx init --agent codex --apply
```

然后按[实操教程](hands-on.md)继续。复制只向此前不存在的目录写入公开案例，不执行代码或安装依赖。
`clinx resources` 可定位安装包内的指南、Schema、模板与 Skill。
案例复制保留包装脚本的可执行权限，跳过已知本地安装/历史记录、环境文件与生成输出，拒绝符号链接。
最多复制 512 个条目、共 32 MiB，每文件最多 8 MiB；这些过滤不是通用机密扫描器。

## 升级与移除

通过同一包管理器安装下一版已审阅 CLI 包。**升级 CLI 不会自动更新各工作区的 Skill 副本。**
在确实准备更新的工作区执行：

```sh
clinx skill status
clinx skill update
clinx skill update --apply
```

`skill update` 使用当前 CLI 内置资源，不联网。预览可选。未改动的受管文件可以更新，
缺失的受管文件可以恢复，已废弃的受管文件可以移除。本地修改过的受管文件会阻止写入，
除非其内容已与新版包完全一致。用户所有的文件保持原样，因此更新后仍可能有 `matchesPackage: false`。
工程定制宜放在工程自有指南，不直接修改共享 Skill。必须保留修改时明确合并；没有 `--force`。

移除未改动的受管文件：

```sh
clinx skill remove
clinx skill remove --apply
```

更新/移除会把被替换文件和原安装记录保留到 `clinx/install-backups/UUID/`，
其中 `operation.json` 描述前后哈希，命令会打印备份位置。任务数据、配置、日志、
非受管文件及宿主指令都保留，不递归删除目录。备份可能包含私密定制，不自动发布或清理。
可捕获的写入失败会尝试恢复已完成修改，不覆盖并发编辑；进程崩溃不具备多文件事务保证。
恢复或重试前检查安装记录、当前文件与备份，只恢复选定备份中的明确路径，
不要把旧安装记录覆盖到一组无关的新文件上。

卸载 CLI 是另一件事，使用原安装的包管理器，例如 `npm uninstall --global clinx`。
若也想移除工作区 Skill，可先完成上面的移除操作。两种卸载都不会删除需求交付历史。

## 常见问题

| 现象                     | 下一步                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| 找不到 `clinx` 命令      | 用 `npm prefix --global` 核对安装前缀及可执行目录是否在 `PATH`；不要改成源码 shell 包装函数 |
| 包安装权限不足           | 使用用户所有或团队管理的工具目录，不自动重试管理员权限                                      |
| 运行时不支持或安装不完整 | 使用 Node.js 22.16+，重新安装已审阅包及依赖；源码贡献者需先构建                             |
| Skill 已安装但没被选中   | 检查宿主发现范围、cwd、同名副本；明确选择路径或刷新宿主                                     |
| 缺少 `clinx.config.json` | Skill 可继续；需要记录时让 Agent 准备真实配置，或用 `--root` 选对目录                       |
| 安装冲突                 | 检查 `skill status` 与预览，保留本地工作，再明确合并或移动相关文件                          |
| 写锁占用                 | 确认记录进程已退出且无其他写入者后，才移除那一个锁；不自动抢锁                              |
| 示例目标已存在           | 选择新目录；不合并或覆盖已有工作                                                            |

命令不弹出交互式提问。Agent 与脚本应显式使用 `--json`；错误通过 stderr 返回代码、
消息与恢复提示。精确行为见 [CLI 说明](cli.md)。
