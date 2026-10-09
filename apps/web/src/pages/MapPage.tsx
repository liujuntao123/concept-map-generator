import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MapCanvas, { type MapCanvasHandle, type TypeFilter } from '../components/MapCanvas';
import DetailDrawer from '../components/DetailDrawer';
import EdgePanel from '../components/EdgePanel';
import { formatGeneratedAt, matchesQuery } from '../lib/graphUtils';
import { useTheme } from '../hooks/useTheme';
import {
  type ConceptGraph,
  type MapEdge,
  type MapMeta,
  type MapNode,
  type NodeType,
} from '../types/graph';

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'chapter', label: '章节' },
  { key: 'concept', label: '概念' },
  { key: 'claim', label: '主张' },
  { key: 'person', label: '人物' },
  { key: 'work', label: '著作' },
];

export default function MapPage() {
  const { mapId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, toggle } = useTheme();
  const canvasRef = useRef<MapCanvasHandle>(null);

  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<MapEdge | null>(null);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [chapterFocusId, setChapterFocusId] = useState<string | null>(null);
  const [pathHighlight, setPathHighlight] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [gRes, mRes] = await Promise.all([
          fetch(`/maps/${mapId}/graph.json`),
          fetch(`/maps/${mapId}/meta.json`),
        ]);
        if (!gRes.ok || !mRes.ok) throw new Error('无法加载概念地图数据');
        const g = (await gRes.json()) as ConceptGraph;
        const m = (await mRes.json()) as MapMeta;
        if (!cancelled) {
          setGraph(g);
          setMeta(m);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  // deep link ?node=
  useEffect(() => {
    if (!graph) return;
    const nid = searchParams.get('node');
    if (nid) {
      const n = graph.nodes.find((x) => x.id === nid) ?? null;
      setSelected(n);
      setSelectedEdge(null);
    }
  }, [graph, searchParams]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const id = (ev as CustomEvent<{ id: string }>).detail?.id;
      if (id) {
        setChapterFocusId(id);
        setPathHighlight(null);
      }
    };
    window.addEventListener('cm-chapter-focus', handler);
    return () => window.removeEventListener('cm-chapter-focus', handler);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, MapNode>();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const chapters = useMemo(
    () => (graph ? graph.nodes.filter((n) => n.type === 'chapter') : []),
    [graph],
  );

  const filteredCycle = useMemo(() => {
    if (!graph) return [] as MapNode[];
    const q = query.trim().toLowerCase();
    return graph.nodes.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false;
      if (chapterFocusId) {
        // approximate: keep nodes that match focus set after canvas logic — use chapter label/source
        if (n.id !== chapterFocusId && n.source.chapter) {
          const ch = byId.get(chapterFocusId);
          if (ch && n.source.chapter !== ch.label && n.id !== chapterFocusId) {
            // still include if connected — cycle list uses simple filter
          }
        }
      }
      return matchesQuery(n, q);
    });
  }, [graph, filter, query, chapterFocusId, byId]);

  const selectNode = useCallback(
    (node: MapNode | null) => {
      setSelected(node);
      setSelectedEdge(null);
      setPathHighlight(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (node) next.set('node', node.id);
          else next.delete('node');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (selected || selectedEdge) {
          selectNode(null);
          setSelectedEdge(null);
        } else if (chapterFocusId) {
          setChapterFocusId(null);
        }
        return;
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && filteredCycle.length) {
        e.preventDefault();
        const ids = filteredCycle.map((n) => n.id);
        const cur = selected ? ids.indexOf(selected.id) : -1;
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const next = ids[(cur + delta + ids.length) % ids.length];
        const node = byId.get(next);
        if (node) selectNode(node);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, selectedEdge, filteredCycle, byId, selectNode, chapterFocusId]);

  const focusChapterByLabel = useCallback(
    (label: string) => {
      const ch = chapters.find((c) => c.label === label);
      if (ch) {
        setChapterFocusId(ch.id);
        selectNode(ch);
      }
    },
    [chapters, selectNode],
  );

  if (error) {
    return (
      <div className="cm-shell cm-shell--center">
        <p className="cm-error">{error}</p>
        <Link to="/">返回目录</Link>
      </div>
    );
  }

  if (!graph || !meta) {
    return (
      <div className="cm-shell cm-shell--center">
        <p className="cm-loading">正在加载概念地图…</p>
      </div>
    );
  }

  const stats = meta.stats;
  const focusChapter = chapterFocusId ? byId.get(chapterFocusId) : null;
  const showSuggest = searchOpen && !query.trim();
  const featured = meta.featuredPaths ?? [];
  const hasDrawer = Boolean(selected || selectedEdge);

  const presentTypes = new Set(graph.nodes.map((n) => n.type));

  return (
    <div className={`cm-shell${hasDrawer ? ' has-drawer' : ''}`}>
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <Link className="cm-back" to="/">
              ← 地图目录
            </Link>
            <h1>{meta.title}</h1>
            <p>
              {meta.subtitle ?? '概念地图'}
              {meta.author ? ` · ${meta.author}` : ''}
              {meta.version ? ` · v${meta.version}` : ''}
            </p>
          </div>
        </div>

        <div className="cm-toolbar">
          <div className="cm-search-wrap">
            <input
              className="cm-search"
              type="search"
              placeholder="搜索标签 / 概要 / 摘录…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 180)}
              aria-label="搜索节点"
            />
            {showSuggest ? (
              <div className="cm-suggest" role="listbox">
                <div className="cm-suggest__title">推荐路径</div>
                {featured.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="cm-suggest__item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPathHighlight(p.nodeIds);
                      setChapterFocusId(null);
                      const first = byId.get(p.nodeIds[0]);
                      if (first) selectNode(first);
                      setSearchOpen(false);
                    }}
                  >
                    <strong>{p.title}</strong>
                    <span>{p.description}</span>
                  </button>
                ))}
                <div className="cm-suggest__title">精选概念</div>
                {graph.nodes
                  .filter((n) => n.type === 'claim' || n.type === 'concept')
                  .slice(0, 6)
                  .map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="cm-suggest__item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        selectNode(n);
                        setSearchOpen(false);
                      }}
                    >
                      <strong>{n.label}</strong>
                      <span>{n.summary.slice(0, 48)}…</span>
                    </button>
                  ))}
              </div>
            ) : null}
          </div>

          <div className="cm-filters" role="group" aria-label="节点类型筛选">
            {TYPE_FILTERS.filter(
              (f) => f.key === 'all' || presentTypes.has(f.key as NodeType),
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                className={`cm-chip${filter === f.key ? ' is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="cm-chapter-filter">
            <select
              className="cm-select"
              aria-label="按章节筛选"
              value={chapterFocusId ?? ''}
              onChange={(e) => {
                const v = e.target.value || null;
                setChapterFocusId(v);
                setPathHighlight(null);
                if (v) {
                  const n = byId.get(v);
                  if (n) selectNode(n);
                }
              }}
            >
              <option value="">全部章节</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {chapterFocusId || pathHighlight ? (
              <button
                type="button"
                className="cm-btn"
                onClick={() => {
                  setChapterFocusId(null);
                  setPathHighlight(null);
                }}
              >
                显示全部
              </button>
            ) : null}
          </div>

          {stats ? (
            <div className="cm-stats" title={`生成于 ${formatGeneratedAt(meta.generatedAt)} · 来源 ${meta.source?.file ?? ''}`}>
              <span>{stats.chapters} 章节</span>
              <span>{stats.concepts} 概念</span>
              <span>{stats.edges} 关系</span>
            </div>
          ) : null}

          <button
            type="button"
            className="cm-theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main className="cm-main">
        <div className="cm-canvas">
          {focusChapter ? (
            <div className="cm-focus-banner">
              <span>聚焦章节：{focusChapter.label}（双击章节可聚焦）</span>
              <button type="button" className="cm-btn" onClick={() => setChapterFocusId(null)}>
                显示全部
              </button>
            </div>
          ) : null}
          <MapCanvas
            canvasRef={canvasRef}
            graph={graph}
            filter={filter}
            query={query}
            chapterFocusId={chapterFocusId}
            selectedId={selected?.id ?? null}
            selectedEdgeId={selectedEdge?.id ?? null}
            highlightPathIds={pathHighlight}
            onSelect={selectNode}
            onSelectEdge={setSelectedEdge}
          />
          <div className="cm-view-controls">
            <button
              type="button"
              className="cm-btn"
              onClick={() => canvasRef.current?.fitView()}
            >
              适配全部
            </button>
            <button
              type="button"
              className="cm-btn"
              onClick={() => canvasRef.current?.focusSelected()}
              disabled={!selected}
            >
              聚焦选中
            </button>
          </div>
        </div>

        {selected ? (
          <DetailDrawer
            node={selected}
            graph={graph}
            meta={meta}
            onClose={() => selectNode(null)}
            onSelectRelated={(n) => selectNode(n)}
            onFocusChapter={focusChapterByLabel}
          />
        ) : selectedEdge ? (
          <EdgePanel
            edge={selectedEdge}
            sourceNode={byId.get(selectedEdge.source)}
            targetNode={byId.get(selectedEdge.target)}
            onClose={() => setSelectedEdge(null)}
            onOpenNode={(id) => {
              const n = byId.get(id);
              if (n) selectNode(n);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
