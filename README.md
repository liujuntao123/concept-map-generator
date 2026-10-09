# 概念地图生成器 (concept-map-generator)

把 IMA 知识库中的书籍拆解为可交互**概念地图**（章节 + 概念节点），Web 阅读，Git 版本化，Cloudflare 部署。

## 试点

《走出唯一真理观》（陈嘉映）

- 内容：`content/maps/chujia-ying-zou-chu-wei-yi-zhen-li-guan/`
- 技能：`skills/book-to-conceptmap/`（亦安装于 `~/.…/workflows/book-to-conceptmap/`）
- 设计文档：`docs/`

## 本地预览

```bash
cd apps/web
npm install
npm run dev
```

生产构建：

```bash
cd apps/web && npm run build && npm run preview
```

## 技术栈

- Vite + React + TypeScript
- `@xyflow/react`（React Flow）+ `dagre` 自动布局
- 内容为 Git 中的 JSON；无浏览器内编辑器（v1）

## 部署（Cloudflare）

```bash
cd apps/web && npm run build
npx wrangler pages deploy dist --project-name concept-map-generator
# 或 workers 静态资源：见 wrangler.toml
```

## 从 IMA 再抽一本

见 `skills/book-to-conceptmap/SKILL.md`。
