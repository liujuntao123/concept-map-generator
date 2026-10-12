/**
 * 封面解析。
 *
 * 封面属于「内容」：随书存放在 content/maps/<mapId>/（由该书 meta.cover 指定文件名，如 "cover.jpg"），
 * 构建时经 scripts/sync-maps.mjs 拷到 /maps/<mapId>/ 供运行时取用。
 * 因此这里不维护任何「mapId → 封面」的硬编码映射——新增一本书无需改代码。
 * 缺省回退：有 meta.cover 走真实封面 URL；否则用「字型封面」（首字放大 + 主色底板，见 TypeCover）。
 */
export const DEFAULT_COVER = '/illustrations/cover-default.svg';

/** 由 mapId 与该书 meta.cover 解析封面 URL；未配置时回退到通用占位图。 */
export function coverUrl(mapId: string, cover?: string): string {
  return cover ? `/maps/${mapId}/${cover}` : DEFAULT_COVER;
}

export type CoverInfo =
  | { kind: 'image'; src: string }
  | { kind: 'type'; text: string; color?: string };

/**
 * 封面来源：**真实封面图优先**（meta.cover，内容自带）；
 * 没有真实封面时用「字型封面」——取书名前两字放大，底板色取 `coverColor`（缺省用主题强调色）。
 * 规范见 skills/book-to-conceptmap/SKILL.md「封面规范」。
 */
export function coverInfoOf(
  mapId: string,
  title: string,
  cover?: string,
  coverColor?: string,
): CoverInfo {
  if (cover) return { kind: 'image', src: coverUrl(mapId, cover) };
  const text = (title || '书').trim().slice(0, 2);
  return { kind: 'type', text, color: coverColor };
}
