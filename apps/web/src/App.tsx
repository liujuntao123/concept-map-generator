import { useEffect, useState } from 'react';
import MapCanvas from './components/MapCanvas';
import DetailDrawer from './components/DetailDrawer';
import type { ConceptGraph, MapMeta, MapNode } from './types/graph';
import './App.css';

const MAP_ID = 'chujia-ying-zou-chu-wei-yi-zhen-li-guan';

export default function App() {
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapNode | null>(null);
  const [filter, setFilter] = useState<'all' | 'chapter' | 'concept'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [gRes, mRes] = await Promise.all([
          fetch(`/maps/${MAP_ID}/graph.json`),
          fetch(`/maps/${MAP_ID}/meta.json`),
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
  }, []);

  if (error) {
    return (
      <div className="cm-shell cm-shell--center">
        <p className="cm-error">{error}</p>
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

  return (
    <div className={`cm-shell${selected ? ' has-drawer' : ''}`}>
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <h1>{meta.title}</h1>
            <p>
              {meta.subtitle ?? '概念地图'}
              {meta.author ? ` · ${meta.author}` : ''}
            </p>
          </div>
        </div>

        <div className="cm-toolbar">
          <input
            className="cm-search"
            type="search"
            placeholder="搜索节点…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="cm-filters" role="group" aria-label="节点类型筛选">
            {(
              [
                ['all', '全部'],
                ['chapter', '章节'],
                ['concept', '概念'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`cm-chip${filter === k ? ' is-active' : ''}`}
                onClick={() => setFilter(k)}
              >
                {label}
              </button>
            ))}
          </div>
          {stats && (
            <div className="cm-stats">
              <span>{stats.chapters} 章节</span>
              <span>{stats.concepts} 概念</span>
              <span>{stats.edges} 关系</span>
            </div>
          )}
        </div>
      </header>

      <main className="cm-main">
        <div className="cm-canvas">
          <MapCanvas
            graph={graph}
            filter={filter}
            query={query}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>
        <DetailDrawer node={selected} onClose={() => setSelected(null)} />
      </main>
    </div>
  );
}
