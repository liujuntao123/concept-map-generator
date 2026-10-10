import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_TYPE_LABEL, type NodeType } from '../types/graph';

export type GraphNodeData = {
  label: string;
  nodeType: NodeType;
  dimmed?: boolean;
  neighbor?: boolean;
  searchHit?: boolean;
  searchContext?: boolean;
  pathStep?: number | null;
};

function GraphNodeComponent({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const typeLabel = NODE_TYPE_LABEL[data.nodeType] ?? data.nodeType;
  const cls = [
    'cm-node',
    `cm-node--${data.nodeType}`,
    selected ? 'is-selected' : '',
    data.neighbor ? 'is-neighbor' : '',
    data.dimmed ? 'is-dimmed' : '',
    data.searchHit ? 'is-search-hit' : '',
    data.searchContext ? 'is-search-ctx' : '',
    data.pathStep != null ? 'is-path' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} title={data.label}>
      <Handle type="target" position={Position.Top} className="cm-handle" />
      <span className="cm-node__badge">{typeLabel}</span>
      <span className="cm-node__label">{data.label}</span>
      {data.pathStep != null ? (
        <span className="cm-node__step" aria-label={`路径第 ${data.pathStep} 步`}>
          {data.pathStep}
        </span>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="cm-handle" />
    </div>
  );
}

export default memo(GraphNodeComponent);
