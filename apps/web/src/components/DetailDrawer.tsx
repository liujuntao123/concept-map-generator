import { useMemo, useState } from 'react';
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
  type MapMeta,
  type MapNode,
  type NodeType,
} from '../types/graph';

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
}: Props) {
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const typeLabel = NODE_TYPE_LABEL[node.type as NodeType] ?? node.type;
  const related = relatedFor(graph, node.id);
  const tags = dedupeTags(node.type, node.tags);
  const body = readerBody(node);
  const excerpt = (node.source.excerpt || '').trim();
  const sourceFile = node.source.anchor || node.source.file;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof related>();
    for (const r of related) {
      const k = String(r.edge.type);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()];
  }, [related]);

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
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="cm-pill">
                {t}
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
              ← 返回上一概念
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
            ×
          </button>
        </div>
      </header>

      <section className="cm-drawer__section">
        <h3>概要</h3>
        <p>{node.summary}</p>
      </section>

      {body ? (
        <section className="cm-drawer__section">
          <h3>论述</h3>
          <p className="cm-drawer__content">{body}</p>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="cm-drawer__section">
          <h3>相关节点（{related.length}）</h3>
          {grouped.map(([etype, items]) => (
            <div key={etype} className="cm-related-group">
              <div className="cm-related-group__title">
                {EDGE_TYPE_LABEL[etype] ?? etype}
                {etype === 'contains' ? ' · 结构' : ''}
              </div>
              <div className="cm-related-list">
                {items.map(({ node: rn, edge, direction }) => {
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
            </div>
          ))}
        </section>
      ) : null}

      <section className="cm-drawer__section">
        <h3>原文摘录</h3>
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
          {meta.schemaVersion ? (
            <div>
              <dt>数据版本</dt>
              <dd>{meta.schemaVersion}</dd>
            </div>
          ) : null}
          {meta.author ? (
            <div>
              <dt>作者</dt>
              <dd>{meta.author}</dd>
            </div>
          ) : null}
        </dl>
      </details>
    </aside>
  );
}
