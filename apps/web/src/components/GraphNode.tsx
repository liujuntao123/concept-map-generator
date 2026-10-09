import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_TYPE_LABEL, type NodeType } from '../types/graph';

export type GraphNodeData = {
  label: string;
  nodeType: NodeType;
  reviewStatus?: 'draft' | 'reviewed';
  dimmed?: boolean;
  neighbor?: boolean;
};

function GraphNodeComponent({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const typeLabel = NODE_TYPE_LABEL[data.nodeType] ?? data.nodeType;
  const cls = [
    'cm-node',
    `cm-node--${data.nodeType}`,
    selected ? 'is-selected' : '',
    data.neighbor ? 'is-neighbor' : '',
    data.dimmed ? 'is-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} title={data.label}>
      <Handle type="target" position={Position.Top} className="cm-handle" />
      <span className="cm-node__badge">
        {typeLabel}
        {data.reviewStatus === 'draft' ? <span className="cm-node__draft">待审</span> : null}
      </span>
      <span className="cm-node__label">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="cm-handle" />
    </div>
  );
}

export default memo(GraphNodeComponent);
