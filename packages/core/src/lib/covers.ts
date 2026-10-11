/** 真实封面（JPG/PNG）位于各端 public/illustrations 下，按 mapId 登记。 */
export const COVER_SRC: Record<string, string> = {
  'kahneman-si-kao-kuai-yu-man': '/illustrations/cover-kahneman.jpg',
  'chujia-ying-zou-chu-wei-yi-zhen-li-guan': '/illustrations/cover-chujia.jpg',
};

export type CoverInfo =
  | { kind: 'image'; src: string }
  | { kind: 'type'; text: string; color?: string };

/**
 * 封面来源：**真实封面图优先**；没有登记真实封面时用「字型封面」——
 * 取 `coverText`（缺省取书名首字）放大，底板色取 `coverColor`（缺省用主题强调色）。
 * 规范见 skills/book-to-conceptmap/SKILL.md「封面规范」。
 */
export function coverInfoOf(
  id: string,
  title: string,
  coverText?: string,
  coverColor?: string,
): CoverInfo {
  const src = COVER_SRC[id];
  if (src) return { kind: 'image', src };
  const text = (coverText || title || '书').trim().slice(0, 2);
  return { kind: 'type', text, color: coverColor };
}