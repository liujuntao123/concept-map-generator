# 04 · 移动端专项方案（apps/web-mobile）

> 状态：**已实施**（P0–P5 完成；验收记录见 §9）
> 日期：2026-10-11（CST）

---

## 1. 背景与目标

**现状**：单一桌面优先 SPA。移动端靠 `max-[860px]` 断点把桌面布局"压缩"使用，元素平铺、信息拥挤；交互未按移动端心智（全屏、卡片、收起、折叠）设计。

**目标**：

- 移动端获得**独立入口**的阅读体验：全屏、卡片式、可收起/折叠、底部抽屉优先；
- 桌面端（`apps/web`）**零回归**，现有 CI / 部署路径不变；
- 两端共享数据层、图谱算法、画布引擎与设计 token，避免重复维护。

**非目标（本期不做）**：原生 App / PWA 离线；新增内容字段或改 schema；桌面端重设计；CMS / 账号体系。

---

## 2. 架构决策

| 决策 | 内容 | 理由 |
| --- | --- | --- |
| 同仓库物理分离 | 新增 `apps/web-mobile`（独立 Vite 应用、独立构建与部署），`apps/web` 保持桌面形态 | 移动端 UI 自由重写；不复制共享逻辑（对比分仓可省 ~2.8k 行重复） |
| 共享层 `packages/core` | 数据/类型/算法/画布引擎/图标/token/基础 UI 原语 | 与屏幕无关的代码只维护一份 |
| 依赖方式 | `file:../../packages/core`（npm 软链）+ Vite `resolve.dedupe`（react/react-dom） | 各 app 独立 `npm install`，**现有 CI（`npm --prefix apps/web ci`）与部署命令不受影响** |
| 设计 token | 抽到 `packages/core/src/styles/theme.css`，两端 `@import` | 视觉契约单点维护，避免双端漂移 |
| URL 契约 | 两端完全一致：`?node= ?edge= ?type= ?focus= ?q= ?path= ?step= ?view=` | 链接跨端可分享 |
| 部署 | 移动端预留独立 Pages 项目（`wrangler.toml` + `deploy:mobile` 脚本），本期不发布 | 与桌面互不影响 |

### 2.1 共享边界

**进 `packages/core`**（与端无关）：

- `types/graph.ts`：内容模型
- `lib/`：`graphUtils`（邻接、检索、章节子图、关系句）、`layout`（dagre）、`fetchJson`、`covers`、`cn`
- `hooks/useTheme.ts`：主题状态
- `components/`：`MapCanvas`（React Flow 画布引擎）、`GraphNode`、`MapLegend`（含可复用 `MapLegendContent`）、`icons.tsx`
- `components/ui/`：`styles.ts`（按钮/输入/卡片原语）、`Pill.tsx`、`drawer.ts`（抽屉尺寸常量）
- `styles/`：`theme.css`（设计 token）、`react-flow.css`（第三方类覆盖 + 画布底图）

**留在 `apps/web`**（桌面交互壳）：4 个页面、`DetailDrawer`、`EdgePanel`、`PathGuide`、`SearchHits`、桌面专用装饰样式。

**新建 `apps/web-mobile`**（移动交互壳）：移动端页面与移动端原语（见 §4）。

---

## 3. 移动端交互原语

| 原语 | 说明 |
| --- | --- |
| `Sheet`（底部抽屉） | 三档高度：**peek（约 92px）/ half（约 48vh）/ full（约 86vh）**；手柄拖拽 + 就近吸附；内容态（节点/关系/更多/路径）由父级切换 |
| `Collapse`（折叠分区） | `grid-rows-[0fr→1fr]` 动画；用于详情内「原文摘录 / 详述 / 相关 / 笔记 / 关于」 |
| 全屏搜索层 | 顶栏搜索图标展开为全屏覆盖：输入 + 命中列表 + 空态；选中后回画布定位 |
| 顶部浮层条 | 路径导读条 / 章节聚焦条（互斥），位于顶栏之下 |
| 底部常驻操作条 | 图书页「进入地图 / 从推荐路径开始」；安全区 `env(safe-area-inset-*)` 适配 |

---

## 4. 页面设计（移动端形态）

### 4.1 首页 `/`（卡片列表）

- 顶栏：品牌标 + 标题 + 主题切换；搜索默认**收起为图标**，点开后整行变搜索框（带取消）。
- 馆藏统计三枚小 chip（本数/节点/关系）。
- 图书卡片纵向列表：封面缩略 + 标题/作者/年度 + 两行简介 + 统计 pill + 推荐路径 chips（横滑）+ 主次按钮。
- 排序沿用（标题 zh-CN）。

### 4.2 图书页 `/books/:id`（卡片 + 折叠 + 常驻 CTA）

- 顶栏：返回 + 书名（截断）+ 主题切换。
- 封面 Hero 卡（居中封面 + byline + 标题 + 副题 + 简介）。
- **吸底操作条**：`进入地图`（主）+ `从推荐路径开始`（次，若存在，取第一条）。
- 折叠卡片：`推荐阅读路径`（每条含难度/时长/弧线/前 6 步 + 「从「X」开始 · N 步」）、`关于这张地图`（规模、节点/边类型统计、生成日期/源文件/版本）。

### 4.3 地图页 `/maps/:id`（全屏画布 + 底部抽屉）

- 全屏画布（复用 core `MapCanvas`），顶部浮层：返回、书名截断、搜索、更多；
  缩放控件改为移动端自绘（44px 触达、右下、随抽屉状态显隐）；缩略图隐藏。
- **底部抽屉**（统一容器，三档高度）承载四类内容：
  1. **节点详情**：类型/标签 → 标题 → （路径上下文卡）→ 概要 → 折叠区：原文摘录（章节 chip + 复制）、详述、相关节点、我的笔记、关于这张图；
  2. **关系说明**：自然语言句式 + 两端节点卡（可跳转）；
  3. **更多**：路径（列表/进行中控制）、章节（聚焦列表）、筛选（类型 chips + 结构线开关）、图例、主题、分享（复制链接）、用法提示；
  4. **路径步骤表**：当前路径全部步骤，点按跳转。
- **路径导读条**（顶部浮层）：第 N/M 步 + 上一步/下一步 + 完成 + 退出；冷启动默认进第一条推荐路径（抽屉保持 peek，地图可读）。
- **章节聚焦**：双击章节节点（同桌面事件），或「更多 → 章节」；聚焦条含「显示全部」。
- 深链与冷启动逻辑对齐桌面（`?path=` 冷开、`?node=` 与筛选冲突时清理等）。

### 4.4 404

同风格卡片 + 返回按钮。

---

## 5. 实施步骤

| 阶段 | 内容 |
| --- | --- |
| P0 计划 | 本文件 |
| P1 结构 | `packages/core` 抽取（文件迁移 + index 导出 + theme.css 拆分）；`apps/web` 改为依赖 core；Tailwind `@source` 扫描 core；Vite dedupe |
| P2 骨架 | `apps/web-mobile`：Vite/TS/Tailwind 配置、路由、样式入口、静态资源同步（`sync-maps` 双端输出） |
| P3 原语 | `Sheet` / `Collapse` / 全屏搜索 / 顶部浮层条 / 底部操作条 |
| P4 页面 | 首页 → 图书页 → 地图页（含路径、章节、筛选、图例、分享）→ 404 |
| P5 验证 | 两端构建通过；390px 移动端浏览器实测主流程；1280px 桌面抽查零回归；文档更新（README / 03 规范） |

---

## 6. 验收标准

1. `apps/web` 与 `apps/web-mobile` `npm run build` 均通过（含 `tsc -b`）。
2. 移动端 390×844：无横向滚动；首页/图书页/地图页主流程可用；抽屉三档可拖拽；搜索、路径、章节、筛选、图例、分享、主题均可用。
3. 深链：`/maps/:id?node=…`、`?path=…&step=…`、`?type=…`、`?focus=…`、`?q=…` 在移动端正确还原。
4. 桌面端：页面结构、交互、视觉与改造前一致（抽查首页、图书页、地图页）。
5. 共享层：内容字段、图谱渲染、主题 token 改动只需改 `packages/core` 一处。

---

## 7. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 软链 + 双 React 副本导致 hooks 报错 | 两端 Vite `resolve.dedupe: ['react','react-dom']`；构建后浏览器实测 |
| Tailwind 扫不到 core 内类名（样式丢失） | 两端 CSS 显式 `@source packages/core/src`；实测抽查节点/按钮样式 |
| 桌面端回归 | 抽取只做"搬家 + 依赖注入"，不改桌面 JSX；桌面端浏览器抽查 |
| 移动端抽屉与画布手势冲突 | 拖拽仅手柄/标题区触发，`touch-action: none` 只作用于手柄 |
| 回退 | 桌面端不受影响可直接回退；移动端为新增目录，删除即可 |

---

## 8. 后续（本期之外）

- 移动端独立部署（Cloudflare Pages：`concept-map-mobile` 项目；`npm run deploy:mobile`）。
- 移动端阅读模式（列表优先的章节 / 路径浏览）。
- 桌面端逐步收敛散落的 `max-[860px]` 内联断点（迁移到 core 原语后更易做）。
- 移动端在大屏（平板 / 桌面宽度）下给内容列加宽上限（当前为纯流式单列）。

---

## 9. 实施记录（2026-10-11）

**结构**

- 新增 `packages/core`（`@concept-map/core`）：内容模型 `types/graph.ts`、`lib/`（graphUtils / layout / fetchJson / covers / cn / decor）、`hooks/useTheme`、`components/`（MapCanvas / GraphNode / MapLegend（拆分出可复用 `MapLegendContent`）/ icons）、`components/ui/`（styles / Pill / drawer）、`styles/theme.css`（设计 token + 品牌标记）、`styles/react-flow.css`。
- `apps/web` 改为依赖 `@concept-map/core`：`file:` 软链 + Vite `dedupe`（react 系列）+ `@source` 扫描 core 类名；`MapCanvas` 新增 `showControls` / `showLegend` 开关；桌面 JSX 未改动。
- 新增 `apps/web-mobile`（独立 Vite 入口、独立 `wrangler.toml` 与部署脚本）；`scripts/sync-maps.mjs` 同时同步两个应用；根 `package.json` 增加 `dev:mobile` / `build:mobile` / `preview:mobile` / `deploy:mobile`。

**移动端实现**

- 原语：`Sheet`（peek 108px / half 52vh / full 88vh，手柄拖拽 + 就近吸附 + 快滑换档）、`Collapse`（grid-rows 动画）、全屏搜索层、顶部浮层条（路径导读 / 章节聚焦）、自绘缩放控件（44px，随抽屉状态显隐）。
- 页面：首页（卡片流 + 收起式搜索）、图书页（封面卡 + 折叠分区 + 吸底 CTA）、地图页（全屏画布 + 四类抽屉内容：节点详情 / 关系说明 / 更多 / 路径步骤）；URL 深链契约与桌面端一致。
- 数据与图算法全部来自 `packages/core`，未复制。

**验收**

- `npm run build`（桌面）与 `npm run build:mobile` 均通过（`tsc -b` + vite）。
- 浏览器实测（390×844 窄屏 + 1280 桌面抽查）：
  - 桌面端：三页无视觉回归、无控制台错误、图片全部加载。
  - 移动端：抽屉拖拽 / 点击换档、搜索选中、路径条、更多抽屉、章节聚焦、类型筛选、分享、主题均验证可用；无横向滚动。
- 实测中发现并修复的问题：
  1. 抽屉手柄点击/拖拽失效——`setPointerCapture` 会把后续 click 重定向到拖拽容器；改为 `window` 上的 pointermove/up 监听。
  2. 搜索结果丢失 `q` 参数——同一 tick 内两次 `setSearchParams` 互相覆盖；合并为单次 patch。
  3. 「筛选 + 章节聚焦」叠加导致画布 0 节点、节点抽屉被清理——聚焦章节时同时清除类型筛选。