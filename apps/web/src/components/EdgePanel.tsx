import { edgeRelationSentence } from '../lib/graphUtils';
import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type MapEdge, type MapNode, type NodeType } from '../types/graph';
import Pill from './ui/Pill';
import { buttonClass, iconButtonClass } from './ui/styles';
import { cn } from '../lib/cn';

interface Props {
  edge: MapEdge;
  sourceNode?: MapNode;
  targetNode?: MapNode;
  peek?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onClose: () => void;
  onOpenNode: (id: string) => void;
}

const PANEL_CLASS =
  'border-l border-line bg-surface overflow-auto p-4 max-[860px]:absolute max-[860px]:inset-x-0 max-[860px]:bottom-0 max-[860px]:z-10 max-[860px]:h-[min(36vh,300px)] max-[860px]:max-h-[36vh] max-[860px]:w-full max-[860px]:rounded-t-[16px] max-[860px]:border-t max-[860px]:border-t-line max-[860px]:border-l-0 max-[860px]:shadow-[0_-8px_28px_var(--shadow-color)]';
const PEEK_CLASS =
  'min-[861px]:w-[76px] min-[861px]:max-w-[76px] min-[861px]:flex min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-2 min-[861px]:overflow-hidden min-[861px]:px-2 min-[861px]:py-2.5 max-[860px]:h-[88px] max-[860px]:max-h-[88px] max-[860px]:overflow-hidden';

const COLLAPSE_BTN =
  'inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-[10px] border border-line bg-surface-2 px-2.5 py-1.5 text-[0.8rem] text-muted whitespace-nowrap transition-[border-color,color,background-color] duration-[120ms] hover:border-accent hover:bg-accent/10 hover:text-accent';

export default function EdgePanel({
  edge,
  sourceNode,
  targetNode,
  peek = false,
  onExpand,
  onCollapse,
  onClose,
  onOpenNode,
}: Props) {
  const typeLabel = EDGE_TYPE_LABEL[edge.type] ?? edge.type;
  const a = sourceNode?.label ?? edge.source;
  const b = targetNode?.label ?? edge.target;
  const sentence = edgeRelationSentence(edge, a, b);

  // Optional short note only if description is real prose (not type dump)
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
    <aside
      className={cn(PANEL_CLASS, peek && PEEK_CLASS)}
      aria-label="关系说明"
      role="dialog"
    >
      <button
        type="button"
        className="mx-auto mt-2 mb-1 hidden h-1 w-10 cursor-pointer rounded-full border-0 bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] p-0 max-[860px]:block"
        aria-label={peek ? '展开' : '收起'}
        onClick={() => (peek ? onExpand?.() : onCollapse?.())}
      />
      <header
        className={cn(
          'mb-2 flex items-start justify-between gap-3',
          peek && 'min-[861px]:m-0 min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-2',
        )}
      >
        <div>
          <div className={cn('flex flex-wrap items-center gap-1.5', peek && 'min-[861px]:hidden')}>
            <Pill>{typeLabel}</Pill>
          </div>
          <h2
            className={cn(
              'mt-1 text-[1.08rem] leading-[1.35]',
              peek &&
                'min-[861px]:mx-auto min-[861px]:my-0 min-[861px]:max-h-[40vh] min-[861px]:overflow-hidden min-[861px]:text-[0.85rem] min-[861px]:leading-[1.25] min-[861px]:[text-orientation:mixed] min-[861px]:[writing-mode:vertical-rl]',
            )}
          >
            关系说明
          </h2>
        </div>
        <div
          className={cn(
            'flex items-start gap-1',
            peek && 'min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-1.5',
          )}
        >
          {peek && onExpand ? (
            <button
              type="button"
              className={buttonClass({
                variant: 'primary',
                className: 'min-h-9 w-full px-1.5 py-2 text-[0.78rem]',
              })}
              onClick={() => onExpand()}
              title="展开侧栏"
            >
              展开
            </button>
          ) : null}
          {!peek && onCollapse ? (
            <button
              type="button"
              className={COLLAPSE_BTN}
              onClick={() => onCollapse()}
              title="收起侧栏，地图变宽"
              aria-label="收起侧栏"
            >
              收起 ›
            </button>
          ) : null}
          <button
            type="button"
            className={cn(iconButtonClass(), 'text-[1.3rem] leading-none', peek && 'min-[861px]:w-full')}
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      </header>

      <section className="mt-2.5">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-[0.88rem] font-semibold tracking-[0.08em] text-muted uppercase">
          这句话
        </h3>
        <p className="m-0 text-[1.02rem] leading-[1.55]">{sentence}</p>
        {note ? <p className="m-0 text-[0.85rem] text-muted">{note}</p> : null}
      </section>

      <section className="mt-2.5">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-[0.88rem] font-semibold tracking-[0.08em] text-muted uppercase">
          两端
        </h3>
        <div className="flex flex-col gap-1.5">
          {sourceNode ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-start gap-2 rounded-[10px] border border-line bg-surface-2 px-2.5 py-2 text-left hover:border-accent"
              onClick={() => onOpenNode(sourceNode.id)}
            >
              <div className="flex-1">
                <div className="text-[0.72rem] text-muted">起点</div>
                <div className="text-[0.9rem] font-semibold">{sourceNode.label}</div>
              </div>
              <Pill tone={sourceNode.type as NodeType}>
                {NODE_TYPE_LABEL[sourceNode.type as NodeType] ?? sourceNode.type}
              </Pill>
            </button>
          ) : null}
          {targetNode ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-start gap-2 rounded-[10px] border border-line bg-surface-2 px-2.5 py-2 text-left hover:border-accent"
              onClick={() => onOpenNode(targetNode.id)}
            >
              <div className="flex-1">
                <div className="text-[0.72rem] text-muted">终点</div>
                <div className="text-[0.9rem] font-semibold">{targetNode.label}</div>
              </div>
              <Pill tone={targetNode.type as NodeType}>
                {NODE_TYPE_LABEL[targetNode.type as NodeType] ?? targetNode.type}
              </Pill>
            </button>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
