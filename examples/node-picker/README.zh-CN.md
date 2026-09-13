# 合成示例：可选项查询

[English](README.md)

合成的领域逻辑与 HTTP 示例，验证规则归属、分页前过滤、对应总数和回环 HTTP 边界。
不实现浏览器 UI。

安装 CLI 后，复制案例并在副本中运行：

```sh
clinx example copy node-picker --to ./picker-demo
cd picker-demo
clinx verify eligible-picker
clinx verify eligible-picker --run
clinx verify eligible-picker --claim release-ready --run
```

不带 `--run` 的验证是预览；首次执行应支持 `local-behavior`；最后一条因外部发布条件未决而返回退出码 2。
修改过滤谓词或任务引用的约定后，核验旧记录应显示陈旧。
根项目测试用错误谓词作为反例，确认错误实现不会通过。

应用到真实选择器前，调查当前规则归属、分页、API 与 UI 行为。
名字相似不代表领域模型一致，应按真实约定选择最小完整改动。
