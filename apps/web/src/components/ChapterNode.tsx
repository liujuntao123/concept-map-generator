import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type ChapterNodeData = {
  label: string;
  selected?: boolean;
};

function ChapterNodeComponent({ data, selected }: NodeProps<Node<ChapterNodeData>>) {
  return (
    <div className={`cm-node cm-node--chapter${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="cm-handle" />
      <span className="cm-node__badge">章节</span>
      <span className="cm-node__label">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="cm-handle" />
    </div>
  );
}

export default memo(ChapterNodeComponent);
