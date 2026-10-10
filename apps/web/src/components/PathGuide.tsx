import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconExit,
  IconPath,
  IconSignal,
} from './icons';
import type { FeaturedPath, MapNode } from '../types/graph';

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
  tableOpen?: boolean;
  onToggleTable?: () => void;
  labelOf: (id: string) => string;
  /** true when consecutive steps lack a real graph edge */
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
  const edgeIntoNext = nextStep?.edgeLabel;
  const why = step?.rationale || path.description;
  const nextWhy = nextStep?.rationale;

  return (
    <section className="cm-path-guide" aria-label="路径导读">
      <div className="cm-path-guide__meta">
        {minutes != null ? (
          <span className="cm-path-guide__pill">
            <IconClock size={14} /> 约 {minutes} 分钟
          </span>
        ) : null}
        {difficulty ? (
          <span className="cm-path-guide__pill">
            <IconSignal size={14} /> {difficulty}
          </span>
        ) : null}
        <span className="cm-path-guide__pill">
          <IconPath size={14} /> 第 {stepIndex + 1}/{n} 步
        </span>
        {path.arc ? <span className="cm-path-guide__arc">{path.arc}</span> : null}
      </div>

      <div className="cm-path-guide__now">
        <div className="cm-path-guide__now-label">这一步</div>
        <strong className="cm-path-guide__now-title">{currentNode?.label ?? '…'}</strong>
        <p className="cm-path-guide__why">{why}</p>
        {nextNode ? (
          <p className="cm-path-guide__next">
            <span className="cm-path-guide__next-label">下一步</span>
            {edgeIntoNext ? <span className="cm-path-guide__verb">{edgeIntoNext}</span> : null}
            <span className="cm-path-guide__next-name">{nextNode.label}</span>
            {nextWhy ? <span className="cm-path-guide__next-why">——{nextWhy}</span> : null}
          </p>
        ) : (
          <p className="cm-path-guide__next is-end">已到路径终点</p>
        )}
      </div>

      <div className="cm-path-guide__controls">
        <button
          type="button"
          className="cm-icon-btn"
          onClick={onPrev}
          disabled={stepIndex <= 0}
          aria-label="上一步"
          title="上一步"
        >
          <IconChevronLeft />
        </button>
        <div className="cm-path-dots" role="tablist" aria-label="路径步骤">
          {path.nodeIds.map((_, i) => (
            <button
              key={`${path.id}-dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === stepIndex}
              className={`cm-path-dot${i === stepIndex ? ' is-active' : ''}${i < stepIndex ? ' is-done' : ''}`}
              onClick={() => onJump(i)}
              title={`第 ${i + 1} 步`}
            />
          ))}
        </div>
        <button
          type="button"
          className="cm-btn cm-btn--primary cm-path-guide__nextbtn"
          onClick={onNext}
          disabled={stepIndex >= n - 1}
        >
          下一步 <IconChevronRight size={14} />
        </button>
        <button type="button" className="cm-icon-btn" onClick={onExit} aria-label="退出路径" title="退出路径">
          <IconExit />
        </button>
        <button
          type="button"
          className={`cm-icon-btn${completed ? ' is-on' : ''}`}
          onClick={onToggleComplete}
          aria-label={completed ? '取消完成标记' : '标记已完成'}
          title={completed ? '已完成' : '标记完成'}
        >
          <IconCheck />
        </button>
        {onToggleTable ? (
          <button type="button" className="cm-btn cm-btn--ghost" onClick={onToggleTable}>
            {tableOpen ? '收起步骤' : '步骤表'}
          </button>
        ) : null}
      </div>

      {tableOpen ? (
        <ol className="cm-path-table">
          {path.nodeIds.map((id, i) => {
            const st = path.steps?.[i];
            const miss = missingEdgeAt?.[i] ?? false;
            return (
              <li key={`${id}-${i}`} className={i === stepIndex ? 'is-active' : ''}>
                <button type="button" onClick={() => onJump(i)}>
                  <span className="cm-path-table__i">{i + 1}</span>
                  <span className="cm-path-table__body">
                    <strong>{labelOf(id)}</strong>
                    <em>{st?.rationale}</em>
                    {i > 0 ? (
                      miss ? (
                        <span className="cm-path-table__edge is-missing">无线</span>
                      ) : st?.edgeLabel ? (
                        <span className="cm-path-table__edge">{st.edgeLabel}</span>
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
