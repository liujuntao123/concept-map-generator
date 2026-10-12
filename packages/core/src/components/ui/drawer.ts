/**
 * 移动端抽屉的尺寸与避让量。
 *
 * 注意：这里必须是**完整的 Tailwind 类名原文**，Tailwind 才能扫描到并生成对应 CSS
 * （用模板字符串拼出来的类名不会被识别）。
 */

/**
 * 抽屉展开态高度：取「视口 72vh」与「容器高度 - 96px」的较小值。
 * 后者保证画布上方始终留出一截地图，避免抽屉把地图完全盖住。
 */
export const SHEET_HEIGHT =
  'max-[861px]:h-[min(72vh,calc(100%_-_96px))] max-[861px]:max-h-[min(72vh,calc(100%_-_96px))]';

/** 抽屉收起态（peek）：只够一行「类型 + 标题 + 展开 + 关闭」 */
export const SHEET_PEEK_HEIGHT = 'max-[861px]:h-[80px] max-[861px]:max-h-[80px]';

/** 移动端抽屉外壳：贴底、上圆角、上滑 */
export const SHEET_SHELL =
  'max-[861px]:absolute max-[861px]:inset-x-0 max-[861px]:bottom-0 max-[861px]:z-10 max-[861px]:w-full max-[861px]:rounded-t-[16px] max-[861px]:border-t max-[861px]:border-t-line max-[861px]:border-l-0 max-[861px]:shadow-[0_-8px_28px_var(--shadow-color)]';

/**
 * 缩放条避让量（收起态）＝ SHEET_PEEK_HEIGHT + 12px。
 * 展开态不再需要避让量：抽屉占满高度时地图只剩一条缝，缩放条改为整体隐藏
 * （见 MapCanvas 的 dock === 'hidden'）。
 */
export const PEEK_DOCK = 'max-[861px]:bottom-[92px]';
