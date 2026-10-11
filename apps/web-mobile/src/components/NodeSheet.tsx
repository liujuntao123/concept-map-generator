import { useEffect, useState } from 'react';
import {
  dedupeTags,
  EDGE_TYPE_LABEL,
  formatGeneratedDate,
  IconBack,
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconList,
  IconNote,
  IconPath,
  isStructuralEdge,
  NODE_TYPE_LABEL,
  Pill,
  readerBody,
  relatedFor,
  type ConceptGraph,
  type FeaturedPath,
  type MapMeta,
  type MapNode,
  type NodeType,
} from '@concept-map/core';
import Sheet, { type SheetSnap } from './Sheet';
import Collapse from './Collapse';

export interface PathContext {
  path: FeaturedPath;
  stepIndex: number;
  nextLabel: string | null;
}

interface Props {
  node: MapNode;
  graph: ConceptGraph;
  meta: MapMeta;
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  onSelectRelated: (node: MapNode) => void;
  onFocusChapter: (label: string) => void;
  onBack?: () => void;
  pathContext?: PathContext | null;
}

const SECTION_TITLE = 'inline-flex items-center gap-1.5';

/** 节点详情抽屉：概要 + 折叠分区（摘录 / 详述 / 相关 / 笔记 / 关于）。 */
export default function NodeSheet({
  node,
  graph,
  meta,
  snap,
  onSnap,
  onClose,
  onSelectRelated,
  onFocusChapter,
  onBack,
  pathContext = null,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const typeLabel = NODE_TYPE_LABEL[node.type as NodeType] ?? node.type;
  const tags = dedupeTags(node.type, node.tags);
  const related = relatedFor(graph, node.id);
  const body = readerBody(node);
  const summary = (node.summary || '').trim();
  const excerpt = (node.source.excerpt || '').trim();
  const sourceFile = node.source.anchor || node.source.file;
  const showDetail = Boolean(
    body &&
      body.replace(/\s/g, '') !== summary.replace(/\s/g, '') &&
      body.length > summary.length + 24,
  );

  const step = pathContext?.path.steps?.[pathContext.stepIndex];
  const stepLine = step?.rationale || summary.split(/[。！？]/)[0] || summary.slice(0, 72);

  const noteKey = `cm-note:${meta.id}:${node.id}`;
  useEffect(() => {
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
    <Sheet
      snap={snap}
      onSnap={onSnap}
      onClose={onClose}
      ariaLabel="节点详情"
      header={
        <div className="flex items-center gap-2">
          <Pill tone={node.type as NodeType}>{typeLabel}</Pill>
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">
            {node.label}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pt-1">
        {tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        ) : null}

        {pathContext ? (
          <section className="rounded-inner bg-accent/10 px-3 py-2.5">
            <p className="mb-1 flex items-center gap-1.5 text-[0.75rem] text-muted">
              <IconPath size={14} /> 第 {pathContext.stepIndex + 1} 步
              {pathContext.path.difficulty ? ` · ${pathContext.path.difficulty}` : ''}
              {pathContext.path.durationMin ? ` · 约 ${pathContext.path.durationMin} 分钟` : ''}
            </p>
            {stepLine ? (
              <p className="my-0.5 text-[0.88rem] leading-[1.5] font-[650]">{stepLine}</p>
            ) : null}
            <p className="m-0 text-[0.82rem] text-muted">
              {pathContext.nextLabel ? `接下来看：${pathContext.nextLabel}` : '这条路径走完了'}
            </p>
          </section>
        ) : null}

        {summary ? <p className="m-0 text-[0.95rem] leading-[1.65]">{summary}</p> : null}

        {onBack ? (
          <button
            type="button"
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 py-2 text-[0.85rem] text-muted"
            onClick={onBack}
          >
            <IconBack size={14} /> 返回上一概念
          </button>
        ) : null}

        <Collapse
          title={
            <span className={SECTION_TITLE}>
              <IconBook size={15} /> 原文摘录
            </span>
          }
          defaultOpen
        >
          <p className="mt-0 mb-2 text-[0.82rem] text-muted">
            章节：
            <button
              type="button"
              className="ml-1 cursor-pointer rounded-md border border-line bg-surface-2 px-2 py-0.5 text-ink"
              onClick={() => onFocusChapter(node.source.chapter)}
            >
              {node.source.chapter}
            </button>
          </p>
          {excerpt ? (
            <>
              <blockquote className="m-0 max-h-[38vh] overflow-auto rounded-r-inner border-l-4 border-l-excerpt bg-[color-mix(in_srgb,var(--excerpt)_12%,var(--bg-elev))] px-3 py-2.5 text-[0.9rem] whitespace-pre-wrap [overflow-wrap:anywhere]">
                {excerpt}
              </blockquote>
              <button
                type="button"
                className="mt-2 cursor-pointer rounded-lg border border-line bg-surface-2 px-3 py-2 text-[0.85rem] text-muted"
                onClick={() => void copyExcerpt()}
              >
                {copied ? '已复制' : '复制摘录'}
              </button>
            </>
          ) : (
            <p className="m-0 text-[0.85rem] text-muted">暂无摘录</p>
          )}
        </Collapse>

        {showDetail ? (
          <Collapse title="详述">
            <p className="m-0 text-[0.9rem] leading-[1.7] whitespace-pre-wrap">{body}</p>
          </Collapse>
        ) : null}

        <Collapse
          title={
            <span className={SECTION_TITLE}>
              <IconList size={15} /> 相关节点
            </span>
          }
          badge={
            <em className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.72rem] text-muted not-italic">
              {related.length}
            </em>
          }
        >
          {related.length === 0 ? (
            <p className="m-0 text-[0.85rem] text-muted">暂无相关节点</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {related.map(({ node: rn, edge, direction }) => {
                const edgeType = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
                const edgeLabel =
                  edge.label && edge.label !== edgeType && !isStructuralEdge(edge)
                    ? edge.label
                    : null;
                return (
                  <li key={`${edge.id}-${rn.id}`}>
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-inner border border-line bg-surface px-3 py-2.5 text-left shadow-soft active:bg-surface-2"
                      onClick={() => onSelectRelated(rn)}
                    >
                      <span className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Pill tone={rn.type as NodeType}>
                          {NODE_TYPE_LABEL[rn.type as NodeType] ?? rn.type}
                        </Pill>
                        <span className="inline-flex items-center gap-0.5 text-[0.78rem] text-muted">
                          {edgeLabel || edgeType}
                          {direction === 'out' ? (
                            <IconChevronRight size={13} />
                          ) : (
                            <IconChevronLeft size={13} />
                          )}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[0.92rem]">{rn.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Collapse>

        <Collapse
          title={
            <span className={SECTION_TITLE}>
              <IconNote size={15} /> 我的笔记
            </span>
          }
        >
          <p className="mt-0 mb-2 text-[0.78rem] text-muted">
            只存在这台设备上，换浏览器就没了。
          </p>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-inner border border-line bg-canvas px-3 py-2.5 leading-normal outline-none placeholder:text-muted focus:border-accent"
            rows={4}
            placeholder="随手记一点…"
            value={noteDraft}
            onChange={(e) => saveNote(e.target.value)}
          />
        </Collapse>

        <Collapse title="关于这张图">
          <dl className="m-0 grid grid-cols-1 gap-2.5">
            <div>
              <dt className="text-[0.72rem] text-muted">地图版本</dt>
              <dd className="m-0 text-[0.9rem] font-semibold break-words">
                {meta.version ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] text-muted">生成日期</dt>
              <dd className="m-0 text-[0.9rem] font-semibold break-words">
                {formatGeneratedDate(meta.generatedAt ?? meta.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] text-muted">源书文件</dt>
              <dd className="m-0 text-[0.9rem] font-semibold break-words">
                {meta.source?.file ?? '—'}
              </dd>
            </div>
            {sourceFile ? (
              <div>
                <dt className="text-[0.72rem] text-muted">本节点原文文件</dt>
                <dd className="m-0 text-[0.9rem] font-semibold break-words">
                  <code>{sourceFile}</code>
                </dd>
              </div>
            ) : null}
          </dl>
        </Collapse>
      </div>
    </Sheet>
  );
}