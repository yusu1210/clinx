# 合成示例：可选项查询

[English](README.md)

合成的领域逻辑与 HTTP 示例，验证规则归属、分页前过滤、对应总数和回环 HTTP 边界。
不实现浏览器 UI。

在 clinx 根目录执行 `npm ci`、`npm run build` 后：

```sh
node bin/clinx.mjs verify eligible-picker --root examples/node-picker
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --run
node bin/clinx.mjs verify eligible-picker --root examples/node-picker --claim release-ready --run
```

第一条预览；第二条应支持 `local-behavior`；第三条因外部发布条件未决而返回退出码 2。
修改过滤谓词或任务引用的约定后，核验旧记录应显示陈旧。
根项目测试用错误谓词作为反例，确认错误实现不会通过。

应用到真实选择器前，调查当前规则归属、分页、API 与 UI 行为。
名字相似不代表领域模型一致，应按真实约定选择最小完整改动。
