# 合成示例：Maven 多模块工程

[English](README.md)

需要已有 Maven 与 JDK 17+，clinx 不安装这些工具。
Maven 将固定版本的公开构建/测试依赖下载到示例的 `.clinx/m2` 缓存。

构建 clinx 后，在根目录运行：

```sh
node bin/clinx.mjs verify shared-policy --root examples/maven-reactor --run
```

两个模块产生独立 Surefire 报告，共三个指定用例。
只查看根 POM 或使用旧报告不能满足验收。
`npm run test:maven` 在隔离副本中额外执行退出零的空操作，验证陈旧报告仍被拒绝。
这说明 CLI 可调用业务工程已有工具，不要求业务工程改用 CLI 的实现语言。
