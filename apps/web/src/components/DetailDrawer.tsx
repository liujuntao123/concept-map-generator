import { useEffect, useState } from 'react';
import {
  buttonClass,
  cn,
  dedupeTags,
  EDGE_TYPE_LABEL,
  formatGeneratedDate,
  iconButtonClass,
  IconBack,
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconInfo,
  IconList,
  IconNote,
  IconPath,
  isStructuralEdge,
  NODE_TYPE_LABEL,
  Pill,
  readerBody,
  relatedFor,
  SHEET_HEIGHT,
  SHEET_PEEK_HEIGHT,
  SHEET_SHELL,
  type ConceptGraph,
  type FeaturedPath,
  type MapEdge,
  type MapMeta,
  type MapNode,
  type NodeType,
} from '@concept-map/core';

export interface PathDrawerContext {
  path: FeaturedPath;
  stepIndex: number;
  edgeInto: MapEdge | null;
  nextLabel: string | null;
}

interface Props {
  node: MapNode;
  graph: ConceptGraph;
  meta: MapMeta;
  peek?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onClose: () => void;
  onSelectRelated: (node: MapNode) => void;
  onBack?: () => void;
  onFocusChapter?: (chapterLabel: string) => void;
  pathContext?: PathDrawerContext | null;
}

type DrawerTab = 'detail' | 'notes' | 'related';

const DRAWER_CLASS = cn(
  'flex flex-col overflow-auto border-l border-line bg-surface px-2.5 pt-2 pb-3',
  SHEET_SHELL,
  SHEET_HEIGHT,
);
const PEEK_CLASS = cn(
  'min-[861px]:w-[76px] min-[861px]:max-w-[76px] min-[861px]:items-stretch min-[861px]:gap-2 min-[861px]:overflow-hidden min-[861px]:px-2 min-[861px]:py-2.5',
  SHEET_PEEK_HEIGHT,
  'max-[861px]:overflow-hidden',
);

const HEADER_CLASS = 'mb-1 flex items-start justify-between gap-3';
const PEEK_HEADER_CLASS =
  'mb-0 items-center gap-2 min-[861px]:m-0 min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-2';

const SECTION_H3 =
  'mb-1.5 flex items-center gap-1.5 text-[0.88rem] font-semibold tracking-[0.08em] text-muted uppercase';
const MUTED_P = 'm-0 text-[0.85rem] text-muted';

const GHOST_BTN =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 py-1.5 text-muted whitespace-nowrap hover:border-accent hover:text-ink';
/** 收起态的「展开」按钮：移动端随行紧凑，桌面窄轨里通宽 */
const PRIMARY_BTN = cn(
  buttonClass({ variant: 'primary' }),
  'h-9 shrink-0 px-3 text-[0.78rem] min-[861px]:h-auto min-[861px]:min-h-9 min-[861px]:w-full min-[861px]:px-1.5',
);
const COLLAPSE_BTN =
  'inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-[10px] border border-line bg-surface-2 px-2.5 py-1.5 text-[0.8rem] text-muted whitespace-nowrap transition-[border-color,color,background-color] duration-[120ms] hover:border-accent hover:bg-accent/10 hover:text-accent';

const TAB_BASE =
  'inline-flex flex-1 cursor-pointer items-center justify-center gap-[5px] rounded-[10px] border-0 bg-transparent px-1 py-1.5 text-[0.8rem] text-muted hover:bg-surface-2 hover:text-ink';
const TAB_EM_BASE = 'rounded-full bg-surface-2 px-1.5 py-px text-[0.72rem] text-muted not-italic';

function formatNextTip(label: string, rationale?: string | null): string {
  const why = (rationale || '').replace(/\s+/g, ' ').trim();
  const short = why.length > 32 ? `${why.slice(0, 32)}…` : why;
  if (short) return `接下来看：${label}——因为${short}`;
  return `接下来看：${label}`;
}


export default function DetailDrawer({
  node,
  graph,
  meta,
  peek = false,
  onExpand,
  onCollapse,
  onClose,
  onSelectRelated,
  onBack,
  onFocusChapter,
  pathContext = null,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>('detail');
  const [noteDraft, setNoteDraft] = useState('');
  const typeLabel = NODE_TYPE_LABEL[node.type as NodeType] ?? node.type;
  const related = relatedFor(graph, node.id);
  const tags = dedupeTags(node.type, node.tags);
  const body = readerBody(node);
  const excerpt = (node.source.excerpt || '').trim();
  const sourceFile = node.source.anchor || node.source.file;
  const summary = (node.summary || '').trim();
  const showDetail = Boolean(
    body &&
      body.replace(/\s/g, '') !== summary.replace(/\s/g, '') &&
      body.length > summary.length + 24,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const step = pathContext?.path.steps?.[pathContext.stepIndex];
  const stepLine =
    step?.rationale ||
    summary.split(/[。！？]/)[0] ||
    summary.slice(0, 72);

  const noteKey = `cm-note:${meta.id}:${node.id}`;

  useEffect(() => {
    setTab('detail');
    try {
      setNoteDraft(localStorage.getItem(noteKey) || '');
    } catch {
      setNoteDraft('');
    }
  }, [noteKey]);

  function saveNote(v: string) {
    setNoteDraft(v);
    try {
      if (v.trim()) localStorage.setItem(noteKey, v);
      else localStorage.removeItem(noteKey);
    } catch {
      /* ignore */
    }
  }

  async function copyExcerpt() {
    try {
      await navigator.clipboard.writeText(excerpt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside
      className={cn(DRAWER_CLASS, peek && PEEK_CLASS)}
      aria-label="节点详情"
      role="dialog"
    >
      {/* 触控用的拖拽手柄：与「展开」按钮功能重复，故不进入无障碍树与 Tab 顺序 */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="mx-auto mt-2 mb-1 hidden h-1 w-10 cursor-pointer rounded-full border-0 bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] p-0 max-[861px]:block"
        onClick={() => (peek ? onExpand?.() : onCollapse?.())}
      />
      <header className={cn(HEADER_CLASS, peek && PEEK_HEADER_CLASS)}>
        <div
          className={cn(
            'min-w-0',
            peek &&
              'flex flex-1 items-center gap-2 min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-1',
          )}
        >
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              peek && 'shrink-0 min-[861px]:hidden',
            )}
          >
            <Pill tone={node.type as NodeType}>{typeLabel}</Pill>
            {tags.slice(0, peek ? 0 : 2).map((tg) => (
              <Pill key={tg}>{tg}</Pill>
            ))}
          </div>
          <h2
            className={cn(
              'text-[1.08rem] leading-[1.35]',
              !peek && 'mt-1',
              peek &&
                'my-0 truncate text-[0.95rem] min-[861px]:mx-auto min-[861px]:my-0 min-[861px]:max-h-[40vh] min-[861px]:overflow-hidden min-[861px]:text-[0.85rem] min-[861px]:leading-[1.25] min-[861px]:whitespace-normal min-[861px]:[text-orientation:mixed] min-[861px]:[writing-mode:vertical-rl]',
            )}
            title={node.label}
          >
            {node.label}
          </h2>
          {!peek && onBack ? (
            <button
              type="button"
              className={cn(GHOST_BTN, 'mt-1.5 pl-0 text-[0.85rem]')}
              onClick={onBack}
            >
              <IconBack size={14} /> 返回上一概念
            </button>
          ) : null}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-start gap-1',
            peek && 'min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-1.5',
          )}
        >
          {peek && onExpand ? (
            <button type="button" className={PRIMARY_BTN} onClick={() => onExpand()} title="展开侧栏">
              展开
            </button>
          ) : null}
          {!peek && onCollapse ? (
            <button
              type="button"
              className={COLLAPSE_BTN}
              onClick={() => onCollapse()}
              title="收起侧栏，地图变宽"
              aria-label="收起侧栏"
            >
              收起
              <IconChevronRight size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className={cn(iconButtonClass(), peek && 'min-[861px]:w-full')}
            onClick={onClose}
            aria-label="关闭"
          >
            <IconClose />
          </button>
        </div>
      </header>

      {!peek ? (
        <div
          className="mb-0 flex gap-1 border-b border-line px-0 pt-0 pb-1"
          role="tablist"
          aria-label="抽屉分区"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'detail'}
            className={cn(TAB_BASE, tab === 'detail' && 'bg-accent/12 font-[650] text-accent')}
            onClick={() => setTab('detail')}
          >
            <IconInfo size={14} /> 详情
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notes'}
            className={cn(TAB_BASE, tab === 'notes' && 'bg-accent/12 font-[650] text-accent')}
            onClick={() => setTab('notes')}
          >
            <IconNote size={14} /> 笔记
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'related'}
            className={cn(TAB_BASE, tab === 'related' && 'bg-accent/12 font-[650] text-accent')}
            onClick={() => setTab('related')}
          >
            <IconList size={14} /> 关系
            {related.length ? (
              <em className={cn(TAB_EM_BASE, tab === 'related' && 'bg-accent/18 text-accent')}>
                {related.length}
              </em>
            ) : null}
          </button>
        </div>
      ) : null}

      {tab === 'detail' || peek ? (
        <>
          {pathContext ? (
            <section className={cn('mt-1 rounded-[10px] bg-accent/7 px-2 py-1.5', peek && 'hidden')}>
              <p className="mb-1 inline-flex items-center gap-[5px] text-[0.78rem] text-muted">
                <IconPath size={14} /> 第 {pathContext.stepIndex + 1} 步
                {pathContext.path.difficulty ? ` · ${pathContext.path.difficulty}` : ''}
                {pathContext.path.durationMin ? ` · 约 ${pathContext.path.durationMin} 分钟` : ''}
              </p>
              {stepLine ? (
                <p className="my-0.5 text-[0.84rem] font-[650] leading-[1.5]">{stepLine}</p>
              ) : null}
              {pathContext.nextLabel ? (
                <p className={MUTED_P}>
                  {formatNextTip(
                    pathContext.nextLabel,
                    pathContext.path.steps?.[pathContext.stepIndex + 1]?.rationale,
                  )}
                </p>
              ) : (
                <p className={MUTED_P}>这条路径走完了</p>
              )}
            </section>
          ) : (
            <section className={cn('mt-1.5', peek && 'hidden')}>
              <p className="m-0 line-clamp-3 overflow-hidden">{summary}</p>
            </section>
          )}

          {!peek ? (
            <>
              <section className="mt-1.5">
                <h3 className={SECTION_H3}>
                  <IconBook size={14} /> 原文摘录
                </h3>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.85rem] text-muted">
                  <span>
                    章节：
                    <button
                      type="button"
                      className={cn(GHOST_BTN, 'ml-1.5')}
                      onClick={() => onFocusChapter?.(node.source.chapter)}
                      title="只看这一章"
                    >
                      {node.source.chapter}
                    </button>
                  </span>
                </div>
                {excerpt ? (
                  <div className="relative">
                    <blockquote className="m-0 max-h-[min(22vh,180px)] overflow-auto rounded-r-inner border-l-4 border-l-excerpt bg-[color-mix(in_srgb,var(--excerpt)_12%,var(--bg-elev))] px-2.5 py-2 text-[0.86rem] whitespace-pre-wrap [overflow-wrap:anywhere] shadow-soft">
                      {excerpt}
                    </blockquote>
                    <button
                      type="button"
                      className="mt-2 cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[0.82rem] text-muted hover:border-accent hover:text-ink"
                      onClick={() => void copyExcerpt()}
                    >
                      {copied ? '已复制' : '复制摘录'}
                    </button>
                  </div>
                ) : (
                  <p className={MUTED_P}>暂无摘录</p>
                )}
              </section>

              {showDetail ? (
                <section className="mt-1.5">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-accent"
                    onClick={() => setDetailOpen((v) => !v)}
                  >
                    <IconList size={14} /> {detailOpen ? '收起详述' : '展开详述'}
                  </button>
                  {detailOpen ? <p className="whitespace-pre-wrap">{body}</p> : null}
                </section>
              ) : null}

              <details
                className="group mt-1.5 border-t border-line pt-3 text-[0.82rem]"
                open={aboutOpen}
                onToggle={(e) => setAboutOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary className="cursor-pointer font-semibold text-muted group-open:mb-2 group-open:text-ink">
                  关于这张图
                </summary>
                <dl className="my-0 grid grid-cols-1 gap-x-3 gap-y-2.5">
                  <div>
                    <dt className="mb-0.5 text-[0.72rem] text-muted">地图版本</dt>
                    <dd className="m-0 text-[0.95rem] font-semibold break-words">
                      {meta.version ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-[0.72rem] text-muted">生成日期</dt>
                    <dd className="m-0 text-[0.95rem] font-semibold break-words">
                      {formatGeneratedDate(meta.generatedAt ?? meta.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-[0.72rem] text-muted">源书文件</dt>
                    <dd className="m-0 text-[0.95rem] font-semibold break-words">
                      {meta.source?.file ?? '—'}
                    </dd>
                  </div>
                  {sourceFile ? (
                    <div>
                      <dt className="mb-0.5 text-[0.72rem] text-muted">本节点原文文件</dt>
                      <dd className="m-0 text-[0.95rem] font-semibold break-words">
                        <code>{sourceFile}</code>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </details>
            </>
          ) : null}
        </>
      ) : null}

      {!peek && tab === 'notes' ? (
        <section className="mt-1.5 flex min-h-[calc(100%_-_24px)] flex-col gap-1.5">
          <h3 className={SECTION_H3}>
            <IconNote size={14} /> 我的笔记
          </h3>
          <p className={MUTED_P}>只存在这台设备上，换浏览器就没了。</p>
          <textarea
            className="min-h-[140px] flex-1 resize-y rounded-inner border border-line bg-canvas px-3 py-2.5 leading-normal outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/45"
            rows={6}
            placeholder="随手记一点…"
            value={noteDraft}
            onChange={(e) => saveNote(e.target.value)}
          />
        </section>
      ) : null}

      {!peek && tab === 'related' ? (
        <section className="mt-1.5 flex min-h-[calc(100%_-_24px)] flex-col">
          <h3 className={SECTION_H3}>
            <IconList size={14} /> 相关（{related.length}）
          </h3>
          {related.length === 0 ? (
            <p className={MUTED_P}>暂无相关节点</p>
          ) : (
            <div className="flex flex-1 flex-col gap-2">
              {related.map(({ node: rn, edge, direction }) => {
                const edgeType = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
                const edgeLabel =
                  edge.label && edge.label !== edgeType && !isStructuralEdge(edge)
                    ? edge.label
                    : null;
                return (
                  <button
                    key={`${edge.id}-${rn.id}`}
                    type="button"
                    className="flex flex-none cursor-pointer flex-col gap-1.5 rounded-inner border border-line bg-surface px-3.5 py-3 text-left shadow-soft transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-accent hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                    onClick={() => onSelectRelated(rn)}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone={rn.type as NodeType}>
                        {NODE_TYPE_LABEL[rn.type as NodeType] ?? rn.type}
                      </Pill>
                      <span className="inline-flex items-center gap-1">
                        {edgeLabel || edgeType}
                        {direction === 'out' ? (
                          <IconChevronRight size={13} />
                        ) : (
                          <IconChevronLeft size={13} />
                        )}
                      </span>
                    </div>
                    <div title={rn.label}>{rn.label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </aside>
  );
}
