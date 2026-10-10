import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate } from '../lib/graphUtils';
import type { MapIndexEntry, MapsIndex } from '../types/graph';
import { STATUS_LABEL } from '../types/graph';
import { useTheme } from '../hooks/useTheme';

type SortKey = 'recent' | 'title' | 'nodes';

function coverInitial(m: MapIndexEntry): string {
  if (m.coverText) return m.coverText.slice(0, 2);
  const t = m.title?.trim() || '?';
  return t.slice(0, 2);
}

export default function HomePage() {
  const [index, setIndex] = useState<MapsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchJson<MapsIndex>(
          '/maps/index.json',
          '无法加载图书目录',
        );
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
        const hay = [m.title, m.author, m.subtitle, m.description, m.sourceFile]
          .filter(Boolean)
          .join('\n')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) => {
      if (sort === 'title') {
        return (a.title || '').localeCompare(b.title || '', 'zh-CN');
      }
      if (sort === 'nodes') {
        return (b.stats?.nodes ?? 0) - (a.stats?.nodes ?? 0);
      }
      const ta = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const tb = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [index, query, sort]);

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

  const qTrim = query.trim();
  const summaryBooks = filtered.length;
  const summaryNodes = filtered.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0);
  const summaryEdges = filtered.reduce((s, m) => s + (m.stats?.edges ?? 0), 0);
  const libraryBooks = index.maps.length;
  const libraryNodes = index.maps.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0);
  const libraryEdges = index.maps.reduce((s, m) => s + (m.stats?.edges ?? 0), 0);

  return (
    <div className="cm-shell">
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <h1>概念地图</h1>
            <p>图书管理 · 从书籍到可交互知识结构</p>
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
          <h1>图书与地图</h1>
          <p>
            浏览已生成的概念地图。每本书来自 IMA 知识库拆解：章节、概念、主张、人物与著作相互关联，节点详情含原文摘录。
          </p>
          <div className="cm-home__summary">
            {qTrim ? (
              <>
                <span>
                  匹配 {summaryBooks} 本 / {summaryNodes} 节点 / {summaryEdges} 关系
                </span>
                <span className="cm-home__summary-muted">
                  全库 {libraryBooks} 本 / {libraryNodes} 节点 / {libraryEdges} 关系
                </span>
              </>
            ) : (
              <>
                <span>{libraryBooks} 本</span>
                <span>{libraryNodes} 节点</span>
                <span>{libraryEdges} 关系</span>
              </>
            )}
          </div>
        </div>

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
          <div className="cm-library-sort">
            <label htmlFor="cm-sort">排序</label>
            <select
              id="cm-sort"
              className="cm-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="recent">最近生成</option>
              <option value="title">书名</option>
              <option value="nodes">节点数</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="cm-empty-books">
            <div className="cm-empty-books__icon" aria-hidden>
              📚
            </div>
            <h2>{qTrim ? '没有匹配的图书' : '还没有图书'}</h2>
            <p>
              {qTrim
                ? '试试其他关键词，或清空搜索查看全部。'
                : '用 book-to-conceptmap skill 从 IMA 知识库生成第一本地图后，会出现在这里。'}
            </p>
            {qTrim ? (
              <button type="button" className="cm-btn" onClick={() => setQuery('')}>
                清空搜索
              </button>
            ) : null}
          </div>
        ) : (
          <div className="cm-home__grid">
            {filtered.map((m) => {
              const status = m.status ?? 'draft';
              return (
                <article key={m.id} className="cm-book-card">
                  <div
                    className="cm-book-card__cover"
                    style={{ background: m.coverColor || 'var(--bg-elev-2)' }}
                    aria-hidden
                  >
                    <span>{coverInitial(m)}</span>
                  </div>
                  <div className="cm-book-card__body">
                    <div className="cm-book-card__badges">
                      <span
                        className={`cm-pill cm-pill--status-${status}`}
                        title="发布状态"
                      >
                        发布状态：{STATUS_LABEL[status]}
                      </span>
                      {m.version ? <span className="cm-pill">v{m.version}</span> : null}
                    </div>
                    <h2>{m.title}</h2>
                    <div className="cm-book-card__meta">
                      {m.author ? <span>{m.author}</span> : null}
                      {m.subtitle ? <span>{m.subtitle}</span> : null}
                    </div>
                    {m.description ? (
                      <p className="cm-book-card__desc">{m.description}</p>
                    ) : null}
                    <div className="cm-book-card__stats">
                      {m.stats ? (
                        <>
                          <span>{m.stats.chapters} 章节</span>
                          <span>{m.stats.concepts} 概念</span>
                          <span>{m.stats.nodes} 节点</span>
                          <span>{m.stats.edges} 关系</span>
                        </>
                      ) : null}
                      {m.generatedAt ? (
                        <span>{formatGeneratedDate(m.generatedAt)}</span>
                      ) : null}
                    </div>
                    <div className="cm-book-card__actions">
                      <Link className="cm-btn cm-btn--primary" to={`/maps/${m.id}`}>
                        打开地图
                      </Link>
                      <Link className="cm-btn cm-btn--ghost" to={`/books/${m.id}`}>
                        查看详情
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
