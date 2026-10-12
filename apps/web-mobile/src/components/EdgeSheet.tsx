import {
  edgeRelationSentence,
  EDGE_TYPE_LABEL,
  NODE_TYPE_LABEL,
  Pill,
  type MapEdge,
  type MapNode,
  type NodeType,
} from '@concept-map/core';
import Sheet, { type SheetSnap } from './Sheet';

interface Props {
  edge: MapEdge;
  sourceNode?: MapNode;
  targetNode?: MapNode;
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  onOpenNode: (id: string) => void;
}

/** 关系说明抽屉：一句自然语言 + 两端节点卡。 */
export default function EdgeSheet({
  edge,
  sourceNode,
  targetNode,
  snap,
  onSnap,
  onClose,
  onOpenNode,
}: Props) {
  const typeLabel = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
  const a = sourceNode?.label ?? edge.source;
  const b = targetNode?.label ?? edge.target;
  const sentence = edgeRelationSentence(edge, a, b);

  const raw = (edge.description || '').trim();
  const note =
    raw &&
    !/原关系类型/.test(raw) &&
    raw !== edge.label &&
    raw !== typeLabel &&
    raw.length > 4
      ? raw
      : null;

  return (
    <Sheet
      snap={snap}
      onSnap={onSnap}
      onClose={onClose}
      ariaLabel="关系说明"
      header={
        <div className="flex items-center gap-2">
          <Pill>{typeLabel}</Pill>
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">关系说明</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pt-1">
        <p className="m-0 text-[1rem] leading-[1.65]">{sentence}</p>
        {note ? <p className="m-0 text-[0.85rem] text-muted">{note}</p> : null}

        <section className="border-t border-line pt-3">
          <h3 className="mt-0 mb-2 text-[0.72rem] tracking-[0.08em] text-muted uppercase">两端</h3>
          <div className="flex flex-col gap-2">
            {sourceNode ? (
              <button
                type="button"
                className="flex w-full cursor-pointer items-start gap-2 rounded-inner border border-line bg-surface-2 px-3 py-2.5 text-left active:bg-surface"
                onClick={() => onOpenNode(sourceNode.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.72rem] text-muted">起点</span>
                  <span className="block text-[0.92rem] font-semibold">{sourceNode.label}</span>
                </span>
                <Pill tone={sourceNode.type as NodeType}>
                  {NODE_TYPE_LABEL[sourceNode.type as NodeType] ?? sourceNode.type}
                </Pill>
              </button>
            ) : null}
            {targetNode ? (
              <button
                type="button"
                className="flex w-full cursor-pointer items-start gap-2 rounded-inner border border-line bg-surface-2 px-3 py-2.5 text-left active:bg-surface"
                onClick={() => onOpenNode(targetNode.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.72rem] text-muted">终点</span>
                  <span className="block text-[0.92rem] font-semibold">{targetNode.label}</span>
                </span>
                <Pill tone={targetNode.type as NodeType}>
                  {NODE_TYPE_LABEL[targetNode.type as NodeType] ?? targetNode.type}
                </Pill>
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </Sheet>
  );
}