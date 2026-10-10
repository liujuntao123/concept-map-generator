import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate } from '../lib/graphUtils';
import type { MapIndexEntry, MapsIndex } from '../types/graph';
import { useTheme } from '../hooks/useTheme';

function coverGlyph(m: MapIndexEntry): string {
  if (m.coverText) return m.coverText.slice(0, 2);
  return (m.title?.trim() || '?').slice(0, 1);
}

export default function HomePage() {
  const [index, setIndex] = useState<MapsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchJson<MapsIndex>('/maps/index.json', '无法加载图书目录');
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

  const filtered = useMemo(() => {
    if (!index) return [] as MapIndexEntry[];
    const q = query.trim().toLowerCase();
    let list = index.maps.slice();
    if (q) {
      list = list.filter((m) => {
        const hay = [m.title, m.author, m.subtitle, m.description]
          .filter(Boolean)
          .join('\n')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));
    return list;
  }, [index, query]);

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
        <p className="cm-loading">正在加载图书目录…</p>
      </div>
    );
  }

  const single = index.maps.length <= 1;
  const qTrim = query.trim();

  return (
    <div className="cm-shell">
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <h1>概念地图</h1>
            <p>从一本书读出可交互的思想结构</p>
          </div>
        </div>
        <button
          type="button"
          className="cm-theme-toggle"
          onClick={toggle}
          aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </header>

      <main className="cm-home">
        <div className="cm-home__hero">
          <h1>图书与地图</h1>
          <p>打开地图，沿章节与概念游走；节点旁有原文摘录，可按路径逐步阅读。</p>
          {!qTrim ? (
            <div className="cm-home__summary">
              <span>
                {index.maps.length} 本 ·{' '}
                {index.maps.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0)} 节点 ·{' '}
                {index.maps.reduce((s, m) => s + (m.stats?.edges ?? 0), 0)} 关系
              </span>
            </div>
          ) : (
            <div className="cm-home__summary">
              <span>
                匹配 {filtered.length} 本
              </span>
            </div>
          )}
        </div>

        {!single ? (
          <div className="cm-library-toolbar">
            <div className="cm-search-wrap cm-library-search">
              <input
                className="cm-search"
                type="search"
                placeholder="按书名、作者搜索…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="搜索图书"
              />
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="cm-empty-books">
            <h2>{qTrim ? '没有匹配的图书' : '还没有图书'}</h2>
            <p>{qTrim ? '试试其他关键词。' : '生成第一本地图后会出现在这里。'}</p>
            {qTrim ? (
              <button type="button" className="cm-btn" onClick={() => setQuery('')}>
                清空搜索
              </button>
            ) : null}
          </div>
        ) : (
          <div className="cm-home__grid">
            {filtered.map((m) => {
              const year = m.generatedAt ? formatGeneratedDate(m.generatedAt).slice(0, 4) : '';
              const badge = [m.author, (m as { publisher?: string }).publisher, year]
                .filter(Boolean)
                .join(' · ');
              return (
                <article key={m.id} className="cm-book-card">
                  <div
                    className="cm-book-card__cover"
                    style={{ background: m.coverColor || 'var(--bg-elev-2)' }}
                    aria-hidden
                  >
                    <span className="cm-book-card__cover-title">{m.coverText || coverGlyph(m)}</span>
                    <span className="cm-book-card__cover-sub">{m.title}</span>
                  </div>
                  <div className="cm-book-card__body">
                    {badge ? (
                      <div className="cm-book-card__badges">
                        <span className="cm-pill">{badge}</span>
                      </div>
                    ) : null}
                    <h2>{m.title}</h2>
                    {m.subtitle ? <div className="cm-book-card__meta">{m.subtitle}</div> : null}
                    {m.description ? <p className="cm-book-card__desc">{m.description}</p> : null}
                    <div className="cm-book-card__stats">
                      {m.stats ? (
                        <span>
                          {m.stats.nodes} 节点 · {m.stats.edges} 关系 · {m.stats.chapters} 章
                        </span>
                      ) : null}
                    </div>
                    <div className="cm-book-card__actions">
                      <Link className="cm-btn cm-btn--primary" to={`/maps/${m.id}`}>
                        打开地图
                      </Link>
                      <Link className="cm-btn cm-btn--ghost" to={`/books/${m.id}`}>
                        图书简介
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
