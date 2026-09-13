# 合成示例：Maven 多模块工程

[English](README.md)

需要已有 Maven 与 JDK 17+，clinx 不安装这些工具。
Maven 将固定版本的公开构建/测试依赖下载到示例的 `.clinx/m2` 缓存。

安装 CLI 后，复制案例并在副本中运行：

```sh
clinx example copy maven-reactor --to ./maven-demo
cd maven-demo
clinx verify shared-policy --run
```

两个模块产生独立 Surefire 报告，共三个指定用例。
只查看根 POM 或使用旧报告不能满足验收。
在 clinx 源码目录执行 `npm run test:maven`，会在隔离副本中额外执行退出零的空操作，验证陈旧报告仍被拒绝。
这说明 CLI 可调用业务工程已有工具，不要求业务工程改用 CLI 的实现语言。
