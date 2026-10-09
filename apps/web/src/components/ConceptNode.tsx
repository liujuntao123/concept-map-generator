import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type ConceptNodeData = {
  label: string;
};

function ConceptNodeComponent({ data, selected }: NodeProps<Node<ConceptNodeData>>) {
  return (
    <div className={`cm-node cm-node--concept${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="cm-handle" />
      <span className="cm-node__badge">概念</span>
      <span className="cm-node__label">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="cm-handle" />
    </div>
  );
}

export default memo(ConceptNodeComponent);
