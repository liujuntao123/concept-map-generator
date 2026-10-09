# 持续改进闭环（Review ↔ Implement）

## 角色

| 角色 | Agent | 职责 |
|------|-------|------|
| 验收 | 概念地图验收 | 验收线上产品，输出问题与建议，交给实现 |
| 实现 | 概念地图实现 | 按验收报告改代码、部署，再交回归 |

## 一轮流程

1. **触发**：工作日上午例行，或用户说「跑一轮改进」。
2. **验收**：验收代理检查 https://concept-map-generator.pages.dev/ 与仓库，产出结构化报告。
3. **交接**：验收代理把报告发给实现代理。
4. **实现**：实现代理修复 → build → push → Cloudflare 部署。
5. **回归**：实现代理通知验收代理复验；验收代理向用户摘要本轮结果。

## 线上与仓库

- Live: https://concept-map-generator.pages.dev/
- Repo: https://github.com/liujuntao123/concept-map-generator
- 本地路径：`/workspace/concept-map-generator`

## 报告模板（验收）

- 严重问题（必须修）
- 中等问题（本轮尽量修）
- 体验建议（可排期）
- 每条：现象 / 复现步骤 / 期望 / 优先级
