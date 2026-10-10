# 03 · 视觉与交互规范

本文件是概念地图 Web 端的**设计契约**：所有页面样式以本文件为准，实现方式统一为 Tailwind CSS v4 utilities。
规范依据以下公开标准与业界实践整理，并已落到代码 token（见 `apps/web/src/index.css`）：

| 依据 | 采用的部分 |
| --- | --- |
| WCAG 2.2（AA） | 正文对比度 ≥ 4.5:1；非文本 UI 指示（边框、图标、焦点环）≥ 3:1；键盘焦点可见（2.4.7）；点击目标 ≥ 24×24（2.5.8） |
| Apple HIG / Material · 动效 | 状态切换 120–200ms；缓出曲线；尊重系统「减少动效」偏好 |
| 4px 基准栅格（Tailwind 间距刻度） | 所有内/外边距取 4 的倍数，常用 8 / 12 / 16 / 24 / 32 |
| Fitts 定律 | 可点击控件最小高度：桌面 32px、图标按钮 34–36px、主操作 38–42px |

---

## 1. 设计 token

token 定义在 [index.css](file:///workspace/apps/web/src/index.css#L10-L54)（`:root` 为深色默认，`[data-theme='light']` 覆盖），
通过 `@theme inline` 映射为 Tailwind 类，因此**主题切换即时生效、无需重编译**。

### 1.1 语义色

| Tailwind 类 | CSS 变量 | 用途 |
| --- | --- | --- |
| `bg-canvas` | `--bg` | 页面底色 |
| `bg-surface` | `--bg-elev` | 卡片 / 面板 / 顶栏 |
| `bg-surface-2` | `--bg-elev-2` | 次级容器、内嵌块 |
| `border-line` | `--border` | 全部描边 |
| `text-ink` | `--text` | 正文 |
| `text-muted` | `--muted` | 次要文字、说明 |
| `text-accent` / `bg-accent` | `--accent` | 链接、焦点环、强调 |
| `bg-accent-strong` + `text-on-accent` | `--accent-strong` | 主按钮（唯一允许承载白字的蓝底） |
| `text-danger` | `--danger` | 错误、缺失边 |
| `chapter` `concept` `claim` `person` `work` `excerpt` | 同名变量 | 5 类节点/边 + 原文摘录的语义色 |

规则：
- **颜色一律走 token，不写十六进制**。唯一例外是「每本书的强调色 / 封面底板 / 路径 chip 三色轮转」这类装饰性映射，集中在组件顶部的映射函数里（如 [HomePage.tsx](file:///workspace/apps/web/src/pages/HomePage.tsx#L30-L51)）。
- 半透明叠加统一用 Tailwind 的透明度修饰符（`bg-chapter/15`、`border-accent/40`），不要在 CSS 里手写 `color-mix`。
- `--accent-strong` 与 `--accent` 是两个用途：**accent 只用于线与文字**，accent-strong 只用于**需要白字的实心按钮**。深色下 accent 偏亮（#7eb8ff），直接配白字只有 1.9:1，禁止这样用。

### 1.2 圆角 / 阴影 / 动效

| token | 值 | 用途 |
| --- | --- | --- |
| `rounded-inner` | 12px | 按钮、输入框、内嵌小卡片 |
| `rounded-panel` | 14px | 面板、路径卡片、抽屉分组 |
| `rounded-card` | 16px | 页面级卡片、抽屉 |
| `rounded-full` | — | 胶囊标签、chip、头像位 |
| `shadow-soft` | 6/18 | 浮动小控件（图例、chip 行） |
| `shadow-card` | 10/28 | 页面级卡片 |
| `shadow-float` | 12/32 | 浮层：下拉、弹窗、路径导读 |
| `shadow-accent` | 4/14 蓝色投影 | 主按钮 |
| `ease-soft` | `cubic-bezier(.22,.61,.36,1)` | 所有过渡的默认曲线 |

---

## 2. 版式与间距

- 正文 16px / 行高 1.55；次要说明 0.78–0.88rem；标签 0.72rem。
- 页面主内容列宽：首页与详情页 `max-w-[920px] / max-w-[1040px]`，两侧 20px（移动端 14px）留白。
- 垂直节奏：区块间距 16–18px，卡片内边距 16–20px，密集区（顶栏、副栏）6–12px。
- 长文（简介、摘录）限制为 `max-w-[26em] ~ [36em]`，避免单行过长影响可读性。

## 3. 组件规范

所有组件样式经原语集中管理，见 [ui/styles.ts](file:///workspace/apps/web/src/components/ui/styles.ts)：

| 原语 | 说明 |
| --- | --- |
| `buttonClass({variant, size})` | `primary`（accent-strong 底 + 白字 + 蓝色投影）/ `ghost`（surface 底 + line 边，hover 转 accent）。尺寸 `sm` 32px / `md` 36px / `lg` 42px |
| `iconButtonClass({active})` | 36×36 方形图标按钮；`active` 用于「已完成路径」等开关态 |
| `fieldClass` | 输入框/下拉：line 边、surface 底、focus 转 accent 边 + 2px accent/25 光环 |
| `cardSurface` / `panelSurface` | 卡片 / 面板容器 |
| `Pill`（组件） | 胶囊标签，`tone` 取 `neutral` 或 5 种节点类型 |
| `cn()` | clsx + tailwind-merge，用于合并外部 className 并消解冲突 |

约定：
- **按钮必须来自原语**，不要在页面里手写按钮类。需要覆盖尺寸时通过 `className` 传增量（`cn` 会自动让后者胜出）。
- 链接按钮统一用 `<Link className={buttonClass(...)}>`，不要给 `<a>` 加自定义下划线。
- 图标统一来自 [icons.tsx](file:///workspace/apps/web/src/components/icons.tsx)，默认带 `inline-block shrink-0 align-[-0.15em]`。

## 4. 交互规范

- **焦点可见**：全局 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`（[index.css](file:///workspace/apps/web/src/index.css#L145-L149)）。不要用 `outline: none` 关闭它，需要自定义时用 `focus-visible:outline-none` 并补等价视觉。
- **悬停/激活**：只改颜色、边框与 1–2px 位移，不改布局尺寸（避免抖动）。卡片 hover 用 `hover:-translate-y-0.5`，胶囊/按钮 hover 用 `hover:border-accent hover:text-accent`。
- **禁用态**：`disabled:opacity-45` + `disabled:cursor-not-allowed`，不改变尺寸。
- **触达尺寸**：见第 3 节的尺寸表；移动端主操作不小于 38px 高。
- **动效**：仅过渡 `colors / transform / box-shadow`，时长 120–200ms，曲线 `ease-soft`。全局在 `prefers-reduced-motion: reduce` 下把动画与过渡压到 0.01ms（[index.css](file:///workspace/apps/web/src/index.css#L153-L163)）。
- **键盘可达**：地图页已有完整快捷键（`/` 搜索、`?` 说明、`Esc` 关闭、`←/→` 步进），新增交互需同步更新快捷键弹窗与 `aria-label`。

## 5. 断点

沿用迁移前的断点，避免视觉回归；新增响应式规则请优先复用：

| 断点 | 用途 |
| --- | --- |
| `max-[860px]` | 主移动断点：顶栏压缩、筛选胶囊换下拉、抽屉改为底部上滑 |
| `min-[861px]` | 桌面专属（抽屉侧栏宽度、折叠态窄轨） |
| `max-[760px]` | 首页 Hero 蒙层由斜向改上下 |
| `max-[560px]` / `max-[480px]` | 详情页统计两列并一列 / Hero 改单列 |

## 6. 工程约定

- 样式一律写在 JSX 的 `className` 上；**不允许新增页面级 CSS 文件**。
- 需要条件样式时用 `cn()` 组合，不要在 JSX 里拼字符串。
- 深色模式用 `dark:` 前缀（已绑定到 `[data-theme='dark']`，见 [index.css](file:///workspace/apps/web/src/index.css#L97-L98)），不要用系统 `prefers-color-scheme`。
- 残留 CSS 只有两处，且都有明确原因：
  1. [react-flow.css](file:///workspace/apps/web/src/styles/react-flow.css)：React Flow 自渲染 `.react-flow__controls` / `__minimap` / `__edge` / handle 等第三方类名，无法挂 utilities，只能以少量 `!important` 覆盖。
  2. [index.css](file:///workspace/apps/web/src/index.css#L165-L288) 的「装饰性多层背景」：`.page-wash*` / `.brand-mark*` / `.hero-photo` / `.hero-scrim` / `.topbar-map` / `.canvas-mist`。这些是「多层渐变 + 收尾颜色」或「渐变叠照片」的写法，写成 arbitrary utilities 既冗长又存在类型歧义，因此收敛为组件类。

## 7. 已达标与已知偏差（实测）

已达标：
- 正文 `ink` 在其所处底色上的对比度：深色约 16:1、浅色约 13:1。
- 次要文字 `muted`：浅色 ≥ 4.5:1、深色 ≥ 6:1。
- 主按钮白字：浅色 4.55:1、深色 4.88:1（深色底色已从 `#3d7ad6` 调到 `#3570c8` 以达标）。
- 全站无横向滚动、无内容裁剪（390 / 1280 两档实测）。

已知偏差（建议后续处理，不影响功能）：
- **浅色模式下节点类型标签文字对比度约 4.0:1**，略低于正文 AA 阈值 4.5:1。原因是标签用同色相中低明度色做文字（如 `text-chapter` = `#3b6fb0`）叠在 15% 同色底上。修法二选一：把标签文字改为该色相的更深值，或文字统一用 `text-ink`、只保留描边/底色的类型区分。
- 图标按钮 34–36px、普通按钮 32px：满足 WCAG 2.5.8 的 24px 下限，但低于 Apple HIG 的 44pt 建议值；如需对齐 HIG，可整体上调一档尺寸。
