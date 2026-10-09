# 持续改进闭环（Review ↔ Implement）

## 模式

**持续优化，直到验收代理满意为止。** 不是工作日定时一轮。

## 角色

| 角色 | Agent | 职责 |
|------|-------|------|
| 验收 | 概念地图验收 | 验收线上产品，输出问题与建议，交给实现；回归后决定是否继续 |
| 实现 | 概念地图实现 | 按验收报告改代码、部署，再交回归 |

## 一轮流程

1. **触发**：用户要求开始，或上一轮回归未满意。
2. **验收**：检查 https://concept-map-generator.pages.dev/ 与仓库，产出结构化报告。
3. **交接**：验收把报告发给实现。
4. **实现**：修复 → build → push → Cloudflare 部署。
5. **回归**：实现通知验收复验。
6. **结束条件**：验收判定无严重/中等问题，产品可收工；向用户发送结束结论（可附剩余可选建议）。不满足则回到步骤 2。

## 线上与仓库

- Live: https://concept-map-generator.pages.dev/
- Repo: https://github.com/liujuntao123/concept-map-generator
- 本地路径：`/workspace/concept-map-generator`
