import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate } from '../lib/graphUtils';
import type { FeaturedPath, MapIndexEntry, MapMeta, MapsIndex } from '../types/graph';
import { useTheme } from '../hooks/useTheme';
import {
  IconBooks,
  IconEdges,
  IconMap,
  IconMoon,
  IconNetwork,
  IconNodes,
  IconSearch,
  IconSun,
  pathThemeIcon,
} from '../components/icons';
import { coverOf } from '../lib/covers';

function shortDesc(m: MapIndexEntry): string {
  const raw = (m.subtitle || m.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= 56) return raw;
  return `${raw.slice(0, 54)}…`;
}

function BookCard({ m }: { m: MapIndexEntry }) {
  const [paths, setPaths] = useState<FeaturedPath[]>([]);
  useEffect(() => {
    let cancelled = false;
    void fetchJson<MapMeta>(`/maps/${m.id}/meta.json`, 'meta').then(
      (meta) => {
        if (!cancelled) setPaths(meta.featuredPaths ?? []);
      },
      () => {
        if (!cancelled) setPaths([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [m.id]);

  const year = m.generatedAt ? formatGeneratedDate(m.generatedAt).slice(0, 4) : '';
  const badge = [m.author, year].filter(Boolean).join(' · ');
  const chips = paths.slice(0, 3);
  const desc = shortDesc(m);

  return (
    <article className="cm-book-card cm-book-card--home" data-book={m.id}>
      <div className="cm-book-card__accent" aria-hidden />
      <div className="cm-book-card__cover-wrap" aria-hidden>
        <div className="cm-book-card__cover-glow" />
        <div className="cm-book-card__cover cm-book-card__cover--art">
          <img src={coverOf(m.id)} alt="" width={120} height={160} decoding="async" />
        </div>
      </div>
      <div className="cm-book-card__body">
        {badge ? (
          <div className="cm-book-card__badges">
            <span className="cm-pill">{badge}</span>
          </div>
        ) : null}
        <h2>{m.title}</h2>
        {desc ? <p className="cm-book-card__desc">{desc}</p> : null}
        <div className="cm-book-card__stats cm-book-card__stats--density">
          {m.stats ? (
            <>
              <span>
                <IconNodes size={13} /> {m.stats.nodes} 节点
              </span>
              <span>
                <IconEdges size={13} /> {m.stats.edges} 关系
              </span>
              <span>
                <IconBooks size={13} /> {m.stats.chapters} 章
              </span>
            </>
          ) : null}
        </div>
        {chips.length ? (
          <div className="cm-book-card__paths" aria-label="推荐路径">
            {chips.map((p) => (
              <Link
                key={p.id}
                className="cm-chip cm-chip--path"
                to={`/maps/${m.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(p.nodeIds[0] || '')}`}
                title={p.description}
              >
                {pathThemeIcon(p.theme || p.id || p.title)}
                <span>{p.theme || p.title}</span>
                {p.durationMin != null ? <em>· 约 {p.durationMin} 分钟</em> : null}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="cm-book-card__actions">
          <Link className="cm-btn cm-btn--primary cm-btn--home-cta" to={`/maps/${m.id}?view=all`}>
            <IconMap size={14} /> 进入地图
          </Link>
          <Link className="cm-btn cm-btn--ghost cm-btn--home-secondary" to={`/books/${m.id}`}>
            简介
          </Link>
        </div>
      </div>
    </article>
  );
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

  useEffect(() => {
    document.title = '概念地图';
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

  const qTrim = query.trim();
  const totalNodes = index.maps.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0);
  const totalEdges = index.maps.reduce((s, m) => s + (m.stats?.edges ?? 0), 0);

  return (
    <div className="cm-shell cm-shell--home cm-shell--home-v10">
      <header className="cm-topbar cm-topbar--home">
        <div className="cm-brand cm-brand--home">
          <div className="cm-brand__mark cm-brand__mark--tri" aria-hidden />
          <div>
            <h1>概念地图</h1>
            <p>从一本书读出可交互的思想结构</p>
          </div>
        </div>
        <button
          type="button"
          className="cm-icon-btn cm-theme-toggle"
          onClick={toggle}
          aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main className="cm-home cm-home--v10">
        <section className="cm-home__hero-panel cm-home__hero-panel--mock">
          <div className="cm-home__hero-copy">
            <h1>
              <IconNetwork size={26} /> 图书与地图
            </h1>
            <p>沿路径阅读，或打开全景图。节点旁有原文。</p>
            <div className="cm-home__stat-pill" aria-label="馆藏统计">
              <span className="cm-home__stat">
                <IconBooks size={14} /> {index.maps.length} 本
              </span>
              <span className="cm-home__stat">
                <IconNodes size={14} /> {totalNodes} 节点
              </span>
              <span className="cm-home__stat">
                <IconEdges size={14} /> {totalEdges} 关系
              </span>
            </div>
          </div>
          <div className="cm-home__hero-art" aria-hidden>
            <img src="/illustrations/bg-mountains-airy.jpg" alt="" width={420} height={236} />
          </div>
        </section>

        <div className="cm-library-toolbar cm-library-toolbar--wide">
          <div className="cm-search-wrap cm-library-search">
            <span className="cm-search-icon" aria-hidden>
              <IconSearch size={16} />
            </span>
            <input
              className="cm-search cm-search--wide"
              type="search"
              placeholder="按书名、作者搜索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索图书"
            />
          </div>
        </div>

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
          <div className="cm-home__grid cm-home__grid--wide">
            {filtered.map((m) => (
              <BookCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
