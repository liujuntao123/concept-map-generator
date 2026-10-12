# 概念地图生成器 (concept-map-generator)

把 IMA 知识库中的书籍拆解为可交互**概念地图**（章节 / 概念 / 主张 / 人物 / 著作），Web 阅读，Git 版本化，Cloudflare Pages 部署。

## 在线

- 站点：https://concept-map-generator.pages.dev/
- 仓库：https://github.com/liujuntao123/concept-map-generator

## 试点

《走出唯一真理观》（陈嘉映）

- 内容：`content/maps/chujia-ying-zou-chu-wei-yi-zhen-li-guan/`
- 目录索引：`content/maps/index.json`
- 技能：`skills/book-to-conceptmap/`
- 设计文档：`docs/`
- 功能 backlog：`docs/BACKLOG.md`

## 目录结构

| 路径 | 说明 |
|------|------|
| `apps/web` | 桌面端 Web（Vite + React + Tailwind，现有桌面体验） |
| `apps/web-mobile` | 移动端 Web（独立入口：全屏 / 卡片 / 收起折叠 / 底部抽屉优先） |
| `packages/core` | 两端共享层：内容模型、图谱算法、画布引擎、图标、设计 token、基础 UI 原语 |
| `content/maps` | 概念地图内容（JSON，Git 版本化） |
| `scripts/` | 同步 / 校验 / 建索引脚本 |
| `schemas/` | graph.json 的 JSON Schema |

共享边界：只有与屏幕尺寸 / 端交互无关的代码进 `packages/core`（见
[docs/04-mobile-plan.md](docs/04-mobile-plan.md)）；页面布局与抽屉/面板等交互壳留在各端应用内。

## 内容目录

每本书的**全部内容自持**于 `content/maps/<mapId>/`，与前端代码解耦：

```
content/maps/<mapId>/
  meta.json     # 书目元数据（含 cover 封面文件名、coverColor 主色）
  graph.json    # 概念图（节点 + 边）
  cover.jpg     # 书籍封面
```

- `content/maps/index.json` 由 `build-index.mjs` 从各 `meta.json` 派生；
- 构建时 `sync-maps.mjs` 把 `content/maps` 整体拷到 `apps/web/public/maps`，页面以 `/maps/<mapId>/…` 读取；
- 前端不含「mapId → 封面/配色」硬编码，**新增一本书只加内容、不改代码**。

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 图书 / 地图列表（搜索、排序） |
| `/books/:id` | 图书详情（元数据、类型拆解、推荐路径） |
| `/maps/:id/about` | 同上（别名） |
| `/maps/:id` | 概念地图阅读器（`?node=` / `?type=` / `?focus=` / `?q=` / `?edge=`） |

## 本地预览

```bash
npm run sync-maps        # content/maps → 各 Web 应用的 public/maps
cd apps/web && npm install
npm run dev              # 桌面端，默认 http://localhost:5173（会先 sync）

cd apps/web-mobile && npm install
npm run dev:mobile       # 移动端（建议用 390×844 视口预览）
```

> 两个应用各自安装依赖；`packages/core` 以 `file:` 软链方式被引用（core 需先
> `npm install` 一次）。

生产构建：

```bash
npm run build            # 桌面端 → apps/web/dist
npm run build:mobile     # 移动端 → apps/web-mobile/dist
npm run preview
npm run preview:mobile
```

校验图谱 schema：

```bash
npm --prefix apps/web ci   # 需要 ajv
npm run validate
```

## 一键流水线（新书 → 地图）

1. **定位 IMA 书目**：用 ima-skill 搜索知识库 → `get_knowledge_list` → `get_media_info`
2. **下载抽取**：`node skills/book-to-conceptmap/scripts/fetch_and_extract.cjs --kb-id … --media-id … --out /tmp/book-extract`
3. **结构化**：按 `skills/book-to-conceptmap/SKILL.md` 生成 `meta.json` + `graph.json`（schema 见 `schemas/graph.schema.json`）
4. **写入**：放到 `content/maps/<mapId>/`，更新 `content/maps/index.json`
5. **同步与校验**：`npm run sync-maps && npm run validate`
6. **预览 / 部署**：`npm run build`，`npx wrangler pages deploy apps/web/dist --project-name concept-map-generator`
7. **审校（作者流水线）**：可选在 JSON 中维护 `reviewStatus`（`draft`/`reviewed`），走 Git PR；**读者 UI 禁止渲染**该字段徽章

## 技术栈

- Vite + React + TypeScript + React Router（桌面端 / 移动端各一个入口）
- `@xyflow/react` + `dagre` 自动布局（画布引擎在 `packages/core`，两端复用）
- Tailwind CSS v4；设计 token 唯一定义在 `packages/core/src/styles/theme.css`
- 内容为 Git 中的 JSON；CI 用 Ajv 校验 graph schema
- Cloudflare Pages（`apps/web/wrangler.toml` / `apps/web-mobile/wrangler.toml`）

## 部署

桌面端（生产站）：

```bash
npm run build
cd apps/web && npx wrangler pages deploy dist --project-name concept-map-generator
```

移动端（独立 Pages 项目，首次需在 Cloudflare 建 `concept-map-mobile` 项目）：

```bash
npm run deploy:mobile
```
