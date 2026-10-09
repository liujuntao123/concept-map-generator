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


## 路由

| 路径 | 说明 |
|------|------|
| `/` | 图书 / 地图列表（搜索、排序、审校进度） |
| `/books/:id` | 图书详情（元数据、类型拆解、推荐路径） |
| `/maps/:id/about` | 同上（别名） |
| `/maps/:id` | 概念地图阅读器（`?node=` / `?type=`） |

## 本地预览

```bash
npm run sync-maps   # content/maps → apps/web/public/maps
cd apps/web && npm install
npm run dev         # 根目录也可 npm run dev（会先 sync）
```

生产构建：

```bash
npm run build
npm run preview
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
7. **审校**：把概念节点 `reviewStatus` 从 `draft` 改为 `reviewed`，走 Git PR

## 技术栈

- Vite + React + TypeScript + React Router
- `@xyflow/react` + `dagre` 自动布局
- 内容为 Git 中的 JSON；CI 用 Ajv 校验 graph schema
- Cloudflare Pages（`apps/web/wrangler.toml`）

## 部署

```bash
npm run build
cd apps/web && npx wrangler pages deploy dist --project-name concept-map-generator
```
