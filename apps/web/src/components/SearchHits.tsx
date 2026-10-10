import { snippetForQuery } from '../lib/graphUtils';
import { NODE_TYPE_LABEL, type MapNode, type NodeType } from '../types/graph';

interface Props {
  hits: MapNode[];
  query: string;
  selectedId: string | null;
  collapsed?: boolean;
  onSelect: (node: MapNode) => void;
  onExpand?: () => void;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const iq = lower.indexOf(q.toLowerCase());
  if (iq < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, iq)}
      <mark className="cm-hit-mark">{text.slice(iq, iq + q.length)}</mark>
      {text.slice(iq + q.length)}
    </>
  );
}

export default function SearchHits({
  hits,
  query,
  selectedId,
  collapsed,
  onSelect,
  onExpand,
}: Props) {
  if (!query.trim()) return null;

  if (collapsed) {
    return (
      <div className="cm-search-hits cm-search-hits--collapsed">
        <button type="button" className="cm-search-hits__headbtn" onClick={onExpand}>
          命中 {hits.length} · 展开列表
        </button>
      </div>
    );
  }

  return (
    <div className="cm-search-hits" role="listbox" aria-label="搜索结果">
      <div className="cm-search-hits__head">命中 {hits.length} 个节点</div>
      {hits.length === 0 ? (
        <p className="cm-search-hits__empty">没有匹配结果</p>
      ) : (
        <ul className="cm-search-hits__list">
          {hits.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`cm-search-hits__item${selectedId === n.id ? ' is-active' : ''}`}
                onClick={() => onSelect(n)}
              >
                <span className={`cm-pill cm-pill--${n.type}`}>
                  {NODE_TYPE_LABEL[n.type as NodeType] ?? n.type}
                </span>
                <strong>
                  <Highlight text={n.label} query={query} />
                </strong>
                <span className="cm-search-hits__snip">
                  <Highlight text={snippetForQuery(n, query)} query={query} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
