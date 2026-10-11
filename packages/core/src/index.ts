/**
 * @concept-map/core —— 桌面端（apps/web）与移动端（apps/web-mobile）共享层。
 *
 * 划分原则：只有与屏幕尺寸 / 端交互无关的代码放这里。
 * 页面布局、抽屉/面板等交互壳一律留在各端应用内。
 */

/* 内容模型 */
export * from './types/graph';

/* 数据与算法 */
export * from './lib/cn';
export * from './lib/covers';
export * from './lib/decor';
export * from './lib/fetchJson';
export * from './lib/graphUtils';
export * from './lib/layout';

/* 主题 */
export * from './hooks/useTheme';

/* 图标与基础 UI 原语 */
export * from './components/icons';
export * from './components/ui/styles';
export { default as Pill } from './components/ui/Pill';
export * from './components/ui/drawer';

/* 画布引擎 */
export { default as MapCanvas } from './components/MapCanvas';
export type { TypeFilter, MapCanvasHandle, VisibleStats } from './components/MapCanvas';
export { default as MapLegend } from './components/MapLegend';
export { MapLegendContent } from './components/MapLegend';
export { default as GraphNode } from './components/GraphNode';
export type { GraphNodeData } from './components/GraphNode';