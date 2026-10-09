import { useState } from 'react';
import { dedupeTags, formatGeneratedAt, hasDistinctContent, relatedFor } from '../lib/graphUtils';
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
  onClose: () => void;
  onSelectRelated: (node: MapNode) => void;
  onFocusChapter?: (chapterLabel: string) => void;
}

export default function DetailDrawer({
  node,
  graph,
  meta,
  onClose,
  onSelectRelated,
  onFocusChapter,
}: Props) {
  const [copied, setCopied] = useState(false);
  const typeLabel = NODE_TYPE_LABEL[node.type as NodeType] ?? node.type;
  const related = relatedFor(graph, node.id);
  const anchor = node.source.anchor || node.source.file;
  const tags = dedupeTags(node.type, node.tags);
  const showContent = hasDistinctContent(node);

  async function copyExcerpt() {
    try {
      await navigator.clipboard.writeText(node.source.excerpt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="cm-drawer" aria-label="节点详情" role="dialog">
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
        </div>
        <button type="button" className="cm-icon-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      <section className="cm-drawer__section">
        <h3>概要</h3>
        <p>{node.summary}</p>
      </section>

      {showContent ? (
        <section className="cm-drawer__section">
          <h3>详述</h3>
          <p className="cm-drawer__content">{node.content}</p>
        </section>
      ) : null}

      <section className="cm-drawer__section">
        <h3>在书中定位</h3>
        <div className="cm-locate">
          <span>
            章节：
            <button
              type="button"
              className="cm-btn cm-btn--ghost"
              style={{ marginLeft: 6 }}
              onClick={() => onFocusChapter?.(node.source.chapter)}
            >
              {node.source.chapter}
            </button>
          </span>
          {anchor ? (
            <span>
              原文文件：<code title="epub 内路径">{anchor}</code>
            </span>
          ) : null}
        </div>
        <div className="cm-excerpt-wrap">
          <blockquote className="cm-excerpt">{node.source.excerpt}</blockquote>
          <button type="button" className="cm-copy-btn" onClick={() => void copyExcerpt()}>
            {copied ? '已复制摘录' : '复制原文摘录'}
          </button>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="cm-drawer__section">
          <h3>相关节点（{related.length}）</h3>
          <div className="cm-related-list">
            {related.map(({ node: rn, edge, direction }) => {
              const edgeType = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
              const edgeLabel =
                edge.label && edge.label !== edgeType ? edge.label : null;
              return (
                <button
                  key={`${edge.id}-${rn.id}`}
                  type="button"
                  className="cm-related-item"
                  onClick={() => onSelectRelated(rn)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cm-related-item__meta">
                      {edgeType}
                      {edgeLabel ? ` · ${edgeLabel}` : ''}
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
        </section>
      ) : null}

      <div className="cm-meta-footer">
        地图版本 {meta.version ?? '—'} · 生成于 {formatGeneratedAt(meta.generatedAt ?? meta.createdAt)}
        <br />
        来源：{meta.source?.file ?? (typeof meta.ima?.file_name === 'string' ? meta.ima.file_name : undefined) ?? '未知'}
        {meta.author ? ` · ${meta.author}` : ''}
      </div>
    </aside>
  );
}
