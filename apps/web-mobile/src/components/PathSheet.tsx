import {
  buttonClass,
  cn,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExit,
  IconSignal,
  pathThemeIcon,
  Pill,
  type FeaturedPath,
} from '@concept-map/core';
import Sheet, { type SheetSnap } from './Sheet';

interface Props {
  path: FeaturedPath;
  stepIndex: number;
  completed: boolean;
  labelOf: (id: string) => string;
  missingEdgeAt: boolean[];
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  onJump: (i: number) => void;
  onToggleComplete: () => void;
  onExit: () => void;
}

/** 路径步骤抽屉：全部步骤 + 进度操作。 */
export default function PathSheet({
  path,
  stepIndex,
  completed,
  labelOf,
  missingEdgeAt,
  snap,
  onSnap,
  onClose,
  onJump,
  onToggleComplete,
  onExit,
}: Props) {
  const n = path.nodeIds.length;

  return (
    <Sheet
      snap={snap}
      onSnap={onSnap}
      onClose={onClose}
      ariaLabel="路径步骤"
      header={
        <div className="flex items-center gap-2">
          <Pill>路径</Pill>
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">
            {path.theme || path.title}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pt-1 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1">
            {pathThemeIcon(path.theme || path.id || path.title, 14)} {n} 步
          </span>
          {path.difficulty ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1">
              <IconSignal size={14} /> {path.difficulty}
            </span>
          ) : null}
          {path.durationMin != null ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1">
              <IconClock size={14} /> 约 {path.durationMin} 分钟
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-accent">
            第 {stepIndex + 1} / {n} 步
          </span>
        </div>

        {path.description ? (
          <p className="m-0 text-[0.85rem] leading-[1.6] text-muted">{path.description}</p>
        ) : null}

        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {path.nodeIds.map((id, i) => {
            const st = path.steps?.[i];
            const miss = missingEdgeAt[i] ?? false;
            const active = i === stepIndex;
            return (
              <li key={`${id}-${i}`}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer gap-2.5 rounded-inner border border-transparent px-2.5 py-2 text-left active:bg-surface-2',
                    active && 'border-line bg-surface-2',
                  )}
                  onClick={() => onJump(i)}
                >
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[0.72rem] text-muted',
                      active && 'bg-accent-strong text-on-accent',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('text-[0.9rem]', active ? 'font-semibold' : '')}>
                      {labelOf(id)}
                    </span>
                    {st?.rationale ? (
                      <span className="text-[0.78rem] leading-[1.45] text-muted">
                        {st.rationale}
                      </span>
                    ) : null}
                    {i > 0 ? (
                      miss ? (
                        <span className="text-[0.72rem] font-[650] text-danger">无线（图谱中暂无连接）</span>
                      ) : st?.edgeLabel ? (
                        <span className="text-[0.72rem] text-accent">{st.edgeLabel}</span>
                      ) : null
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass({ size: 'lg', className: 'flex-1' })}
            onClick={() => onJump(Math.max(0, stepIndex - 1))}
            disabled={stepIndex <= 0}
          >
            <IconChevronLeft size={16} /> 上一步
          </button>
          <button
            type="button"
            className={buttonClass({ variant: 'primary', size: 'lg', className: 'flex-1' })}
            onClick={() => onJump(Math.min(n - 1, stepIndex + 1))}
            disabled={stepIndex >= n - 1}
          >
            下一步 <IconChevronRight size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass({ size: 'lg', className: 'flex-1' })}
            onClick={onToggleComplete}
          >
            <IconCheck size={16} /> {completed ? '已完成（点击取消）' : '标记完成'}
          </button>
          <button
            type="button"
            className={buttonClass({ size: 'lg', className: 'flex-1' })}
            onClick={onExit}
          >
            <IconExit size={16} /> 退出路径
          </button>
        </div>
      </div>
    </Sheet>
  );
}