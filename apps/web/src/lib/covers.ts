/**
 * 封面解析。
 *
 * 封面属于「内容」：随书存放在 content/maps/<mapId>/（由该书 meta.cover 指定文件名，如 "cover.jpg"），
 * 构建时经 scripts/sync-maps.mjs 拷到 /maps/<mapId>/ 供运行时取用。
 * 因此本文件不维护任何「mapId → 封面」的硬编码映射——新增一本书无需改代码。
 * 这里只保留通用兜底占位图（属于 UI 资源，不是某本书的内容）。
 */
export const DEFAULT_COVER = '/illustrations/cover-default.svg';

/** 由 mapId 与该书 meta.cover 解析封面 URL；未配置时回退到通用占位图。 */
export function coverUrl(mapId: string, cover?: string): string {
  return cover ? `/maps/${mapId}/${cover}` : DEFAULT_COVER;
}
