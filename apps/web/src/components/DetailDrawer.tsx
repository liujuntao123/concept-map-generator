import type { MapNode } from '../types/graph';

interface Props {
  node: MapNode | null;
  onClose: () => void;
}

export default function DetailDrawer({ node, onClose }: Props) {
  if (!node) return null;

  const typeLabel = node.type === 'chapter' ? '章节' : '概念';

  return (
    <aside className="cm-drawer" aria-label="节点详情">
      <header className="cm-drawer__header">
        <div>
          <span className={`cm-pill cm-pill--${node.type}`}>{typeLabel}</span>
          <h2>{node.label}</h2>
        </div>
        <button type="button" className="cm-icon-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      <section className="cm-drawer__section">
        <h3>概要</h3>
        <p>{node.summary}</p>
      </section>

      <section className="cm-drawer__section">
        <h3>详述</h3>
        <p className="cm-drawer__content">{node.content}</p>
      </section>

      <section className="cm-drawer__section">
        <h3>原文出处</h3>
        <p className="cm-drawer__source-meta">
          {node.source.chapter}
          {node.source.file ? ` · ${node.source.file}` : ''}
        </p>
        <blockquote className="cm-excerpt">{node.source.excerpt}</blockquote>
      </section>
    </aside>
  );
}
