import { edgeRelationSentence } from '../lib/graphUtils';
import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type MapEdge, type MapNode, type NodeType } from '../types/graph';
import { IconChevronRight, IconClose } from './icons';
import Pill from './ui/Pill';
import { buttonClass, iconButtonClass } from './ui/styles';
import { SHEET_HEIGHT, SHEET_PEEK_HEIGHT, SHEET_SHELL } from './ui/drawer';
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

const PANEL_CLASS = cn(
  'overflow-auto border-l border-line bg-surface p-4',
  SHEET_SHELL,
  SHEET_HEIGHT,
);
const PEEK_CLASS = cn(
  'min-[861px]:w-[76px] min-[861px]:max-w-[76px] min-[861px]:flex min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-2 min-[861px]:overflow-hidden min-[861px]:px-2 min-[861px]:py-2.5',
  SHEET_PEEK_HEIGHT,
  'max-[861px]:overflow-hidden',
);

const COLLAPSE_BTN =
  'inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-[10px] border border-line bg-surface-2 px-2.5 py-1.5 text-[0.8rem] text-muted whitespace-nowrap transition-[border-color,color,background-color] duration-[120ms] hover:border-accent hover:bg-accent/10 hover:text-accent';

/** 收起态的「展开」按钮：移动端随行紧凑，桌面窄轨里通宽 */
const EXPAND_BTN = cn(
  buttonClass({ variant: 'primary' }),
  'h-9 shrink-0 px-3 text-[0.78rem] whitespace-nowrap min-[861px]:h-auto min-[861px]:min-h-9 min-[861px]:w-full min-[861px]:px-1.5',
);

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
      {/* 触控用的拖拽手柄：与「展开」按钮功能重复，故不进入无障碍树与 Tab 顺序 */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="mx-auto mt-2 mb-1 hidden h-1 w-10 cursor-pointer rounded-full border-0 bg-[color-mix(in_srgb,var(--muted)_55%,transparent)] p-0 max-[861px]:block"
        onClick={() => (peek ? onExpand?.() : onCollapse?.())}
      />
      <header
        className={cn(
          'mb-2 flex items-start justify-between gap-3',
          peek &&
            'mb-0 items-center gap-2 min-[861px]:m-0 min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-2',
        )}
      >
        <div
          className={cn(
            'min-w-0',
            peek &&
              'flex flex-1 items-center gap-2 min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-1',
          )}
        >
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              peek && 'shrink-0 min-[861px]:hidden',
            )}
          >
            <Pill>{typeLabel}</Pill>
          </div>
          <h2
            className={cn(
              'text-[1.08rem] leading-[1.35]',
              !peek && 'mt-1',
              peek &&
                'my-0 truncate text-[0.95rem] min-[861px]:mx-auto min-[861px]:my-0 min-[861px]:max-h-[40vh] min-[861px]:overflow-hidden min-[861px]:text-[0.85rem] min-[861px]:leading-[1.25] min-[861px]:whitespace-normal min-[861px]:[text-orientation:mixed] min-[861px]:[writing-mode:vertical-rl]',
            )}
          >
            关系说明
          </h2>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-start gap-1',
            peek && 'min-[861px]:flex-col min-[861px]:items-stretch min-[861px]:gap-1.5',
          )}
        >
          {peek && onExpand ? (
            <button type="button" className={EXPAND_BTN} onClick={() => onExpand()} title="展开侧栏">
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
              收起
              <IconChevronRight size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className={cn(iconButtonClass(), peek && 'min-[861px]:w-full')}
            onClick={onClose}
            aria-label="关闭"
          >
            <IconClose />
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
