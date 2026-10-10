import { EDGE_TYPE_LABEL, NODE_TYPE_LABEL, type NodeType } from '../types/graph';

const NODE_ORDER: NodeType[] = ['chapter', 'concept', 'claim', 'person', 'work'];
const EDGE_ORDER = ['related', 'contrasts', 'cites', 'contains'] as const;

export default function MapLegend() {
  return (
    <aside className="cm-legend" aria-label="图例">
      <div className="cm-legend__title">图例</div>
      <div className="cm-legend__group">
        <div className="cm-legend__subtitle">节点</div>
        {NODE_ORDER.map((t) => (
          <div key={t} className="cm-legend__row">
            <span className={`cm-legend__swatch cm-legend__swatch--${t}`} aria-hidden />
            <span>{NODE_TYPE_LABEL[t]}</span>
          </div>
        ))}
      </div>
      <div className="cm-legend__group">
        <div className="cm-legend__subtitle">关系</div>
        {EDGE_ORDER.map((t) => (
          <div key={t} className="cm-legend__row">
            <span className={`cm-legend__line cm-legend__line--${t}`} aria-hidden />
            <span>
              {EDGE_TYPE_LABEL[t] ?? t}
              {t === 'contains' ? '（默认淡化）' : ''}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
