---
name: book-to-conceptmap
version: 1.2.1
description: 从 IMA 知识库拉取一本书（如 epub），分章抽取文本，结构化为概念地图 graph.json（章节+概念等节点与边）与 meta.json（含封面信息），写入仓库 content/maps/<mapId>/。
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
  --out /tmp/book-extract \
  --cover-out apps/web/public/illustrations/cover-<mapId>.jpg
```

（已拿到 epub、或不想走 IMA 时：加 `--epub <file.epub>` 跳过下载；只要封面加 `--cover-only`。）

产出：`essays.json` / `chapters/*.txt` / `full.txt`，**并自动提取真实封面**：
脚本按 `OPF <meta name="cover">` → `manifest properties="cover-image"` → id/href 含 cover 的图片 →
`cover.xhtml` 内首个图片 的顺序定位，导出到 `--cover-out`（缺省 `<out>/cover.<ext>`），
并打印建议的 `COVER_SRC` 登记行；**找不到封面只提示、不阻塞正文抽取**（走「封面规范」的字型封面）。

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
  meta.json    # version, generatedAt, source, stats, featuredPaths?, coverColor?, coverText?
  graph.json   # nodes + edges
content/maps/index.json   # 更新 maps 列表
apps/web/public/illustrations/cover-<mapId>.jpg   # 真实封面（若提取到，见「封面规范」）
```

然后：

```bash
npm run sync-maps    # → 两个应用的 public/maps 与 illustrations
npm run validate
```

### 6. 人工审校（Git）

- 本地预览 → 点开节点核对摘录
- （可选）将确认过的节点 `reviewStatus` 改为 `reviewed`；读者 Web 不展示该字段
- 以 PR 修改 JSON

## 封面规范

**真实封面优先，禁止用通用占位图。**

1. **用源文件里的真实封面**（首选，`fetch_and_extract.cjs` 已自动提取，见步骤 2）：
   - epub：OPF `<meta name="cover">` / `cover-image` / `cover.xhtml` 内的图片（脚本会自动定位）；
   - PDF：渲染第 1 页；纯笔记类媒体通常没有封面（跳过，走第 2 条）。
2. 封面图存到 **`apps/web/public/illustrations/cover-<mapId>.jpg`**（或 `.png`；竖版 3:4、宽度 ≥600px 为佳）。
   用 `--cover-out apps/web/public/illustrations/cover-<mapId>.jpg` 一步到位；
   移动端的 `public/illustrations` 由 `npm run sync-maps` 从桌面端目录同步，不用手抄两份。
3. 在 `packages/core/src/lib/covers.ts` 的 **`COVER_SRC`** 里登记：`'<mapId>': '/illustrations/cover-<mapId>.jpg'`
   （脚本收尾会打印这一行的建议写法）。

**没有真实封面时：用「字型封面」**（书名 1–2 字放大 + 底板色），而不是占位插画：

- `meta.json` 填 `coverColor`（封面主色的十六进制，如 `#b4543a`）与 `coverText`（书名 1–2 字，如「看见」「快慢」「走出」）；
- 两端阅读器（`apps/web` / `apps/web-mobile`）通过 `coverInfoOf()` 判定：已登记 `COVER_SRC` → 渲染真实封面；否则渲染字型封面 `TypeCover`（`coverText` 缺省取书名首字，`coverColor` 缺省用主题强调色）；
- `content/maps/index.json` 由 `scripts/build-index.mjs` 从 `meta.json` 派生，`coverColor` / `coverText` 会自动带上，无需手写。

> 现状示例：《看见孩子》尚无真实封面图，`coverColor: "#b4543a"` + `coverText: "看见"` → 阅读器渲染字型封面。
> 它的源 epub 里的真实封面可用步骤 2 的命令提取补录（`--media-id` / `--kb-id` 见 `content/maps/kandao-haizi/meta.json` 的 `source`）。

## 相关路径

| 项 | 路径 |
|----|------|
| 本 skill（仓库） | `skills/book-to-conceptmap/` |
| Schema | `schemas/graph.schema.json` |
| 封面登记 | `packages/core/src/lib/covers.ts` |
| 封面图目录 | `apps/web/public/illustrations/` |
| 试点 | `content/maps/chujia-ying-zou-chu-wei-yi-zhen-li-guan/` |
