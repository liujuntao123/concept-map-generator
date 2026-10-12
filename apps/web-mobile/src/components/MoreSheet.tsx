import {
  cn,
  IconCheck,
  IconFilter,
  IconMap,
  IconMoon,
  IconPath,
  IconShare,
  IconStructure,
  IconSun,
  MapLegendContent,
  pathThemeIcon,
  Pill,
  type FeaturedPath,
  type MapMeta,
  type MapNode,
  type Theme,
  type TypeFilter,
} from '@concept-map/core';
import Sheet, { type SheetSnap } from './Sheet';
import Collapse from './Collapse';

const FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'chapter', label: '章节' },
  { key: 'concept', label: '概念' },
  { key: 'claim', label: '主张' },
  { key: 'person', label: '人物' },
  { key: 'work', label: '著作' },
];

const SECTION_H = 'mt-4 mb-1 text-[0.72rem] tracking-[0.08em] text-muted uppercase';
const ROW =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-inner border-0 bg-transparent px-1.5 py-2.5 text-left active:bg-surface-2';

interface Props {
  meta: MapMeta;
  featured: FeaturedPath[];
  activePath: FeaturedPath | null;
  pathStep: number;
  chapterFocusId: string | null;
  chapterGroups: Array<{ group: string; items: MapNode[] }>;
  filter: TypeFilter;
  showStructural: boolean;
  theme: Theme;
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  onActivatePath: (path: FeaturedPath) => void;
  onOpenSteps: () => void;
  onFocusChapter: (id: string | null) => void;
  onFilter: (filter: TypeFilter) => void;
  onToggleStructural: () => void;
  onToggleTheme: () => void;
  onShare: () => void;
  onShowTips: () => void;
}

/** 「更多」抽屉：路径 / 章节 / 筛选 / 图例 / 显示 / 分享 / 帮助。 */
export default function MoreSheet({
  meta,
  featured,
  activePath,
  pathStep,
  chapterFocusId,
  chapterGroups,
  filter,
  showStructural,
  theme,
  snap,
  onSnap,
  onClose,
  onActivatePath,
  onOpenSteps,
  onFocusChapter,
  onFilter,
  onToggleStructural,
  onToggleTheme,
  onShare,
  onShowTips,
}: Props) {
  return (
    <Sheet
      snap={snap}
      onSnap={onSnap}
      onClose={onClose}
      ariaLabel="更多"
      header={
        <div className="flex items-center gap-2">
          <Pill>更多</Pill>
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">
            路径 · 章节 · 筛选 · 图例
          </span>
        </div>
      }
    >
      <div className="flex flex-col pt-1 pb-2">
        {featured.length ? (
          <>
            <h3 className={SECTION_H}>推荐路径</h3>
            {featured.map((p) => {
              const active = activePath?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={cn(ROW, active && 'bg-surface-2')}
                  onClick={() => onActivatePath(p)}
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent',
                    )}
                  >
                    {pathThemeIcon(p.theme || p.id || p.title, 18)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.92rem] font-semibold">
                      {p.theme || p.title}
                    </span>
                    <span className="block truncate text-[0.75rem] text-muted">
                      {(p.difficulty || '入门') +
                        (p.durationMin ? ` · 约 ${p.durationMin} 分钟` : '') +
                        ` · ${p.nodeIds.length} 步`}
                    </span>
                  </span>
                  {active ? <IconCheck size={16} className="text-accent" /> : null}
                </button>
              );
            })}
            {activePath ? (
              <button type="button" className={ROW} onClick={onOpenSteps}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent">
                  <IconPath size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.92rem] font-semibold">查看步骤与进度</span>
                  <span className="block text-[0.75rem] text-muted">
                    第 {pathStep + 1} / {activePath.nodeIds.length} 步
                  </span>
                </span>
              </button>
            ) : null}
          </>
        ) : null}

        <Collapse
          className="mt-3 border-t-0"
          title={
            <span className="inline-flex items-center gap-1.5">
              <IconMap size={15} /> 按章节浏览
            </span>
          }
        >
          {chapterFocusId ? (
            <button
              type="button"
              className="mb-2 cursor-pointer rounded-lg border border-line bg-surface-2 px-3 py-2 text-[0.85rem] text-accent"
              onClick={() => onFocusChapter(null)}
            >
              显示全部章节
            </button>
          ) : null}
          {chapterGroups.map(({ group, items }) => (
            <div key={group} className="mb-2">
              <p className="mt-1 mb-1 text-[0.72rem] text-muted">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      'cursor-pointer rounded-full border px-3 py-1.5 text-[0.82rem]',
                      chapterFocusId === c.id
                        ? 'border-transparent bg-accent-strong text-on-accent'
                        : 'border-line bg-surface text-ink active:bg-surface-2',
                    )}
                    onClick={() => onFocusChapter(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Collapse>

        <h3 className={SECTION_H}>
          <span className="inline-flex items-center gap-1.5">
            <IconFilter size={14} /> 筛选节点类型
          </span>
        </h3>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="节点类型筛选">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-[0.82rem]',
                filter === f.key
                  ? 'border-transparent bg-accent-strong text-on-accent'
                  : 'border-line bg-surface text-ink active:bg-surface-2',
              )}
              onClick={() => onFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button type="button" className={cn(ROW, 'mt-2')} onClick={onToggleStructural}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent">
            <IconStructure size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.92rem] font-semibold">显示结构线</span>
            <span className="block text-[0.75rem] text-muted">章节「收录 / 包含」关系（默认隐藏）</span>
          </span>
          <span
            className={cn(
              'h-6 w-10 shrink-0 rounded-full border p-[3px] transition-colors ease-soft',
              showStructural ? 'border-accent bg-accent/25' : 'border-line bg-surface-2',
            )}
            aria-hidden
          >
            <span
              className={cn(
                'block h-4 w-4 rounded-full bg-muted transition-transform ease-soft',
                showStructural && 'translate-x-4 bg-accent',
              )}
            />
          </span>
        </button>

        <h3 className={SECTION_H}>图例</h3>
        <MapLegendContent />

        <h3 className={SECTION_H}>显示</h3>
        <button type="button" className={ROW} onClick={onToggleTheme}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent">
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </span>
          <span className="min-w-0 flex-1 text-[0.92rem] font-semibold">
            {theme === 'dark' ? '切换浅色' : '切换深色'}
          </span>
        </button>

        <h3 className={SECTION_H}>分享与帮助</h3>
        <button type="button" className={ROW} onClick={onShare}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent">
            <IconShare size={18} />
          </span>
          <span className="min-w-0 flex-1 text-[0.92rem] font-semibold">复制当前视图链接</span>
        </button>
        <button type="button" className={ROW} onClick={onShowTips}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-accent">
            <IconPath size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.92rem] font-semibold">怎么读这张图</span>
            <span className="block text-[0.75rem] text-muted">重新显示快速提示</span>
          </span>
        </button>

        {meta.stats ? (
          <p className="mt-4 mb-0 text-center text-[0.75rem] text-muted">
            {meta.title} · {meta.stats.nodes} 节点 · {meta.stats.edges} 关系 · {meta.stats.chapters} 章
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}