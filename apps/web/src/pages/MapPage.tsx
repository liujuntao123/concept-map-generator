import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import MapCanvas, {
  type MapCanvasHandle,
  type TypeFilter,
  type VisibleStats,
} from '../components/MapCanvas';
import DetailDrawer from '../components/DetailDrawer';
import EdgePanel from '../components/EdgePanel';
import SearchHits from '../components/SearchHits';
import PathGuide from '../components/PathGuide';
import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate, groupChapters, matchesQuery } from '../lib/graphUtils';
import { useTheme } from '../hooks/useTheme';
import {
  IconChapter,
  IconStructure,
  IconClaim,
  IconConcept,
  IconMap,
  IconMore,
  IconMoon,
  IconPerson,
  IconSearch,
  IconShare,
  IconSun,
  IconWork,
  pathThemeIcon,
  IconBook,
} from '../components/icons';
import {
  type ConceptGraph,
  type FeaturedPath,
  type MapEdge,
  type MapMeta,
  type MapNode,
  type NodeType,
} from '../types/graph';

const TYPE_FILTERS: Array<{ key: TypeFilter; label: string; short: string }> = [
  { key: 'all', label: '全部', short: '全部' },
  { key: 'chapter', label: '章节', short: '章节' },
  { key: 'concept', label: '概念', short: '概念' },
  { key: 'claim', label: '主张', short: '主张' },
  { key: 'person', label: '人物', short: '人物' },
  { key: 'work', label: '著作', short: '著作' },
];

function TypeIcon({ k, size = 14 }: { k: TypeFilter; size?: number }) {
  if (k === 'chapter') return <IconChapter size={size} />;
  if (k === 'concept') return <IconConcept size={size} />;
  if (k === 'claim') return <IconClaim size={size} />;
  if (k === 'person') return <IconPerson size={size} />;
  if (k === 'work') return <IconWork size={size} />;
  return <IconMap size={size} />;
}


const ALLOWED_TYPES = new Set(['chapter', 'concept', 'claim', 'person', 'work']);

export default function MapPage() {
  const { mapId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, toggle } = useTheme();
  const canvasRef = useRef<MapCanvasHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pathPeekOnce = useRef(false);

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
  const [pathId, setPathId] = useState<string | null>(() => searchParams.get('path'));
  const [pathStep, setPathStep] = useState(() => {
    const s = Number(searchParams.get('step') ?? '0');
    return Number.isFinite(s) && s >= 0 ? s : 0;
  });
  const [visibleStats, setVisibleStats] = useState<VisibleStats | null>(null);
  const [showStructural, setShowStructural] = useState(false);
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hitsCollapsed, setHitsCollapsed] = useState(false);
  const [defaultBootstrapped, setDefaultBootstrapped] = useState(false);
  const [nodeHistory, setNodeHistory] = useState<string[]>([]);
  const [tipsOpen, setTipsOpen] = useState(() => {
    try {
      return localStorage.getItem('cm-tips-v1') !== '1';
    } catch {
      return true;
    }
  });
  /** Narrow path tour: peek sheet so map stays visible (Ux3-3) */
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [pathTableOpen, setPathTableOpen] = useState(false);
  const [pathCompleted, setPathCompleted] = useState(false);

  const isNarrow = useCallback(() => {
    try {
      return window.matchMedia('(max-width: 860px)').matches;
    } catch {
      return false;
    }
  }, []);

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

  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} · 概念地图`;
    return () => {
      document.title = '概念地图';
    };
  }, [meta]);

  // Ux2-1: cold open defaults into first path (or 辑一) so map is readable
  useEffect(() => {
    if (!graph || !meta || defaultBootstrapped) return;
    const hasDeep =
      searchParams.get('node') ||
      searchParams.get('path') ||
      searchParams.get('focus') ||
      searchParams.get('edge') ||
      searchParams.get('q') ||
      searchParams.get('type') ||
      searchParams.get('view') === 'all';
    if (hasDeep) {
      setDefaultBootstrapped(true);
      return;
    }
    const firstPath = meta.featuredPaths?.[0];
    if (firstPath) {
      const n = graph.nodes.find((x) => x.id === firstPath.nodeIds[0]) ?? null;
      setPathId(firstPath.id);
      setPathStep(0);
      setSelected(n);
      // Ux3-3: cold path on phone → peek sheet, keep map readable
      try {
        if (window.matchMedia('(max-width: 860px)').matches) setSheetExpanded(false);
      } catch {
        /* ignore */
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('path', firstPath.id);
          next.set('step', '0');
          if (n) next.set('node', n.id);
          return next;
        },
        { replace: true },
      );
    } else {
      const ji1 = graph.nodes.find((x) => x.id === 'ch-ji1' || x.label === '辑一');
      if (ji1) {
        setChapterFocusId(ji1.id);
        setSelected(ji1);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('focus', ji1.id);
            next.set('node', ji1.id);
            return next;
          },
          { replace: true },
        );
      }
    }
    setDefaultBootstrapped(true);
  }, [graph, meta, defaultBootstrapped, searchParams, setSearchParams]);

  useEffect(() => {
    const t = searchParams.get('type');
    if (!t || t === 'all') setFilter('all');
    else if (ALLOWED_TYPES.has(t)) setFilter(t as TypeFilter);

    const focus = searchParams.get('focus');
    setChapterFocusId(focus && focus.length ? focus : null);

    setQuery(searchParams.get('q') ?? '');

    const p = searchParams.get('path');
    setPathId(p && p.length ? p : null);
    const s = Number(searchParams.get('step') ?? '0');
    setPathStep(Number.isFinite(s) && s >= 0 ? s : 0);
  }, [searchParams]);

  // Ux3-3: URL cold-open with path on narrow → peek sheet once
  useEffect(() => {
    if (!graph || pathPeekOnce.current) return;
    if (!searchParams.get('path')) return;
    pathPeekOnce.current = true;
    try {
      if (window.matchMedia('(max-width: 860px)').matches) setSheetExpanded(false);
    } catch {
      /* ignore */
    }
  }, [graph, searchParams]);

  useEffect(() => {
    if (!graph) return;
    const nid = searchParams.get('node');
    const eid = searchParams.get('edge');
    const typeParam = searchParams.get('type');
    const typeFilter: TypeFilter =
      typeParam && ALLOWED_TYPES.has(typeParam) ? (typeParam as TypeFilter) : 'all';

    if (eid) {
      const e = graph.edges.find((x) => x.id === eid) ?? null;
      setSelectedEdge(e);
      setSelected(null);
      return;
    }
    if (nid) {
      const n = graph.nodes.find((x) => x.id === nid) ?? null;
      if (n && typeFilter !== 'all' && n.type !== typeFilter) {
        setSelected(null);
        setSelectedEdge(null);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('node');
            return next;
          },
          { replace: true },
        );
        return;
      }
      setSelected(n);
      setSelectedEdge(null);
    }
  }, [graph, searchParams, setSearchParams]);

  const byId = useMemo(() => {
    const m = new Map<string, MapNode>();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const chapters = useMemo(
    () => (graph ? graph.nodes.filter((n) => n.type === 'chapter') : []),
    [graph],
  );
  const chapterGroups = useMemo(() => groupChapters(chapters), [chapters]);

  const featured = useMemo<FeaturedPath[]>(
    () => meta?.featuredPaths ?? [],
    [meta],
  );
  const activePath = useMemo(
    () => (pathId ? featured.find((p) => p.id === pathId) ?? null : null),
    [featured, pathId],
  );

  useEffect(() => {
    if (!mapId || !pathId) {
      setPathCompleted(false);
      return;
    }
    try {
      setPathCompleted(localStorage.getItem(`cm-path-done:${mapId}:${pathId}`) === '1');
    } catch {
      setPathCompleted(false);
    }
  }, [mapId, pathId]);

  const togglePathComplete = useCallback(() => {
    if (!mapId || !pathId) return;
    setPathCompleted((prev) => {
      const next = !prev;
      try {
        const k = `cm-path-done:${mapId}:${pathId}`;
        if (next) localStorage.setItem(k, '1');
        else localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [mapId, pathId]);

  const missingEdgeAt = useMemo(() => {
    if (!graph || !activePath) return [] as boolean[];
    const pair = new Set(
      graph.edges.flatMap((e) => [`${e.source}::${e.target}`, `${e.target}::${e.source}`]),
    );
    return activePath.nodeIds.map((id, i) => {
      if (i === 0) return false;
      const prev = activePath.nodeIds[i - 1];
      return !pair.has(`${prev}::${id}`);
    });
  }, [graph, activePath]);

  const pathEdgeKeep = useMemo(() => {
    // Ux4-5: keep highlighting the edge into current step while touring
    if (!graph || !activePath || pathStep <= 0) return null as MapEdge | null;
    const a = activePath.nodeIds[pathStep - 1];
    const b = activePath.nodeIds[pathStep];
    return (
      graph.edges.find(
        (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a),
      ) ?? null
    );
  }, [graph, activePath, pathStep]);
  const pathHighlight = activePath?.nodeIds ?? null;

  useEffect(() => {
    const handler = (ev: Event) => {
      const id = (ev as CustomEvent<{ id: string }>).detail?.id;
      if (!id || !graph) return;
      const n = graph.nodes.find((x) => x.id === id) ?? null;
      setChapterFocusId(id);
      setPathId(null);
      setSelected(n);
      setSelectedEdge(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('focus', id);
          next.delete('path');
          next.delete('step');
          if (n) next.set('node', n.id);
          next.delete('edge');
          return next;
        },
        { replace: true },
      );
    };
    window.addEventListener('cm-chapter-focus', handler);
    return () => window.removeEventListener('cm-chapter-focus', handler);
  }, [graph, setSearchParams]);

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
    (node: MapNode | null, opts?: { fromHistory?: boolean }) => {
      setSelected((prev) => {
        if (!opts?.fromHistory && prev && node && prev.id !== node.id) {
          setNodeHistory((h) => [...h.slice(-19), prev.id]);
        }
        return node;
      });
      setSelectedEdge(null);
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
      const mismatch = Boolean(selected && key !== 'all' && selected.type !== key);
      if (mismatch) setSelected(null);
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
      setHitsCollapsed(false);
      patchParams((next) => {
        const v = value.trim();
        if (v) next.set('q', v);
        else next.delete('q');
      });
    },
    [patchParams],
  );

  const focusChapter = useCallback(
    (chapterId: string | null) => {
      if (!chapterId) {
        setChapterFocusId(null);
        patchParams((next) => {
          next.delete('focus');
        });
        return;
      }
      const n = byId.get(chapterId) ?? null;
      setChapterFocusId(chapterId);
      setPathId(null);
      setSelected(n);
      setSelectedEdge(null);
      patchParams((next) => {
        next.set('focus', chapterId);
        next.delete('path');
        next.delete('step');
        if (n) next.set('node', n.id);
        else next.delete('node');
        next.delete('edge');
      });
    },
    [byId, patchParams],
  );

  const activatePath = useCallback(
    (p: FeaturedPath, step = 0) => {
      const safeStep = Math.max(0, Math.min(step, p.nodeIds.length - 1));
      const first = byId.get(p.nodeIds[safeStep]) ?? byId.get(p.nodeIds[0]) ?? null;
      setPathId(p.id);
      setPathStep(safeStep);
      setChapterFocusId(null);
      setSelected(first);
      setSelectedEdge(null);
      if (isNarrow()) setSheetExpanded(false);
      patchParams((next) => {
        next.set('path', p.id);
        next.set('step', String(safeStep));
        next.delete('focus');
        if (first) next.set('node', first.id);
        else next.delete('node');
        next.delete('edge');
      });
      window.setTimeout(() => canvasRef.current?.focusSelected(), 100);
    },
    [byId, patchParams, isNarrow],
  );

  const clearPath = useCallback(() => {
    setPathId(null);
    setPathStep(0);
    patchParams((next) => {
      next.delete('path');
      next.delete('step');
    });
  }, [patchParams]);

  const goPathStep = useCallback(
    (delta: number) => {
      if (!activePath) return;
      const next = Math.max(0, Math.min(activePath.nodeIds.length - 1, pathStep + delta));
      activatePath(activePath, next);
    },
    [activePath, pathStep, activatePath],
  );

  /** Ux3-1: related click — exit path if off-path, else sync step */
  const selectRelated = useCallback(
    (node: MapNode) => {
      if (pathId && activePath) {
        const idx = activePath.nodeIds.indexOf(node.id);
        if (idx >= 0) {
          activatePath(activePath, idx);
          return;
        }
        setPathId(null);
        setPathStep(0);
        setSelectedEdge(null);
        setSelected((prev) => {
          if (prev && prev.id !== node.id) setNodeHistory((h) => [...h.slice(-19), prev.id]);
          return node;
        });
        setSheetExpanded(true);
        patchParams((next) => {
          next.delete('path');
          next.delete('step');
          next.set('node', node.id);
          next.delete('edge');
        });
        window.setTimeout(() => canvasRef.current?.focusSelected(), 80);
        return;
      }
      setSheetExpanded(true);
      selectNode(node);
      window.setTimeout(() => canvasRef.current?.focusSelected(), 80);
    },
    [pathId, activePath, activatePath, selectNode, patchParams],
  );

  const goBackNode = useCallback(() => {
    setNodeHistory((h) => {
      if (!h.length) return h;
      const prevId = h[h.length - 1];
      const n = byId.get(prevId) ?? null;
      if (n) selectNode(n, { fromHistory: true });
      return h.slice(0, -1);
    });
  }, [byId, selectNode]);

  const onCanvasSelect = useCallback(
    (node: MapNode | null) => {
      if (node && pathId && activePath) {
        const idx = activePath.nodeIds.indexOf(node.id);
        if (idx >= 0) {
          activatePath(activePath, idx);
          return;
        }
      }
      selectNode(node);
    },
    [pathId, activePath, activatePath, selectNode],
  );

  // Restore path selection when cold-opening ?path=
  useEffect(() => {
    if (!graph || !meta || !pathId) return;
    const p = meta.featuredPaths?.find((x) => x.id === pathId);
    if (!p) return;
    const nid = p.nodeIds[pathStep] ?? p.nodeIds[0];
    const n = graph.nodes.find((x) => x.id === nid) ?? null;
    if (n && selected?.id !== n.id) setSelected(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, meta, pathId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, query, filter, patchParams]);

  const searchHits = useMemo(() => {
    if (!graph) return [] as MapNode[];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return graph.nodes.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false;
      return matchesQuery(n, q);
    });
  }, [graph, query, filter]);

  const filteredCycle = useMemo(() => {
    if (searchHits.length) return searchHits;
    if (!graph) return [] as MapNode[];
    return graph.nodes.filter((n) => filter === 'all' || n.type === filter);
  }, [searchHits, graph, filter]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !typing) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (typing) return;

      if (e.key === 'Escape') {
        if (moreOpen) {
          setMoreOpen(false);
          return;
        }
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        if (selected || selectedEdge) {
          selectNode(null);
          selectEdge(null);
        } else if (pathId) {
          clearPath();
        } else if (chapterFocusId) {
          focusChapter(null);
        }
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && selected) {
        // drawer already open when selected
        return;
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && activePath) {
        e.preventDefault();
        goPathStep(e.key === 'ArrowRight' ? 1 : -1);
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
    focusChapter,
    helpOpen,
    moreOpen,
    pathId,
    clearPath,
    activePath,
    goPathStep,
  ]);

  const focusChapterByLabel = useCallback(
    (label: string) => {
      const ch = chapters.find((c) => c.label === label);
      if (ch) focusChapter(ch.id);
    },
    [chapters, focusChapter],
  );

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, []);

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

  const focusChapterNode = chapterFocusId ? byId.get(chapterFocusId) : null;
  const showSuggest = searchOpen && !query.trim();
  const hasDrawer = Boolean(selected || selectedEdge);
  const qTrim = query.trim();
  const zeroSearch = Boolean(qTrim && visibleStats && visibleStats.hitCount === 0);
  const presentTypes = new Set(graph.nodes.map((n) => n.type));

  return (
    <div
      className={`cm-shell${hasDrawer ? ' has-drawer' : ''}${hasDrawer && !sheetExpanded ? ' has-drawer-peek' : ''}`}
    >
      <header className="cm-topbar cm-topbar--map">
        <div className="cm-brand">
          <div className="cm-brand__mark cm-brand__mark--book" aria-hidden>
            <IconBook size={18} />
          </div>
          <div>
            <Link className="cm-back" to="/">
              ← 图书列表
            </Link>
            <h1>{meta.title}</h1>
            <p className="cm-brand__sub">
              {meta.author ? `${meta.author}` : '概念地图'}
              {meta.generatedAt ? ` · ${formatGeneratedDate(meta.generatedAt)}` : ''}
            </p>
          </div>
        </div>

        <div className="cm-toolbar">
          <div className="cm-search-wrap">
            <span className="cm-search-icon" aria-hidden>
              <IconSearch size={14} />
            </span>
            <input
              ref={searchRef}
              className="cm-search"
              type="search"
              placeholder="搜索…"
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
                      activatePath(p, 0);
                      setSearchOpen(false);
                    }}
                  >
                    <strong>{p.title}</strong>
                    <span>
                      {p.description} · {p.nodeIds.length} 步
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="cm-filters cm-filters--chips" role="group" aria-label="节点类型筛选">
            {TYPE_FILTERS.filter(
              (f) => f.key === 'all' || presentTypes.has(f.key as NodeType),
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                className={`cm-chip cm-chip--type${filter === f.key ? ' is-active' : ''}`}
                onClick={() => setFilterAndUrl(f.key)}
                title={f.label}
              >
                <TypeIcon k={f.key} />
                <span>{f.short.slice(0, 2)}</span>
              </button>
            ))}
          </div>
          <select
            className="cm-select cm-filters--select"
            aria-label="节点类型"
            value={filter}
            onChange={(e) => setFilterAndUrl(e.target.value as TypeFilter)}
          >
            {TYPE_FILTERS.filter(
              (f) => f.key === 'all' || presentTypes.has(f.key as NodeType),
            ).map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="cm-chapter-filter">
            <select
              className="cm-select"
              aria-label="按章节筛选"
              value={chapterFocusId ?? ''}
              onChange={(e) => focusChapter(e.target.value || null)}
            >
              <option value="">全部章节</option>
              {chapterGroups.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="cm-icon-btn cm-btn--share"
            onClick={() => void copyShareLink()}
            title="分享链接"
            aria-label="分享链接"
          >
            <IconShare />
          </button>

          <button
            type="button"
            className="cm-icon-btn cm-theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
            title={theme === 'dark' ? '浅色' : '深色'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          <div className="cm-more-wrap">
            <button
              type="button"
              className="cm-icon-btn"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label="更多"
              title="更多"
            >
              <IconMore />
            </button>
            {moreOpen ? (
              <div className="cm-more-menu">
                <label className="cm-more-item">
                  <input
                    type="checkbox"
                    checked={showStructural}
                    onChange={(e) => setShowStructural(e.target.checked)}
                  />
                  <IconStructure size={14} /> 结构线
                </label>
                <button
                  type="button"
                  className="cm-more-item cm-more-item--share"
                  onClick={() => {
                    void copyShareLink();
                    setMoreOpen(false);
                  }}
                >
                  {copied ? '已复制链接' : '分享链接'}
                </button>
                <button type="button" className="cm-more-item" onClick={() => setHelpOpen(true)}>
                  键盘快捷键（?）
                </button>
                <Link className="cm-more-item" to={`/books/${mapId}`} onClick={() => setMoreOpen(false)}>
                  图书详情
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`cm-subbar${activePath ? ' cm-subbar--path' : ''}`}>
        <div className="cm-path-tabs" role="tablist" aria-label="推荐路径">
          {featured.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pathId === p.id}
              className={`cm-path-tab${pathId === p.id ? ' is-active' : ''}`}
              onClick={() => activatePath(p, 0)}
              title={p.description}
            >
              {pathThemeIcon(p.theme || p.id || p.title, 15)}
              <span>{p.theme || p.title}</span>
              {p.durationMin ? <em>约 {p.durationMin}′</em> : null}
            </button>
          ))}
        </div>

        <div className="cm-stats">
          {activePath ? (
            <span>这条路径 {activePath.nodeIds.length} 步</span>
          ) : qTrim && visibleStats ? (
            <>
              <span>命中 {visibleStats.hitCount}</span>
              <span>全库 {visibleStats.totalCount}</span>
            </>
          ) : chapterFocusId && visibleStats ? (
            <span>本章可见 {visibleStats.visibleCount} 节点</span>
          ) : filter !== 'all' && visibleStats ? (
            <span>可见 {visibleStats.visibleCount}</span>
          ) : meta.stats ? (
            <span>
              {meta.stats.nodes} 节点 · {meta.stats.edges} 关系 · {meta.stats.chapters} 章
            </span>
          ) : null}
        </div>

        {activePath ? (
          <PathGuide
            path={activePath}
            stepIndex={pathStep}
            currentNode={byId.get(activePath.nodeIds[pathStep]) ?? selected}
            nextNode={
              pathStep < activePath.nodeIds.length - 1
                ? byId.get(activePath.nodeIds[pathStep + 1]) ?? null
                : null
            }
            completed={pathCompleted}
            onToggleComplete={togglePathComplete}
            onPrev={() => goPathStep(-1)}
            onNext={() => goPathStep(1)}
            onSkip={() => {
              if (pathStep < activePath.nodeIds.length - 1) goPathStep(1);
              else clearPath();
            }}
            onExit={clearPath}
            onJump={(i) => activatePath(activePath, i)}
            tableOpen={pathTableOpen}
            onToggleTable={() => setPathTableOpen((v) => !v)}
            labelOf={(id) => byId.get(id)?.label ?? id}
            missingEdgeAt={missingEdgeAt}
          />
        ) : null}
      </div>

      <main className="cm-main">
        <div className="cm-canvas">
          {focusChapterNode ? (
            <div className="cm-focus-banner">
              <span>
                只看这一章：{focusChapterNode.label}
                <em className="cm-hint">（双击章节节点也可聚焦）</em>
              </span>
              <button type="button" className="cm-btn" onClick={() => focusChapter(null)}>
                显示全部
              </button>
            </div>
          ) : null}

          {qTrim && searchHits.length > 0 ? (
            <SearchHits
              hits={searchHits}
              query={qTrim}
              selectedId={selected?.id ?? null}
              collapsed={hitsCollapsed}
              onExpand={() => setHitsCollapsed(false)}
              onSelect={(n) => {
                selectNode(n);
                setHitsCollapsed(true);
                window.setTimeout(() => canvasRef.current?.focusSelected(), 50);
              }}
            />
          ) : null}

          {zeroSearch ? (
            <div className="cm-empty-search" role="status">
              <h2>没有匹配的节点</h2>
              <p>未找到与「{qTrim}」相关的节点。</p>
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
            pathStepIndex={activePath ? pathStep : null}
            showStructuralEdges={showStructural}
            onSelect={onCanvasSelect}
            onSelectEdge={selectEdge}
            onVisibleStats={setVisibleStats}
          />
        </div>

        {selected ? (
          <DetailDrawer
            node={selected}
            graph={graph}
            meta={meta}
            peek={!sheetExpanded}
            onExpand={() => setSheetExpanded(true)}
            onCollapse={() => setSheetExpanded(false)}
            onClose={() => {
              setSheetExpanded(true);
              selectNode(null);
            }}
            onSelectRelated={selectRelated}
            onBack={nodeHistory.length ? goBackNode : undefined}
            onFocusChapter={focusChapterByLabel}
            pathContext={
              activePath
                ? {
                    path: activePath,
                    stepIndex: pathStep,
                    edgeInto: pathEdgeKeep,
                    nextLabel:
                      pathStep < activePath.nodeIds.length - 1
                        ? byId.get(activePath.nodeIds[pathStep + 1])?.label ?? null
                        : null,
                  }
                : null
            }
          />
        ) : selectedEdge ? (
          <EdgePanel
            edge={selectedEdge}
            sourceNode={byId.get(selectedEdge.source)}
            targetNode={byId.get(selectedEdge.target)}
            peek={!sheetExpanded}
            onExpand={() => setSheetExpanded(true)}
            onCollapse={() => setSheetExpanded(false)}
            onClose={() => {
              setSheetExpanded(true);
              selectEdge(null);
            }}
            onOpenNode={(id) => {
              const n = byId.get(id);
              if (n) {
                setSheetExpanded(true);
                selectNode(n);
              }
            }}
          />
        ) : null}
      </main>

      {copied ? <div className="cm-toast" role="status">已复制当前视图链接</div> : null}

      {tipsOpen ? (
        <div className="cm-tips" role="dialog" aria-label="快速提示">
          <div className="cm-tips__card">
            <h2>怎么读这张图</h2>
            <ol>
              <li>顶栏路径主题带你一步步走完一条思路。</li>
              <li>点「下一步」或进度点；可用「跳过」略过当前步。</li>
              <li>点选节点打开详情；滚轮/按钮缩放（节点不可拖拽）。</li>
              <li>手机上详情从下方滑出，可继续看地图上半部分。</li>
            </ol>
            <button
              type="button"
              className="cm-btn cm-btn--primary"
              onClick={() => {
                try {
                  localStorage.setItem('cm-tips-v1', '1');
                } catch {
                  /* ignore */
                }
                setTipsOpen(false);
              }}
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="cm-help" role="dialog" aria-label="快捷键">
          <div className="cm-help__card">
            <header>
              <h2>快捷键</h2>
              <button type="button" className="cm-icon-btn" onClick={() => setHelpOpen(false)}>
                ×
              </button>
            </header>
            <ul>
              <li>
                <kbd>/</kbd> 聚焦搜索
              </li>
              <li>
                <kbd>?</kbd> 打开/关闭本说明
              </li>
              <li>
                <kbd>Esc</kbd> 关闭抽屉 / 退出路径或章节聚焦
              </li>
              <li>
                <kbd>←</kbd> <kbd>→</kbd> 路径上一步/下一步，或在结果间切换
              </li>
              <li>双击章节节点：只看这一章及其语义邻居</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
