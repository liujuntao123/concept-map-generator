import { useState } from 'react';
import {
  dedupeTags,
  formatGeneratedDate,
  isStructuralEdge,
  readerBody,
  relatedFor,
} from '../lib/graphUtils';
import {
  EDGE_TYPE_LABEL,
  NODE_TYPE_LABEL,
  type ConceptGraph,
  type FeaturedPath,
  type MapEdge,
  type MapMeta,
  type MapNode,
  type NodeType,
} from '../types/graph';
import {
  IconBack,
  IconBook,
  IconClose,
  IconInfo,
  IconList,
  IconPath,
} from './icons';

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
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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

  const step = pathContext?.path.steps?.[pathContext.stepIndex];
  const stepLine =
    step?.rationale ||
    summary.split(/[。！？]/)[0] ||
    summary.slice(0, 72);


  const relatedFlat = related.slice(0, relatedOpen ? related.length : 3);

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
      className={`cm-drawer${peek ? ' cm-drawer--peek' : ''}`}
      aria-label="节点详情"
      role="dialog"
    >
      <button
        type="button"
        className="cm-drawer__grip"
        aria-label={peek ? '展开详情' : '收起详情'}
        onClick={() => (peek ? onExpand?.() : onCollapse?.())}
      />
      <header className="cm-drawer__header">
        <div>
          <div className="cm-drawer__badges">
            <span className={`cm-pill cm-pill--${node.type}`}>{typeLabel}</span>
            {tags.slice(0, 2).map((tg) => (
              <span key={tg} className="cm-pill">
                {tg}
              </span>
            ))}
          </div>
          <h2 title={node.label}>{node.label}</h2>
          {peek ? (
            <button type="button" className="cm-btn cm-btn--ghost cm-drawer__back" onClick={() => onExpand?.()}>
              展开详情
            </button>
          ) : onBack ? (
            <button type="button" className="cm-btn cm-btn--ghost cm-drawer__back" onClick={onBack}>
              <IconBack size={14} /> 返回上一概念
            </button>
          ) : null}
        </div>
        <div className="cm-drawer__header-actions">
          {!peek && onCollapse ? (
            <button type="button" className="cm-btn cm-btn--ghost" onClick={() => onCollapse()}>
              收起
            </button>
          ) : null}
          <button type="button" className="cm-icon-btn" onClick={onClose} aria-label="关闭">
            <IconClose />
          </button>
        </div>
      </header>

      {pathContext ? (
        <section className="cm-drawer__section cm-drawer__step">
          <h3>
            <IconPath size={14} /> 这一步
          </h3>
          <p className="cm-drawer__step-meta">
            第 {pathContext.stepIndex + 1}/{pathContext.path.nodeIds.length} 步
            {pathContext.path.difficulty ? ` · ${pathContext.path.difficulty}` : ''}
            {pathContext.path.durationMin ? ` · 约 ${pathContext.path.durationMin} 分钟` : ''}
          </p>
          <p className="cm-scale-line">{stepLine}</p>
          {pathContext.edgeInto || step?.edgeLabel ? (
            <p className="cm-drawer__edge-keep">
              关系：
              {pathContext.edgeInto?.label ||
                step?.edgeLabel ||
                EDGE_TYPE_LABEL[String(pathContext.edgeInto?.type)] ||
                '相关'}
            </p>
          ) : null}
          {pathContext.nextLabel ? (
            <p className="cm-muted">
              下一步预览：
              {pathContext.path.steps?.[pathContext.stepIndex + 1]?.edgeLabel
                ? `${pathContext.path.steps[pathContext.stepIndex + 1]!.edgeLabel} · `
                : ''}
              {pathContext.nextLabel}
            </p>
          ) : (
            <p className="cm-muted">已到路径终点</p>
          )}
        </section>
      ) : (
        <section className="cm-drawer__section">
          <h3>
            <IconInfo size={14} /> 这一步
          </h3>
          <p className="cm-drawer__clamp">{summary}</p>
        </section>
      )}

      {showDetail ? (
        <section className="cm-drawer__section">
          <button
            type="button"
            className="cm-drawer__fold"
            onClick={() => setDetailOpen((v) => !v)}
          >
            <IconList size={14} /> {detailOpen ? '收起详述' : '展开详述'}
          </button>
          {detailOpen ? <p className="cm-drawer__content">{body}</p> : null}
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="cm-drawer__section">
          <h3>
            <IconList size={14} /> 相关（{related.length}）
          </h3>
          <div className="cm-related-list">
            {relatedFlat.map(({ node: rn, edge, direction }) => {
              const edgeType = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
              const edgeLabel =
                edge.label && edge.label !== edgeType && !isStructuralEdge(edge)
                  ? edge.label
                  : null;
              return (
                <button
                  key={`${edge.id}-${rn.id}`}
                  type="button"
                  className="cm-related-item"
                  onClick={() => onSelectRelated(rn)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cm-related-item__meta">
                      {edgeLabel || edgeType}
                      {direction === 'out' ? ' →' : ' ←'}
                    </div>
                    <div className="cm-related-item__label" title={rn.label}>
                      {rn.label}
                    </div>
                  </div>
                  <span className={`cm-pill cm-pill--${rn.type}`}>
                    {NODE_TYPE_LABEL[rn.type as NodeType] ?? rn.type}
                  </span>
                </button>
              );
            })}
          </div>
          {related.length > 3 ? (
            <button
              type="button"
              className="cm-btn cm-btn--ghost"
              onClick={() => setRelatedOpen((v) => !v)}
            >
              {relatedOpen ? '收起相关' : `显示全部 ${related.length}`}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="cm-drawer__section">
        <h3>
          <IconBook size={14} /> 原文摘录
        </h3>
        <div className="cm-locate">
          <span>
            章节：
            <button
              type="button"
              className="cm-btn cm-btn--ghost"
              style={{ marginLeft: 6 }}
              onClick={() => onFocusChapter?.(node.source.chapter)}
              title="只看这一章"
            >
              {node.source.chapter}
            </button>
          </span>
        </div>
        {excerpt ? (
          <div className="cm-excerpt-wrap">
            <blockquote className="cm-excerpt">{excerpt}</blockquote>
            <button type="button" className="cm-copy-btn" onClick={() => void copyExcerpt()}>
              {copied ? '已复制摘录' : '复制原文摘录'}
            </button>
          </div>
        ) : (
          <p className="cm-muted">暂无摘录</p>
        )}
      </section>

      <details
        className="cm-about"
        open={aboutOpen}
        onToggle={(e) => setAboutOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>关于这张图</summary>
        <dl className="cm-dl cm-dl--stacked">
          <div>
            <dt>地图版本</dt>
            <dd>{meta.version ?? '—'}</dd>
          </div>
          <div>
            <dt>生成日期</dt>
            <dd>{formatGeneratedDate(meta.generatedAt ?? meta.createdAt)}</dd>
          </div>
          <div>
            <dt>源书文件</dt>
            <dd>{meta.source?.file ?? '—'}</dd>
          </div>
          {sourceFile ? (
            <div>
              <dt>本节点原文文件</dt>
              <dd>
                <code>{sourceFile}</code>
              </dd>
            </div>
          ) : null}
        </dl>
      </details>
    </aside>
  );
}
