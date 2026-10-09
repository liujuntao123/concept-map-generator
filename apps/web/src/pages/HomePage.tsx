import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatGeneratedAt } from '../lib/graphUtils';
import type { MapsIndex } from '../types/graph';
import { useTheme } from '../hooks/useTheme';

export default function HomePage() {
  const [index, setIndex] = useState<MapsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/maps/index.json');
        if (!res.ok) throw new Error('无法加载地图目录');
        const data = (await res.json()) as MapsIndex;
        if (!cancelled) setIndex(data);
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

  if (!index) {
    return (
      <div className="cm-shell cm-shell--center">
        <p className="cm-loading">正在加载地图目录…</p>
      </div>
    );
  }

  // Single map: still show index card for discoverability (backlog #20)
  return (
    <div className="cm-shell">
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <h1>概念地图</h1>
            <p>从书籍到可交互知识结构</p>
          </div>
        </div>
        <button
          type="button"
          className="cm-theme-toggle"
          onClick={toggle}
          aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          title={theme === 'dark' ? '浅色模式' : '深色模式'}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </header>
      <main className="cm-home">
        <div className="cm-home__hero">
          <h1>选择一本地图</h1>
          <p>
            每本地图由 IMA 知识库中的书籍拆解而来：章节、概念、主张、人物与著作相互关联，节点详情含原文摘录。
          </p>
        </div>
        <div className="cm-home__grid">
          {index.maps.map((m) => (
            <Link key={m.id} className="cm-map-card" to={`/maps/${m.id}`}>
              <h2>{m.title}</h2>
              <div className="meta">
                {m.author ? `${m.author} · ` : ''}
                {m.subtitle ?? '概念地图'}
              </div>
              {m.description ? <p className="desc">{m.description}</p> : null}
              <div className="stats">
                {m.stats ? (
                  <>
                    <span>{m.stats.nodes} 节点</span>
                    <span>{m.stats.edges} 关系</span>
                    <span>{m.stats.chapters} 章节</span>
                  </>
                ) : null}
                {m.version ? <span>v{m.version}</span> : null}
                {m.generatedAt ? <span>{formatGeneratedAt(m.generatedAt)}</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
