import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cn,
  fieldClass,
  iconButtonClass,
  IconClose,
  IconSearch,
  matchesQuery,
  NODE_TYPE_LABEL,
  Pill,
  snippetForQuery,
  type ConceptGraph,
  type MapNode,
  type NodeType,
  type TypeFilter,
} from '@concept-map/core';

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-claim/45 px-0.5 text-inherit">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

interface Props {
  graph: ConceptGraph;
  filter: TypeFilter;
  initialQuery: string;
  onPick: (node: MapNode, query: string) => void;
  onClose: () => void;
}

/** 全屏搜索层：输入 + 命中列表；选中后回到画布并定位。 */
export default function SearchOverlay({ graph, filter, initialQuery, onPick, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return [] as MapNode[];
    return graph.nodes.filter(
      (n) => (filter === 'all' || n.type === filter) && matchesQuery(n, q),
    );
  }, [graph, filter, q]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 pt-[calc(env(safe-area-inset-top)+8px)] pb-2.5">
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-muted"
            aria-hidden
          >
            <IconSearch size={16} />
          </span>
          <input
            ref={inputRef}
            className={cn(fieldClass, 'h-11 w-full rounded-full pr-3 pl-9')}
            type="search"
            placeholder="搜索节点标题 / 摘要 / 摘录…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索节点"
          />
        </div>
        <button
          type="button"
          className={iconButtonClass({ className: 'h-11 w-11' })}
          onClick={onClose}
          aria-label="关闭搜索"
        >
          <IconClose />
        </button>
      </header>

      {q ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <p className="mt-0 mb-2 px-1 text-[0.78rem] text-muted">
            命中 {hits.length} 个节点
            {filter !== 'all' ? `（仅「${NODE_TYPE_LABEL[filter as NodeType]}」）` : ''}
          </p>
          {hits.length === 0 ? (
            <p className="px-1 py-8 text-center text-muted">没有匹配的节点</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {hits.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-inner border border-line bg-surface px-3 py-2.5 text-left shadow-soft active:bg-surface-2"
                    onClick={() => onPick(n, query)}
                  >
                    <span className="mb-1 flex items-center gap-2">
                      <Pill tone={n.type as NodeType}>
                        {NODE_TYPE_LABEL[n.type as NodeType] ?? n.type}
                      </Pill>
                      <strong className="min-w-0 flex-1 truncate text-[0.95rem]">
                        <Highlight text={n.label} query={query} />
                      </strong>
                    </span>
                    <span className="line-clamp-2 block text-[0.8rem] leading-[1.4] text-muted">
                      <Highlight text={snippetForQuery(n, query)} query={query} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-muted">
          输入关键词，搜索节点标题 / 摘要 / 原文摘录
        </p>
      )}
    </div>
  );
}