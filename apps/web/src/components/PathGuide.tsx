import {
  buttonClass,
  cn,
  iconButtonClass,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExit,
  IconList,
  IconPath,
  IconSignal,
  IconSkip,
  pathThemeIcon,
  type FeaturedPath,
  type MapNode,
} from '@concept-map/core';

/** Natural Chinese tip — never concatenate edgeLabel + node label chips. */
function formatNextTip(label: string, rationale?: string | null): string {
  const why = (rationale || '').replace(/\s+/g, ' ').trim();
  const short = why.length > 32 ? `${why.slice(0, 32)}…` : why;
  if (short) return `接下来看：${label}——因为${short}`;
  return `接下来看：${label}`;
}

const GHOST_BTN =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 py-1.5 text-muted whitespace-nowrap hover:border-accent hover:text-ink';

interface Props {
  path: FeaturedPath;
  stepIndex: number;
  currentNode: MapNode | null;
  nextNode: MapNode | null;
  completed: boolean;
  onToggleComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onJump: (i: number) => void;
  onSkip?: () => void;
  tableOpen?: boolean;
  onToggleTable?: () => void;
  labelOf: (id: string) => string;
  missingEdgeAt?: boolean[];
}

export default function PathGuide({
  path,
  stepIndex,
  currentNode,
  nextNode,
  completed,
  onToggleComplete,
  onPrev,
  onNext,
  onExit,
  onJump,
  onSkip,
  tableOpen,
  onToggleTable,
  labelOf,
  missingEdgeAt,
}: Props) {
  const n = path.nodeIds.length;
  const step = path.steps?.[stepIndex];
  const nextStep = path.steps?.[stepIndex + 1];
  const difficulty = path.difficulty || null;
  const minutes = path.durationMin ?? null;
  const why = step?.rationale || path.description;
  const nextWhy = nextStep?.rationale;

  return (
    <section
      className="pointer-events-auto m-0 w-full max-w-full rounded-card border border-[color-mix(in_srgb,var(--accent)_20%,var(--border))] bg-surface/90 px-2.5 py-2 shadow-float backdrop-blur-[8px]"
      aria-label="路径导读"
    >
      <div className="grid grid-cols-[auto_1fr] items-start gap-2.5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_14%,#fff)] text-accent shadow-soft dark:bg-[color-mix(in_srgb,var(--accent)_22%,var(--bg-elev-2))]"
          aria-hidden
        >
          {pathThemeIcon(path.theme || path.id || path.title, 26)}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.78rem] text-muted">
            {minutes != null ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
                <IconClock size={14} /> 约 {minutes} 分钟
              </span>
            ) : null}
            {difficulty ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
                <IconSignal size={14} /> {difficulty}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5">
              <IconPath size={14} /> 第 {stepIndex + 1} 步
            </span>
            {path.arc ? <span className="line-clamp-1 text-[0.75rem] text-ink/85">{path.arc}</span> : null}
          </div>

          <div className="mt-1 mb-2.5 rounded-inner bg-[color-mix(in_srgb,var(--bg-elev-2)_65%,transparent)] px-2 py-1.5">
            <strong className="mb-1 block text-base">{currentNode?.label ?? '…'}</strong>
            <p className="mb-0.5 line-clamp-2 text-[0.82rem] leading-[1.45]">{why}</p>
            {nextNode ? (
              <p className="m-0 text-[0.82rem] leading-[1.35] text-ink">
                {formatNextTip(nextNode.label, nextWhy)}
              </p>
            ) : (
              <p className="m-0 text-[0.82rem] leading-[1.35] text-ink">这条路径走完了</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-[5px]" role="tablist" aria-label="路径步骤">
        {path.nodeIds.map((_, i) => (
          <button
            key={`${path.id}-dot-${i}`}
            type="button"
            role="tab"
            aria-selected={i === stepIndex}
            className={cn(
              'h-2 w-2 cursor-pointer rounded-full border-0 bg-[color-mix(in_srgb,var(--muted)_45%,transparent)] p-0',
              i < stepIndex && 'bg-[color-mix(in_srgb,var(--accent)_55%,var(--muted))]',
              i === stepIndex && 'scale-125 bg-accent',
            )}
            onClick={() => onJump(i)}
            title={`第 ${i + 1} 步`}
          />
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={iconButtonClass()}
          onClick={onPrev}
          disabled={stepIndex <= 0}
          aria-label="上一步"
          title="上一步"
        >
          <IconChevronLeft />
        </button>
        <button
          type="button"
          className={buttonClass({
            variant: 'primary',
            className: 'px-3 py-1.5 font-[650]',
          })}
          onClick={onNext}
          disabled={stepIndex >= n - 1}
        >
          下一步 <IconChevronRight size={16} />
        </button>
        {onSkip ? (
          <button type="button" className={GHOST_BTN} onClick={onSkip} title="跳过本步">
            <IconSkip size={14} /> 跳过
          </button>
        ) : null}
        {onToggleTable ? (
          <button type="button" className={GHOST_BTN} onClick={onToggleTable}>
            <IconList size={14} /> {tableOpen ? '收起' : '步骤'}
          </button>
        ) : null}
        <button type="button" className={iconButtonClass()} onClick={onExit} aria-label="退出" title="退出">
          <IconExit />
        </button>
        <button
          type="button"
          className={iconButtonClass({ active: completed })}
          onClick={onToggleComplete}
          aria-label={completed ? '取消完成' : '完成'}
          title={completed ? '已完成' : '完成'}
        >
          <IconCheck />
        </button>
      </div>

      {tableOpen ? (
        <ol className="mt-2.5 mb-0 max-h-[200px] list-none overflow-auto p-0">
          {path.nodeIds.map((id, i) => {
            const st = path.steps?.[i];
            const miss = missingEdgeAt?.[i] ?? false;
            return (
              <li key={`${id}-${i}`}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer gap-2 rounded-lg border-0 bg-transparent px-1 py-1.5 text-left text-inherit hover:bg-surface-2',
                    i === stepIndex && 'bg-surface-2',
                  )}
                  onClick={() => onJump(i)}
                >
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-surface-2 text-[0.72rem] text-muted">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <strong className="text-[0.86rem]">{labelOf(id)}</strong>
                    <em className="text-[0.78rem] text-muted not-italic">{st?.rationale}</em>
                    {i > 0 ? (
                      miss ? (
                        <span className="text-[0.72rem] font-[650] text-danger">无线</span>
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
      ) : null}
    </section>
  );
}
