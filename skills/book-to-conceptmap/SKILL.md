---
name: book-to-conceptmap
version: 1.0.0
description: 从 IMA 知识库拉取一本书（如 epub），分章抽取文本，结构化为概念地图 graph.json（章节+概念节点与边），写入仓库 content/maps/<mapId>/。
---

# book-to-conceptmap

把 **IMA 知识库中的一本书** 变成可版本化维护的概念地图内容（`meta.json` + `graph.json`），供 `apps/web` 阅读器加载。

## 前置依赖

- 已安装 **ima-skill**（`ima_api.cjs`），凭证在 `~/.config/ima/client_id` 与 `api_key`
- Node.js 18+、Python 3（`beautifulsoup4`、`lxml`；可选 `ebooklib`）
- 目标仓库中有 `content/maps/` 目录约定

## 流水线（固定步骤）

### 1. 定位知识库与书目媒体

```bash
# 搜索知识库
node /home/box/agent-data/workflows/ima-skill/ima_api.cjs \
  openapi/wiki/v1/search_knowledge_base '{"query":"<书名>","cursor":"","limit":20}'

# 列出知识库根目录条目
node .../ima_api.cjs openapi/wiki/v1/get_knowledge_list \
  '{"knowledge_base_id":"<kb_id>","cursor":"","limit":50}'

# 获取原文访问 URL（media_id 必填）
node .../ima_api.cjs openapi/wiki/v1/get_media_info \
  '{"media_id":"<media_id>"}'
```

记录：`kb_id`、`media_id`、`media_type`（epub=21）、`url_info.url` + `headers`。

### 2. 下载并抽取原文

使用本 skill 脚本：

```bash
node skills/book-to-conceptmap/scripts/fetch_and_extract.cjs \
  --kb-id '<kb_id>' \
  --media-id '<media_id>' \
  --out /tmp/book-extract
```

脚本会：调用 `get_media_info` → 带 header 下载文件 → 若为 epub 则解压并用 Python 抽 HTML 正文 → 写出 `essays.json` / `chapters/*.txt` / `full.txt`。

也可用手动方式：`unzip` epub + BeautifulSoup 抽文本。

### 3. 按章/篇分块

- 优先用 epub TOC（`toc.ncx`）与各 HTML 的 `h1`/`h2` 作为篇名
- 跳过封面、版权页、纯目录页（可保留「前记」「辑」导语作为 chapter 节点）
- 每块保留：`title`、`file`、`text`、字符数

### 4. LLM / Agent 结构化为图

产出领域 JSON（与渲染库解耦）：

**节点类型（v1）**

| type | 含义 |
|------|------|
| `chapter` | 辑、篇、导读等结构节点 |
| `concept` | 核心概念、论题、命题 |

**节点字段**：`id`, `type`, `label`, `summary`, `content`, `source.{chapter,file,excerpt}`, `tags?`

**边字段**：`id`, `source`, `target`, `type`, `label`  
常用 `type`：`contains` / `elaborates` / `related` / `contrasts` / `supports` / `introduces` / `discusses`

**质量要求**

- 概念 `content` 必须基于原文，不可空喊口号
- `source.excerpt` 为可核对的原文摘录（尽量 ≥40 字）
- 试点规模建议：数十个有意义节点 + 相应边（非 stub）
- `mapId` 使用拼音/slug，例如 `chujia-ying-zou-chu-wei-yi-zhen-li-guan`

若无外部 LLM API：由执行 Agent 直接精读分块文本完成结构化（本仓库试点即如此）。

### 5. 写入仓库

```
content/maps/<mapId>/
  meta.json    # 书目元数据、IMA 溯源、统计
  graph.json   # nodes + edges
```

同步复制到 `apps/web/public/maps/<mapId>/` 以便静态站点读取。

### 6. 人工审校（Git）

- 本地预览 `apps/web` → 点开节点核对摘录
- 以 PR 修改 JSON；**不做**浏览器内编辑器（v1）

## 输出 schema 摘要

见仓库 `docs/02-tech-architecture.md` 与试点  
`content/maps/chujia-ying-zou-chu-wei-yi-zhen-li-guan/`。

## 相关路径

| 项 | 路径 |
|----|------|
| 本 skill（agent） | `/home/box/agent-data/workflows/book-to-conceptmap/` |
| 本 skill（仓库副本） | `skills/book-to-conceptmap/` |
| ima-skill | `/home/box/agent-data/workflows/ima-skill/` |
