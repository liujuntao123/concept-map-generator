import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MapCanvas, {
  type MapCanvasHandle,
  type TypeFilter,
  type VisibleStats,
} from '../components/MapCanvas';
import DetailDrawer from '../components/DetailDrawer';
import EdgePanel from '../components/EdgePanel';
import { fetchJson } from '../lib/fetchJson';
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

const ALLOWED_TYPES = new Set(['chapter', 'concept', 'claim', 'person', 'work']);

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
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [searchOpen, setSearchOpen] = useState(false);
  const [chapterFocusId, setChapterFocusId] = useState<string | null>(
    () => searchParams.get('focus') ?? null,
  );
  const [pathHighlight, setPathHighlight] = useState<string[] | null>(null);
  const [visibleStats, setVisibleStats] = useState<VisibleStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [g, m] = await Promise.all([
          fetchJson<ConceptGraph>(
            `/maps/${mapId}/graph.json`,
            '无法加载概念地图数据。请确认地图地址是否正确。',
          ),
          fetchJson<MapMeta>(
            `/maps/${mapId}/meta.json`,
            '无法加载概念地图元数据。请确认地图地址是否正确。',
          ),
        ]);
        if (!cancelled) {
          setGraph(g);
          setMeta(m);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setGraph(null);
          setMeta(null);
          setError(e instanceof Error ? e.message : '无法加载概念地图');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  // Sync URL → state for type / focus / q
  useEffect(() => {
    const t = searchParams.get('type');
    if (!t || t === 'all') setFilter('all');
    else if (ALLOWED_TYPES.has(t)) setFilter(t as TypeFilter);

    const focus = searchParams.get('focus');
    setChapterFocusId(focus && focus.length ? focus : null);

    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  // deep link ?node= / ?edge=
  useEffect(() => {
    if (!graph) return;
    const nid = searchParams.get('node');
    const eid = searchParams.get('edge');
    if (eid) {
      const e = graph.edges.find((x) => x.id === eid) ?? null;
      setSelectedEdge(e);
      setSelected(null);
      return;
    }
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
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('focus', id);
            return next;
          },
          { replace: true },
        );
      }
    };
    window.addEventListener('cm-chapter-focus', handler);
    return () => window.removeEventListener('cm-chapter-focus', handler);
  }, [setSearchParams]);

  const byId = useMemo(() => {
    const m = new Map<string, MapNode>();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const chapters = useMemo(
    () => (graph ? graph.nodes.filter((n) => n.type === 'chapter') : []),
    [graph],
  );

  const patchParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectNode = useCallback(
    (node: MapNode | null) => {
      setSelected(node);
      setSelectedEdge(null);
      setPathHighlight(null);
      patchParams((next) => {
        if (node) next.set('node', node.id);
        else next.delete('node');
        next.delete('edge');
      });
    },
    [patchParams],
  );

  const selectEdge = useCallback(
    (edge: MapEdge | null) => {
      setSelectedEdge(edge);
      if (edge) {
        setSelected(null);
        setPathHighlight(null);
        patchParams((next) => {
          next.set('edge', edge.id);
          next.delete('node');
        });
      } else {
        patchParams((next) => {
          next.delete('edge');
        });
      }
    },
    [patchParams],
  );

  const setFilterAndUrl = useCallback(
    (key: TypeFilter) => {
      setFilter(key);
      setSelectedEdge(null);
      // M5: clear selection if it no longer matches the type filter
      const mismatch = Boolean(selected && key !== 'all' && selected.type !== key);
      if (mismatch) {
        setSelected(null);
      }
      patchParams((next) => {
        if (key === 'all') next.delete('type');
        else next.set('type', key);
        if (mismatch) {
          next.delete('node');
          next.delete('edge');
        }
      });
    },
    [patchParams, selected],
  );

  const setQueryAndUrl = useCallback(
    (value: string) => {
      setQuery(value);
      patchParams((next) => {
        const v = value.trim();
        if (v) next.set('q', v);
        else next.delete('q');
      });
    },
    [patchParams],
  );

  const setFocusAndUrl = useCallback(
    (id: string | null) => {
      setChapterFocusId(id);
      setPathHighlight(null);
      patchParams((next) => {
        if (id) next.set('focus', id);
        else next.delete('focus');
      });
    },
    [patchParams],
  );

  // M3: when search has zero hits, close drawer and clear selection
  useEffect(() => {
    if (!graph) return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hitCount = graph.nodes.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false;
      return matchesQuery(n, q);
    }).length;
    if (hitCount > 0) return;
    if (!selected && !selectedEdge) return;
    setSelected(null);
    setSelectedEdge(null);
    patchParams((next) => {
      next.delete('node');
      next.delete('edge');
    });
    // intentionally omit selected/selectedEdge from deps to run on query/filter change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, query, filter, patchParams]);

  const filteredCycle = useMemo(() => {
    if (!graph) return [] as MapNode[];
    const q = query.trim().toLowerCase();
    return graph.nodes.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false;
      return matchesQuery(n, q);
    });
  }, [graph, filter, query]);

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (selected || selectedEdge) {
          selectNode(null);
          selectEdge(null);
        } else if (chapterFocusId) {
          setFocusAndUrl(null);
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
  }, [
    selected,
    selectedEdge,
    filteredCycle,
    byId,
    selectNode,
    selectEdge,
    chapterFocusId,
    setFocusAndUrl,
  ]);

  const focusChapterByLabel = useCallback(
    (label: string) => {
      const ch = chapters.find((c) => c.label === label);
      if (ch) {
        setFocusAndUrl(ch.id);
        selectNode(ch);
      }
    },
    [chapters, selectNode, setFocusAndUrl],
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
  const qTrim = query.trim();
  const zeroSearch = Boolean(qTrim && visibleStats && visibleStats.hitCount === 0);

  const presentTypes = new Set(graph.nodes.map((n) => n.type));

  return (
    <div className={`cm-shell${hasDrawer ? ' has-drawer' : ''}`}>
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <Link className="cm-back" to="/">
              ← 图书列表
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
              onChange={(e) => setQueryAndUrl(e.target.value)}
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
                      setFocusAndUrl(null);
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
                onClick={() => setFilterAndUrl(f.key)}
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
                setFocusAndUrl(v);
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
                  setFocusAndUrl(null);
                  setPathHighlight(null);
                }}
              >
                显示全部
              </button>
            ) : null}
          </div>

          <div
            className="cm-stats"
            title={`生成于 ${formatGeneratedAt(meta.generatedAt)} · 来源 ${meta.source?.file ?? ''}`}
          >
            {qTrim && visibleStats ? (
              <>
                <span>
                  命中 {visibleStats.hitCount}
                  {visibleStats.visibleCount > visibleStats.hitCount
                    ? ` · 含邻居 ${visibleStats.visibleCount}`
                    : ''}
                </span>
                <span>全库 {visibleStats.totalCount}</span>
              </>
            ) : filter !== 'all' && visibleStats ? (
              <>
                <span>可见 {visibleStats.visibleCount}</span>
                <span>全库 {visibleStats.totalCount}</span>
              </>
            ) : stats ? (
              <>
                <span>{stats.chapters} 章节</span>
                <span>{stats.concepts} 概念</span>
                <span>{stats.edges} 关系</span>
              </>
            ) : null}
          </div>

          <Link className="cm-btn cm-btn--ghost" to={`/books/${mapId}`}>
            图书详情
          </Link>
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
              <button type="button" className="cm-btn" onClick={() => setFocusAndUrl(null)}>
                显示全部
              </button>
            </div>
          ) : null}
          {zeroSearch ? (
            <div className="cm-empty-search" role="status">
              <h2>没有匹配的节点</h2>
              <p>
                未找到与「{qTrim}」相关的节点。试试其他关键词，或清空搜索查看全部。
              </p>
              <button type="button" className="cm-btn" onClick={() => setQueryAndUrl('')}>
                清空搜索
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
            onSelectEdge={selectEdge}
            onVisibleStats={setVisibleStats}
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
            onClose={() => selectEdge(null)}
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
