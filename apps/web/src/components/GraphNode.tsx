import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { NODE_TYPE_LABEL, type NodeType } from '../types/graph';
import { nodeTypeIcon } from './icons';
import { cn } from '../lib/cn';

export type GraphNodeData = {
  label: string;
  nodeType: NodeType;
  dimmed?: boolean;
  neighbor?: boolean;
  searchHit?: boolean;
  searchContext?: boolean;
  pathStep?: number | null;
};

/* 各类型节点的最终外观（min/max-width、内边距、顶/左强调边、底色取自 App.css 的最终值） */
const NODE_TYPE_CLASS: Record<NodeType, string> = {
  chapter:
    'min-w-[200px] max-w-[240px] rounded-inner border-t-0 pl-3.5 pr-2.5 pt-2 pb-2.5 bg-[color-mix(in_srgb,var(--chapter)_16%,var(--bg-elev-2))]',
  concept:
    'min-w-[140px] max-w-[180px] rounded-inner border-t-[3px] border-t-concept px-2.5 pt-2 pb-2.5 bg-[color-mix(in_srgb,var(--concept)_14%,var(--bg-elev-2))]',
  claim:
    'min-w-[150px] max-w-[200px] rounded-inner border-t-0 px-2.5 pt-2 pb-2.5 bg-[color-mix(in_srgb,var(--claim)_18%,var(--bg-elev-2))] shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--claim)_65%,transparent),0_8px_24px_color-mix(in_srgb,var(--shadow-color)_85%,transparent)]',
  person:
    'min-w-[150px] max-w-[170px] rounded-full border-t-0 px-4 pt-2 pb-2.5 text-center bg-[color-mix(in_srgb,var(--person)_18%,var(--bg-elev-2))]',
  work:
    'min-w-[150px] max-w-[200px] rounded-[4px_10px_10px_4px] border-t-0 border-l-[8px] border-l-work px-2.5 pt-2 pb-2.5 bg-[color-mix(in_srgb,var(--work)_14%,var(--bg-elev-2))]',
};

const LABEL_SIZE: Record<NodeType, string> = {
  chapter: 'text-[0.9rem]',
  concept: 'text-[0.84rem]',
  claim: 'text-[0.88rem]',
  person: 'text-[0.84rem]',
  work: 'text-[0.84rem]',
};

function GraphNodeComponent({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const typeLabel = NODE_TYPE_LABEL[data.nodeType] ?? data.nodeType;

  return (
    <div
      className={cn(
        'relative border border-line shadow-[0_2px_10px_color-mix(in_srgb,#1a2a3d_14%,transparent)] transition-[opacity,filter] duration-[120ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        NODE_TYPE_CLASS[data.nodeType],
        selected && 'border-accent ring-2 ring-accent/40 shadow-card',
        data.neighbor && 'border-[color-mix(in_srgb,var(--accent)_55%,var(--border))]',
        data.dimmed && 'opacity-[var(--dim-opacity)] grayscale-[0.35]',
        data.searchHit && 'outline-[2px_solid_var(--accent)] ring-2 ring-accent/55 shadow-card',
        data.searchContext && !data.searchHit && !selected && 'opacity-[0.72]',
        data.pathStep != null &&
          'outline-[2px_solid_color-mix(in_srgb,var(--claim)_70%,var(--accent))]',
      )}
      title={data.label}
    >
      <Handle type="target" position={Position.Top} className="cm-handle" />
      {data.nodeType === 'chapter' ? (
        <span className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-inner bg-chapter" aria-hidden />
      ) : null}
      <span className="mb-1 inline-flex items-center gap-1 text-[0.65rem] text-muted">
        <span className="inline-flex items-center leading-none opacity-90" aria-hidden>
          {nodeTypeIcon(data.nodeType, 11)}
        </span>
        {typeLabel}
      </span>
      <span
        className={cn(
          'line-clamp-3 font-semibold leading-[1.35] break-words whitespace-normal',
          LABEL_SIZE[data.nodeType],
        )}
      >
        {data.label}
      </span>
      {data.pathStep != null ? (
        <span
          className="absolute -top-2 -right-2 grid h-[22px] w-[22px] place-items-center rounded-full bg-accent-strong text-[0.72rem] font-bold text-on-accent shadow-[0_2px_8px_var(--shadow-color)]"
          aria-label={`第 ${data.pathStep} 步`}
        >
          {data.pathStep}
        </span>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="cm-handle" />
    </div>
  );
}

export default memo(GraphNodeComponent);
