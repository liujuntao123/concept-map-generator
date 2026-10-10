import { snippetForQuery } from '../lib/graphUtils';
import { NODE_TYPE_LABEL, type MapNode, type NodeType } from '../types/graph';
import Pill from './ui/Pill';
import { cn } from '../lib/cn';

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
      <mark className="rounded-[3px] bg-claim/45 px-0.5 text-inherit">
        {text.slice(iq, iq + q.length)}
      </mark>
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
      <div className="absolute top-14 left-3 z-[6] max-h-none w-auto max-w-[calc(100%-1.5rem)] overflow-auto rounded-inner border border-line bg-surface shadow-float max-[860px]:top-12">
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent px-3 py-2 text-accent"
          onClick={onExpand}
        >
          命中 {hits.length} · 展开列表
        </button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-14 left-3 z-[6] w-[min(320px,42vw)] max-h-[min(420px,55vh)] max-w-[calc(100%-1.5rem)] overflow-auto rounded-inner border border-line bg-surface shadow-float max-[860px]:top-12 max-[860px]:w-[min(280px,70vw)]"
      role="listbox"
      aria-label="搜索结果"
    >
      <div className="border-b border-line px-3 py-2 text-[0.75rem] text-muted">
        命中 {hits.length} 个节点
      </div>
      {hits.length === 0 ? (
        <p className="m-0 p-3 text-muted">没有匹配结果</p>
      ) : (
        <ul className="m-0 list-none p-1.5">
          {hits.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={cn(
                  'grid w-full cursor-pointer grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-lg border-0 bg-transparent p-2 text-left hover:bg-surface-2',
                  selectedId === n.id && 'bg-surface-2',
                )}
                onClick={() => onSelect(n)}
              >
                <Pill tone={n.type as NodeType} className="row-span-2 self-start">
                  {NODE_TYPE_LABEL[n.type as NodeType] ?? n.type}
                </Pill>
                <strong className="text-[0.88rem]">
                  <Highlight text={n.label} query={query} />
                </strong>
                <span className="col-start-2 text-[0.75rem] leading-[1.35] text-muted">
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
