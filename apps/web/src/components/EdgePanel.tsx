import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type MapEdge, type MapNode, type NodeType } from '../types/graph';

interface Props {
  edge: MapEdge;
  sourceNode?: MapNode;
  targetNode?: MapNode;
  onClose: () => void;
  onOpenNode: (id: string) => void;
}

export default function EdgePanel({ edge, sourceNode, targetNode, onClose, onOpenNode }: Props) {
  const typeLabel = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
  // E2: avoid double label when type label === edge.label (e.g. 包含 · 包含)
  const showLabelPill = Boolean(edge.label && edge.label !== typeLabel);
  const desc =
    edge.description ||
    `「${sourceNode?.label ?? edge.source}」与「${targetNode?.label ?? edge.target}」之间的「${edge.label || typeLabel}」关系。`;

  return (
    <aside className="cm-edge-panel" aria-label="关系说明" role="dialog">
      <header className="cm-drawer__header">
        <div>
          <div className="cm-drawer__badges">
            <span className="cm-pill">{typeLabel}</span>
            {showLabelPill ? <span className="cm-pill">{edge.label}</span> : null}
          </div>
          <h2>关系说明</h2>
        </div>
        <button type="button" className="cm-icon-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      <section className="cm-drawer__section">
        <h3>说明</h3>
        <p>{desc}</p>
      </section>

      <section className="cm-drawer__section">
        <h3>连接节点</h3>
        <div className="cm-related-list">
          {sourceNode ? (
            <button type="button" className="cm-related-item" onClick={() => onOpenNode(sourceNode.id)}>
              <div style={{ flex: 1 }}>
                <div className="cm-related-item__meta">起点</div>
                <div className="cm-related-item__label">{sourceNode.label}</div>
              </div>
              <span className={`cm-pill cm-pill--${sourceNode.type}`}>
                {NODE_TYPE_LABEL[sourceNode.type as NodeType] ?? sourceNode.type}
              </span>
            </button>
          ) : null}
          {targetNode ? (
            <button type="button" className="cm-related-item" onClick={() => onOpenNode(targetNode.id)}>
              <div style={{ flex: 1 }}>
                <div className="cm-related-item__meta">终点</div>
                <div className="cm-related-item__label">{targetNode.label}</div>
              </div>
              <span className={`cm-pill cm-pill--${targetNode.type}`}>
                {NODE_TYPE_LABEL[targetNode.type as NodeType] ?? targetNode.type}
              </span>
            </button>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
