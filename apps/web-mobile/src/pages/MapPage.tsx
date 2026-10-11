import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  MapCanvas,
  buttonClass,
  fetchJson,
  groupChapters,
  iconButtonClass,
  IconBack,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconFit,
  IconFocus,
  IconMore,
  IconSearch,
  IconZoomIn,
  IconZoomOut,
  matchesQuery,
  pathThemeIcon,
  useTheme,
  type ConceptGraph,
  type FeaturedPath,
  type MapCanvasHandle,
  type MapEdge,
  type MapMeta,
  type MapNode,
  type TypeFilter,
  type VisibleStats,
} from '@concept-map/core';
import NodeSheet, { type PathContext } from '../components/NodeSheet';
import EdgeSheet from '../components/EdgeSheet';
import MoreSheet from '../components/MoreSheet';
import PathSheet from '../components/PathSheet';
import SearchOverlay from '../components/SearchOverlay';
import type { SheetSnap } from '../components/Sheet';

type PanelKind = 'node' | 'edge' | 'more' | 'steps';

const ALLOWED_TYPES = new Set(['chapter', 'concept', 'claim', 'person', 'work']);

/** 头部行高（不含安全区），浮层条以此为基准定位 */
const HEADER_H = 56;

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
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('half');
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
  const [showStructural, setShowStructural] = useState(false);
  const [visibleStats, setVisibleStats] = useState<VisibleStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(() => {
    try {
      return localStorage.getItem('cm-tips-v1') !== '1';
    } catch {
      return true;
    }
  });
  const [bootstrapped, setBootstrapped] = useState(false);
  const [nodeHistory, setNodeHistory] = useState<string[]>([]);
  const [pathCompleted, setPathCompleted] = useState(false);

  /* ---------- 数据加载 ---------- */

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

  // 冷启动对齐桌面：无深链参数时默认进第一条推荐路径（抽屉保持 peek），否则聚焦「辑一」
  useEffect(() => {
    if (!graph || !meta || bootstrapped) return;
    const hasDeep =
      searchParams.get('node') ||
      searchParams.get('path') ||
      searchParams.get('focus') ||
      searchParams.get('edge') ||
      searchParams.get('q') ||
      searchParams.get('type') ||
      searchParams.get('view') === 'all';
    if (hasDeep) {
      setBootstrapped(true);
      return;
    }
    const firstPath = meta.featuredPaths?.[0];
    if (firstPath) {
      const n = graph.nodes.find((x) => x.id === firstPath.nodeIds[0]) ?? null;
      setPathId(firstPath.id);
      setPathStep(0);
      setSelected(n);
      if (n) {
        setPanel('node');
        setSnap('peek');
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
        setPanel('node');
        setSnap('peek');
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
    setBootstrapped(true);
  }, [graph, meta, bootstrapped, searchParams, setSearchParams]);

  /* ---------- URL ↔ 状态同步（与桌面端同一套参数契约） ---------- */

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
      if (e) setPanel((cur) => (cur === 'more' || cur === 'steps' ? cur : 'edge'));
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
      if (n) setPanel((cur) => (cur === 'more' || cur === 'steps' ? cur : 'node'));
    }
  }, [graph, searchParams, setSearchParams]);

  /* ---------- 派生数据 ---------- */

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

  const featured = useMemo<FeaturedPath[]>(() => meta?.featuredPaths ?? [], [meta]);
  const activePath = useMemo(
    () => (pathId ? (featured.find((p) => p.id === pathId) ?? null) : null),
    [featured, pathId],
  );
  const pathHighlight = activePath?.nodeIds ?? null;

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

  // 双击章节节点（MapCanvas 派发）：聚焦该章
  useEffect(() => {
    const handler = (ev: Event) => {
      const id = (ev as CustomEvent<{ id: string }>).detail?.id;
      if (!id || !graph) return;
      const n = graph.nodes.find((x) => x.id === id) ?? null;
      setChapterFocusId(id);
      setPathId(null);
      setSelected(n);
      setSelectedEdge(null);
      if (n) {
        setPanel('node');
        setSnap('peek');
      }
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

  // 搜索后若无命中且已选中，清理选中（与桌面一致）
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
    setPanel((cur) => (cur === 'more' || cur === 'steps' ? cur : null));
    patchParams((next) => {
      next.delete('node');
      next.delete('edge');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, query, filter]);

  /* ---------- 操作 ---------- */

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

  const openPanel = useCallback(
    (kind: PanelKind) => {
      if (panel == null) setSnap('half');
      setPanel(kind);
    },
    [panel],
  );

  const selectNode = useCallback(
    (node: MapNode | null, opts?: { fromHistory?: boolean; snap?: SheetSnap }) => {
      setSelected((prev) => {
        if (!opts?.fromHistory && prev && node && prev.id !== node.id) {
          setNodeHistory((h) => [...h.slice(-19), prev.id]);
        }
        return node;
      });
      setSelectedEdge(null);
      if (node) {
        if (opts?.snap) {
          setPanel('node');
          setSnap(opts.snap);
        } else {
          openPanel('node');
          setSnap((cur) => (cur === 'peek' ? 'half' : cur));
        }
      } else {
        setPanel(null);
      }
      patchParams((next) => {
        if (node) next.set('node', node.id);
        else next.delete('node');
        next.delete('edge');
      });
    },
    [openPanel, patchParams],
  );

  const selectEdge = useCallback(
    (edge: MapEdge | null) => {
      setSelectedEdge(edge);
      if (edge) {
        setSelected(null);
        openPanel('edge');
        setSnap((cur) => (cur === 'peek' ? 'half' : cur));
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
    [openPanel, patchParams],
  );

  const closeSheet = useCallback(() => {
    setPanel(null);
    setSelected(null);
    setSelectedEdge(null);
    patchParams((next) => {
      next.delete('node');
      next.delete('edge');
    });
  }, [patchParams]);

  const setFilterAndUrl = useCallback(
    (key: TypeFilter) => {
      setFilter(key);
      setSelectedEdge(null);
      const mismatch = Boolean(selected && key !== 'all' && selected.type !== key);
      if (mismatch) {
        setSelected(null);
        setPanel((cur) => (cur === 'more' || cur === 'steps' ? cur : null));
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
      const v = value.trim();
      patchParams((next) => {
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
      // 聚焦章节时清掉类型筛选：两者叠加会让画布空掉（也避免节点因类型不匹配被清理）
      setFilter('all');
      setSelected(n);
      setSelectedEdge(null);
      if (n) {
        setPanel('node');
        setSnap('peek');
      }
      patchParams((next) => {
        next.set('focus', chapterId);
        next.delete('type');
        next.delete('path');
        next.delete('step');
        if (n) next.set('node', n.id);
        else next.delete('node');
        next.delete('edge');
      });
      window.setTimeout(() => canvasRef.current?.focusSelected(), 120);
    },
    [byId, patchParams],
  );

  const focusChapterByLabel = useCallback(
    (label: string) => {
      const ch = chapters.find((c) => c.label === label);
      if (ch) focusChapter(ch.id);
    },
    [chapters, focusChapter],
  );

  const activatePath = useCallback(
    (p: FeaturedPath, step = 0, opts?: { snap?: SheetSnap }) => {
      const safeStep = Math.max(0, Math.min(step, p.nodeIds.length - 1));
      const first = byId.get(p.nodeIds[safeStep]) ?? byId.get(p.nodeIds[0]) ?? null;
      setPathId(p.id);
      setPathStep(safeStep);
      setChapterFocusId(null);
      setSelected(first);
      setSelectedEdge(null);
      if (first) {
        setPanel('node');
        if (opts?.snap) setSnap(opts.snap);
        else if (panel == null) setSnap('peek');
      }
      patchParams((next) => {
        next.set('path', p.id);
        next.set('step', String(safeStep));
        next.delete('focus');
        if (first) next.set('node', first.id);
        else next.delete('node');
        next.delete('edge');
      });
      window.setTimeout(() => canvasRef.current?.focusSelected(), 120);
    },
    [byId, panel, patchParams],
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
      activatePath(activePath, next, { snap: 'peek' });
    },
    [activePath, pathStep, activatePath],
  );

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

  /** 相关节点：在路径上则跳步，否则退出路径并聚焦 */
  const selectRelated = useCallback(
    (node: MapNode) => {
      if (pathId && activePath) {
        const idx = activePath.nodeIds.indexOf(node.id);
        if (idx >= 0) {
          activatePath(activePath, idx, { snap: 'half' });
          return;
        }
        setPathId(null);
        setPathStep(0);
        setSelectedEdge(null);
        setSelected((prev) => {
          if (prev && prev.id !== node.id) setNodeHistory((h) => [...h.slice(-19), prev.id]);
          return node;
        });
        setPanel('node');
        setSnap('half');
        patchParams((next) => {
          next.delete('path');
          next.delete('step');
          next.set('node', node.id);
          next.delete('edge');
        });
        window.setTimeout(() => canvasRef.current?.focusSelected(), 100);
        return;
      }
      selectNode(node, { snap: 'half' });
      window.setTimeout(() => canvasRef.current?.focusSelected(), 100);
    },
    [pathId, activePath, activatePath, selectNode, patchParams],
  );

  const goBackNode = useCallback(() => {
    setNodeHistory((h) => {
      if (!h.length) return h;
      const prevId = h[h.length - 1];
      const n = byId.get(prevId) ?? null;
      if (n) selectNode(n, { fromHistory: true, snap: 'half' });
      return h.slice(0, -1);
    });
  }, [byId, selectNode]);

  const onCanvasSelect = useCallback(
    (node: MapNode | null) => {
      if (node && pathId && activePath) {
        const idx = activePath.nodeIds.indexOf(node.id);
        if (idx >= 0) {
          activatePath(activePath, idx, { snap: 'half' });
          return;
        }
      }
      selectNode(node);
    },
    [pathId, activePath, activatePath, selectNode],
  );

  /** 搜索结果选中：q 与 node 必须写入同一次 patchParams
      （同一 tick 内两次 setSearchParams 会以旧的 params 各自计算，后一次覆盖前一次）。 */
  const pickFromSearch = useCallback(
    (node: MapNode, q: string) => {
      setSearchOpen(false);
      setQuery(q);
      if (selected && selected.id !== node.id) {
        setNodeHistory((h) => [...h.slice(-19), selected.id]);
      }
      setSelected(node);
      setSelectedEdge(null);
      setPanel('node');
      setSnap('half');
      patchParams((next) => {
        const v = q.trim();
        if (v) next.set('q', v);
        next.set('node', node.id);
        next.delete('edge');
      });
      window.setTimeout(() => canvasRef.current?.focusSelected(), 150);
    },
    [patchParams, selected],
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

  /* ---------- 渲染 ---------- */

  if (error) {
    return (
      <div className="grid min-h-dvh place-content-center justify-items-center gap-3.5 bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-6 py-5 text-center text-danger shadow-card">
          {error}
        </p>
        <Link to="/" className="text-accent">
          返回图书列表
        </Link>
      </div>
    );
  }

  if (!graph || !meta) {
    return (
      <div className="grid min-h-dvh place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-6 py-5 text-muted shadow-card">
          正在加载概念地图…
        </p>
      </div>
    );
  }

  const focusChapterNode = chapterFocusId ? byId.get(chapterFocusId) : null;
  const qTrim = query.trim();
  const zeroSearch = Boolean(qTrim && visibleStats && visibleStats.hitCount === 0);
  const pathContext: PathContext | null = activePath
    ? {
        path: activePath,
        stepIndex: pathStep,
        nextLabel:
          pathStep < activePath.nodeIds.length - 1
            ? (byId.get(activePath.nodeIds[pathStep + 1])?.label ?? null)
            : null,
      }
    : null;

  const statusLine = activePath
    ? `第 ${pathStep + 1}/${activePath.nodeIds.length} 步 · ${activePath.theme || activePath.title}`
    : qTrim && visibleStats
      ? `命中 ${visibleStats.hitCount} / ${visibleStats.totalCount} 节点`
      : chapterFocusId && visibleStats
        ? `本章可见 ${visibleStats.visibleCount} 节点`
        : filter !== 'all' && visibleStats
          ? `可见 ${visibleStats.visibleCount} 节点`
          : meta.stats
            ? `${meta.stats.nodes} 节点 · ${meta.stats.edges} 关系 · ${meta.stats.chapters} 章`
            : '';

  const sheetHidden = Boolean(panel && (snap === 'half' || snap === 'full'));
  const controlsBottom = panel
    ? 'calc(env(safe-area-inset-bottom) + 124px)'
    : 'calc(env(safe-area-inset-bottom) + 16px)';

  return (
    <div className="relative h-dvh overflow-hidden bg-canvas">
      {/* 画布：全屏铺满 */}
      <div className="cm-canvas-mist absolute inset-0">
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
          showControls={false}
          showLegend={false}
        />
      </div>

      {/* 顶部栏（浮层） */}
      <header className="absolute inset-x-0 top-0 z-20 border-b border-line bg-surface/88 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center gap-0.5 px-1.5" style={{ height: HEADER_H }}>
          <Link
            to="/"
            className={iconButtonClass({
              className: 'h-11 w-11 border-transparent bg-transparent',
            })}
            aria-label="返回图书列表"
          >
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1 px-1">
            <h1 className="truncate text-[0.98rem] leading-tight font-bold">{meta.title}</h1>
            <p className="truncate text-[0.7rem] text-muted">{statusLine}</p>
          </div>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            onClick={() => setSearchOpen(true)}
            aria-label="搜索节点"
          >
            <IconSearch />
          </button>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            onClick={() => openPanel('more')}
            aria-label="更多"
          >
            <IconMore />
          </button>
        </div>
      </header>

      {/* 浮层条：路径导读 / 章节聚焦 */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 px-3"
        style={{ top: `calc(env(safe-area-inset-top) + ${HEADER_H + 8}px)` }}
      >
        {activePath ? (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/92 px-1.5 py-1 shadow-soft backdrop-blur-md">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">
              {pathThemeIcon(activePath.theme || activePath.id || activePath.title, 16)}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-1 text-left"
              onClick={() => openPanel('steps')}
            >
              <span className="block truncate text-[0.82rem] leading-tight font-semibold">
                第 {pathStep + 1}/{activePath.nodeIds.length} 步 ·{' '}
                {byId.get(activePath.nodeIds[pathStep])?.label ?? ''}
              </span>
              <span className="block truncate text-[0.68rem] text-muted">
                {activePath.theme || activePath.title}（点击看全部步骤）
              </span>
            </button>
            <button
              type="button"
              className={iconButtonClass({ className: 'h-9 w-9 border-transparent bg-transparent' })}
              onClick={() => goPathStep(-1)}
              disabled={pathStep <= 0}
              aria-label="上一步"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className={iconButtonClass({ className: 'h-9 w-9 border-transparent bg-transparent' })}
              onClick={() => goPathStep(1)}
              disabled={pathStep >= activePath.nodeIds.length - 1}
              aria-label="下一步"
            >
              <IconChevronRight />
            </button>
            <button
              type="button"
              className={iconButtonClass({ className: 'h-9 w-9 border-transparent bg-transparent' })}
              onClick={clearPath}
              aria-label="退出路径"
            >
              <IconClose />
            </button>
          </div>
        ) : focusChapterNode ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface/92 px-3.5 py-1.5 shadow-soft backdrop-blur-md">
            <span className="min-w-0 truncate text-[0.82rem]">
              只看这一章：{focusChapterNode.label}
            </span>
            <button
              type="button"
              className="shrink-0 cursor-pointer border-0 bg-transparent text-[0.82rem] text-accent"
              onClick={() => focusChapter(null)}
            >
              显示全部
            </button>
          </div>
        ) : null}
      </div>

      {/* 自绘缩放控件（右下，随抽屉状态显隐） */}
      {!sheetHidden ? (
        <div
          className="absolute right-3 z-20 flex flex-col gap-2"
          style={{ bottom: controlsBottom }}
          role="group"
          aria-label="缩放"
        >
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 shadow-soft' })}
            onClick={() => canvasRef.current?.zoomIn()}
            aria-label="放大"
          >
            <IconZoomIn />
          </button>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 shadow-soft' })}
            onClick={() => canvasRef.current?.zoomOut()}
            aria-label="缩小"
          >
            <IconZoomOut />
          </button>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 shadow-soft' })}
            onClick={() => canvasRef.current?.fitView()}
            aria-label="适配全部"
          >
            <IconFit />
          </button>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 shadow-soft' })}
            onClick={() => canvasRef.current?.focusSelected()}
            aria-label="聚焦当前"
          >
            <IconFocus />
          </button>
        </div>
      ) : null}

      {/* 无命中提示 */}
      {zeroSearch ? (
        <div
          className="absolute inset-0 z-10 grid place-content-center gap-2 bg-canvas/72 p-6 text-center backdrop-blur-[2px]"
          role="status"
        >
          <h2 className="text-[1.05rem] font-semibold">没有匹配的节点</h2>
          <p className="max-w-[320px] text-[0.85rem] text-muted">
            未找到与「{qTrim}」相关的节点。
          </p>
          <button
            type="button"
            className={buttonClass({ className: 'justify-self-center' })}
            onClick={() => setQueryAndUrl('')}
          >
            清空搜索
          </button>
        </div>
      ) : null}

      {/* 全屏搜索 */}
      {searchOpen ? (
        <SearchOverlay
          graph={graph}
          filter={filter}
          initialQuery={query}
          onClose={() => setSearchOpen(false)}
          onPick={pickFromSearch}
        />
      ) : null}

      {/* 底部抽屉 */}
      {panel === 'node' && selected ? (
        <NodeSheet
          node={selected}
          graph={graph}
          meta={meta}
          snap={snap}
          onSnap={setSnap}
          onClose={closeSheet}
          onSelectRelated={selectRelated}
          onFocusChapter={focusChapterByLabel}
          onBack={nodeHistory.length ? goBackNode : undefined}
          pathContext={pathContext}
        />
      ) : panel === 'edge' && selectedEdge ? (
        <EdgeSheet
          edge={selectedEdge}
          sourceNode={byId.get(selectedEdge.source)}
          targetNode={byId.get(selectedEdge.target)}
          snap={snap}
          onSnap={setSnap}
          onClose={closeSheet}
          onOpenNode={(id) => {
            const n = byId.get(id);
            if (n) selectNode(n, { snap: 'half' });
          }}
        />
      ) : panel === 'more' ? (
        <MoreSheet
          meta={meta}
          featured={featured}
          activePath={activePath}
          pathStep={pathStep}
          chapterFocusId={chapterFocusId}
          chapterGroups={chapterGroups}
          filter={filter}
          showStructural={showStructural}
          theme={theme}
          snap={snap}
          onSnap={setSnap}
          onClose={() => setPanel(null)}
          onActivatePath={(p) => activatePath(p, 0, { snap: 'peek' })}
          onOpenSteps={() => setPanel('steps')}
          onFocusChapter={focusChapter}
          onFilter={setFilterAndUrl}
          onToggleStructural={() => setShowStructural((v) => !v)}
          onToggleTheme={toggle}
          onShare={() => void copyShareLink()}
          onShowTips={() => setTipsOpen(true)}
        />
      ) : panel === 'steps' && activePath ? (
        <PathSheet
          path={activePath}
          stepIndex={pathStep}
          completed={pathCompleted}
          labelOf={(id) => byId.get(id)?.label ?? id}
          missingEdgeAt={missingEdgeAt}
          snap={snap}
          onSnap={setSnap}
          onClose={() => setPanel(null)}
          onJump={(i) => activatePath(activePath, i, { snap: 'half' })}
          onToggleComplete={togglePathComplete}
          onExit={() => {
            clearPath();
            setPanel(null);
          }}
        />
      ) : null}

      {/* 复制提示 */}
      {copied ? (
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-[0.85rem] shadow-card"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
          role="status"
        >
          已复制当前视图链接
        </div>
      ) : null}

      {/* 首次提示 */}
      {tipsOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-canvas/60 p-5"
          role="dialog"
          aria-label="快速提示"
        >
          <div className="w-full max-w-[380px] rounded-panel border border-line bg-surface px-4.5 pt-4.5 pb-4 shadow-float">
            <h2 className="mt-0 mb-2.5 text-[1.05rem] font-semibold">怎么读这张图</h2>
            <ol className="mb-3.5 list-decimal pl-5 text-[0.88rem] leading-relaxed">
              <li>点节点看详情；抽屉可拖拽，三档高度随你停。</li>
              <li>顶栏「搜索」按标题 / 摘要 / 原文摘录找节点。</li>
              <li>顶部路径条带你走完一条推荐路径，点它可看全部步骤。</li>
              <li>「更多」里有章节、筛选、图例、主题与分享。</li>
            </ol>
            <button
              type="button"
              className={buttonClass({ variant: 'primary', size: 'lg', className: 'w-full' })}
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
    </div>
  );
}