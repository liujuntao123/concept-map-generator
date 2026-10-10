import { useState } from 'react';
import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type NodeType } from '../types/graph';
import { IconChevronRight, IconInfo } from './icons';

const NODE_ORDER: NodeType[] = ['chapter', 'concept', 'claim', 'person', 'work'];
const EDGE_ORDER = ['related', 'contrasts', 'cites', 'contains'] as const;

const EDGE_TIP: Record<string, string> = {
  related: '语义相关或互释',
  contrasts: '对照 / 对反',
  cites: '引用或提及',
  contains: '结构线（默认隐藏，可在「更多」打开）',
};

export default function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`cm-legend${open ? ' is-open' : ''}`} aria-label="图例">
      <button
        type="button"
        className="cm-legend__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="图例"
      >
        <span className="cm-legend__bars" aria-hidden>
          {NODE_ORDER.map((t) => (
            <i key={t} className={`cm-legend__bar cm-legend__bar--${t}`} />
          ))}
        </span>
        <span className="cm-legend__toggle-label">图例</span>
        <IconChevronRight size={14} className={open ? 'is-rot' : ''} />
      </button>
      {open ? (
        <div className="cm-legend__body">
          <div className="cm-legend__group">
            <div className="cm-legend__subtitle">节点</div>
            {NODE_ORDER.map((t) => (
              <div key={t} className="cm-legend__row">
                <span className={`cm-legend__thumb cm-legend__thumb--${t}`} aria-hidden />
                <span>{NODE_TYPE_LABEL[t]}</span>
              </div>
            ))}
          </div>
          <div className="cm-legend__group">
            <div className="cm-legend__subtitle">关系</div>
            {EDGE_ORDER.map((t) => (
              <div key={t} className="cm-legend__row" title={EDGE_TIP[t]}>
                <span className={`cm-legend__line cm-legend__line--${t}`} aria-hidden />
                <span>
                  {t === 'contains' ? '结构线' : (EDGE_TYPE_LABEL[t] ?? t)}
                  <IconInfo size={12} className="cm-legend__tip" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
