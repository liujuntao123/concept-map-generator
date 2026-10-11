---
name: book-to-conceptmap
version: 1.1.0
description: 从 IMA 知识库拉取一本书（如 epub），分章抽取文本，结构化为概念地图 graph.json（章节+概念等节点与边），写入仓库 content/maps/<mapId>/。
---

# book-to-conceptmap

把 **IMA 知识库中的一本书** 变成可版本化维护的概念地图内容（`meta.json` + `graph.json`），供 `apps/web` 阅读器加载。

## 前置依赖

- 已安装 **ima-skill**（`ima_api.cjs`），凭证在 `~/.config/ima/client_id` 与 `api_key`
- Node.js 18+、Python 3（`beautifulsoup4`、`lxml`；可选 `ebooklib`）
- 目标仓库中有 `content/maps/` 目录约定
- Schema：`schemas/graph.schema.json`（`npm run validate`）

## 一键流水线（固定步骤）

### 1. 定位知识库与书目媒体

```bash
node ~/agent-data/workflows/ima-skill/ima_api.cjs \
  openapi/wiki/v1/search_knowledge_base '{"query":"<书名>","cursor":"","limit":20}'

node .../ima_api.cjs openapi/wiki/v1/get_knowledge_list \
  '{"knowledge_base_id":"<kb_id>","cursor":"","limit":50}'

node .../ima_api.cjs openapi/wiki/v1/get_media_info \
  '{"media_id":"<media_id>"}'
```

记录：`kb_id`、`media_id`、`media_type`（epub=21）、`url_info.url` + `headers`。

### 2. 下载并抽取原文

```bash
node skills/book-to-conceptmap/scripts/fetch_and_extract.cjs \
  --kb-id '<kb_id>' \
  --media-id '<media_id>' \
  --out /tmp/book-extract
```

产出：`essays.json` / `chapters/*.txt` / `full.txt` / `cover.<ext>`（书籍封面，用于 `meta.cover`）。

### 3. 按章/篇分块

- 以各 HTML 的 `h1`/`h2` 作为篇名（当前实现未解析 epub `toc.ncx`）
- 封面、版权页、纯目录页仍会被抽出，结构化阶段忽略它们
- 每块保留：`title`、`file`、`text`、字符数

### 4. 结构化为图（LLM / Agent）

**节点类型**

| type | 含义 | 说明 |
|------|------|-------------------|
| `chapter` | 辑、篇、导读 | `reviewed` |
| `concept` | 核心概念、论题 | `draft` |
| `claim` | 主张 / 命题 | `draft` |
| `person` | 人物 | `draft` |
| `work` | 著作 | `draft` |

**节点字段**：`id`, `type`, `label`, `summary`, `content`, `source.{chapter,file,excerpt,anchor?}`, `tags?`；可选 `reviewStatus`（仅作者流水线，读者端禁止渲染）

**边类型（规范化）**：`contains` / `related` / `contrasts` / `cites`  
字段：`id`, `source`, `target`, `type`, `label`, `description?`

**质量要求**

- 概念 `content` 必须基于原文
- `source.excerpt` 可核对（尽量 ≥40 字）；`anchor`/`file` 指向 epub 内路径
- `schemaVersion`: `"1.1"`
- `mapId` 使用拼音/slug

### 5. 写入仓库

```
content/maps/<mapId>/
  meta.json    # version, generatedAt, source, stats, featuredPaths?, cover, coverColor
  graph.json   # nodes + edges
  cover.jpg    # 书籍封面（第 2 步由脚本从 EPUB 提取；meta.cover = "cover.jpg"）
content/maps/index.json   # 更新 maps 列表
```

然后：

```bash
npm run sync-maps    # → apps/web/public/maps
npm run validate
```

### 6. 人工审校（Git）

- 本地预览 → 点开节点核对摘录
- （可选）将确认过的节点 `reviewStatus` 改为 `reviewed`；读者 Web 不展示该字段
- 以 PR 修改 JSON

## 相关路径

| 项 | 路径 |
|----|------|
| 本 skill（仓库） | `skills/book-to-conceptmap/` |
| Schema | `schemas/graph.schema.json` |
| 试点 | `content/maps/chujia-ying-zou-chu-wei-yi-zhen-li-guan/` |
