import { useState } from 'react';
import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type NodeType } from '../types/graph';
import { IconChevronRight, IconInfo } from './icons';
import { cn } from '../lib/cn';

const NODE_ORDER: NodeType[] = ['chapter', 'concept', 'claim', 'person', 'work'];
const EDGE_ORDER = ['related', 'contrasts', 'cites', 'contains'] as const;

const EDGE_TIP: Record<string, string> = {
  related: '语义相关或互释',
  contrasts: '对照 / 对反',
  cites: '引用或提及',
  contains: '结构线（默认隐藏，可在「更多」打开）',
};

/* 图例色块：与节点外观对应的缩略色标 */
const BAR_CLASS: Record<NodeType, string> = {
  chapter: 'bg-chapter',
  concept: 'bg-concept',
  claim: 'bg-claim',
  person: 'bg-person',
  work: 'bg-work',
};

const THUMB_CLASS: Record<NodeType, string> = {
  chapter:
    'h-3.5 w-[22px] shrink-0 rounded-[3px] border border-line border-l-4 border-l-chapter bg-[color-mix(in_srgb,var(--chapter)_40%,var(--bg-elev))]',
  concept:
    'h-3.5 w-4 shrink-0 rounded-[4px] border border-line border-t-[3px] border-t-concept bg-[color-mix(in_srgb,var(--concept)_35%,var(--bg-elev))]',
  claim:
    'h-3.5 w-[22px] shrink-0 rounded-[4px] border border-line bg-[color-mix(in_srgb,var(--claim)_30%,var(--bg-elev))] shadow-[inset_0_0_0_2px_var(--claim)]',
  person:
    'h-3.5 w-[18px] shrink-0 rounded-full border border-line bg-[color-mix(in_srgb,var(--person)_40%,var(--bg-elev))]',
  work:
    'h-3.5 w-[22px] shrink-0 rounded-[2px_5px_5px_2px] border border-line border-l-[5px] border-l-work bg-[color-mix(in_srgb,var(--work)_35%,var(--bg-elev))]',
};

const LINE_CLASS: Record<(typeof EDGE_ORDER)[number], string> = {
  related: 'border-t-muted',
  contrasts: 'border-t-claim border-dashed',
  cites: 'border-t-[2px] border-t-work border-dotted',
  contains: 'border-t-chapter opacity-35',
};

export default function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className="absolute top-3 right-3 z-[7] max-w-[200px] text-[0.75rem] text-muted max-[860px]:top-2 max-[860px]:right-2"
      aria-label="图例"
    >
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 shadow-soft"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="图例"
      >
        <span className="flex gap-[3px]" aria-hidden>
          {NODE_ORDER.map((t) => (
            <i key={t} className={cn('block h-2.5 w-2.5 rounded-[3px]', BAR_CLASS[t])} />
          ))}
        </span>
        <span className="text-[0.78rem] text-muted">图例</span>
        <IconChevronRight size={14} className={cn(open && 'rotate-90')} />
      </button>
      {open ? (
        <div className="mt-1.5 max-h-[50vh] overflow-auto rounded-inner border border-line bg-surface p-2.5 shadow-soft">
          <div>
            <div className="mt-2 mb-1 text-[0.68rem] tracking-[0.04em] uppercase">节点</div>
            {NODE_ORDER.map((t) => (
              <div key={t} className="my-[3px] flex items-center gap-2">
                <span className={THUMB_CLASS[t]} aria-hidden />
                <span>{NODE_TYPE_LABEL[t]}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="mt-2 mb-1 text-[0.68rem] tracking-[0.04em] uppercase">关系</div>
            {EDGE_ORDER.map((t) => (
              <div key={t} className="my-[3px] flex items-center gap-2" title={EDGE_TIP[t]}>
                <span className={cn('h-0 w-[22px] shrink-0 border-t-2', LINE_CLASS[t])} aria-hidden />
                <span>
                  {t === 'contains' ? '结构线' : (EDGE_TYPE_LABEL[t] ?? t)}
                  <IconInfo size={12} className="ml-1 align-[-1px] opacity-55" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
