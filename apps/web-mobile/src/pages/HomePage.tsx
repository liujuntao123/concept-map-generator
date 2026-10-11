import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buttonClass,
  cn,
  coverOf,
  fetchJson,
  fieldClass,
  formatGeneratedDate,
  iconButtonClass,
  IconBooks,
  IconClose,
  IconEdges,
  IconMap,
  IconMoon,
  IconNodes,
  IconSearch,
  IconSun,
  pathThemeIcon,
  PATH_CHIP_TONES,
  useTheme,
  type FeaturedPath,
  type MapIndexEntry,
  type MapMeta,
  type MapsIndex,
} from '@concept-map/core';

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
  const desc = shortDesc(m);
  const chips = paths.slice(0, 3);

  return (
    <article className="rounded-card border border-line bg-surface p-3.5 shadow-card" data-book={m.id}>
      <Link to={`/books/${m.id}`} className="flex gap-3">
        <img
          src={coverOf(m.id)}
          alt=""
          aria-hidden
          decoding="async"
          className="h-[104px] w-[78px] shrink-0 rounded-lg border border-line object-cover"
        />
        <div className="min-w-0 flex-1">
          {badge ? (
            <span className="mb-1 inline-flex rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[0.7rem] text-muted">
              {badge}
            </span>
          ) : null}
          <h2 className="mt-0 mb-1 text-[1.05rem] leading-snug font-bold">{m.title}</h2>
          {desc ? (
            <p className="m-0 line-clamp-2 text-[0.82rem] leading-snug text-muted">{desc}</p>
          ) : null}
          {m.stats ? (
            <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[0.72rem] text-muted">
              <span className="inline-flex items-center gap-1">
                <IconNodes size={12} /> {m.stats.nodes} 节点
              </span>
              <span className="inline-flex items-center gap-1">
                <IconEdges size={12} /> {m.stats.edges} 关系
              </span>
              <span className="inline-flex items-center gap-1">
                <IconBooks size={12} /> {m.stats.chapters} 章
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      {chips.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="推荐路径">
          {chips.map((p, i) => (
            <Link
              key={p.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[0.75rem] text-ink',
                PATH_CHIP_TONES[i % PATH_CHIP_TONES.length],
              )}
              to={`/maps/${m.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(p.nodeIds[0] || '')}`}
            >
              {pathThemeIcon(p.theme || p.id || p.title, 13)}
              <span>{p.theme || p.title}</span>
              {p.durationMin != null ? (
                <em className="text-[0.68rem] text-muted not-italic">· {p.durationMin}′</em>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Link
          className={buttonClass({ variant: 'primary', size: 'lg', className: 'flex-1' })}
          to={`/maps/${m.id}?view=all`}
        >
          <IconMap size={15} /> 进入地图
        </Link>
        <Link className={buttonClass({ size: 'lg' })} to={`/books/${m.id}`}>
          简介
        </Link>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [index, setIndex] = useState<MapsIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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
      <div className="grid min-h-dvh place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-6 py-5 text-center text-danger shadow-card">
          {error}
        </p>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="grid min-h-dvh place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-6 py-5 text-center text-muted shadow-card">
          正在加载图书目录…
        </p>
      </div>
    );
  }

  const totalNodes = index.maps.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0);
  const totalEdges = index.maps.reduce((s, m) => s + (m.stats?.edges ?? 0), 0);
  const qTrim = query.trim();

  return (
    <div className="mobile-wash min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/88 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <div className="brand-mark-tri h-9 w-9 shrink-0 rounded-inner" aria-hidden />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-[1.05rem] leading-tight font-bold">概念地图</h1>
            <p className="m-0 truncate text-[0.72rem] text-muted">从一本书读出可交互的思想结构</p>
          </div>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            onClick={() => {
              if (searchOpen) setQuery('');
              setSearchOpen((v) => !v);
            }}
            aria-label={searchOpen ? '收起搜索' : '搜索图书'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <IconClose /> : <IconSearch />}
          </button>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        {searchOpen ? (
          <div className="px-3 pb-2.5">
            <input
              ref={searchRef}
              className={cn(fieldClass, 'h-11 w-full rounded-full px-4 text-[0.95rem]')}
              type="search"
              placeholder="按书名、作者搜索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索图书"
            />
          </div>
        ) : null}
      </header>

      <main className="flex flex-col gap-3 px-3.5 pt-3 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        <div className="flex flex-wrap gap-1.5 text-[0.75rem] text-muted" aria-label="馆藏统计">
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/85 px-3 py-1">
            <IconBooks size={13} /> {index.maps.length} 本
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/85 px-3 py-1">
            <IconNodes size={13} /> {totalNodes} 节点
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/85 px-3 py-1">
            <IconEdges size={13} /> {totalEdges} 关系
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
            <h2 className="mt-0 mb-2 text-lg font-semibold">
              {qTrim ? '没有匹配的图书' : '还没有图书'}
            </h2>
            <p className="mb-4 text-sm text-muted">
              {qTrim ? '试试其他关键词。' : '生成第一本地图后会出现在这里。'}
            </p>
            {qTrim ? (
              <button type="button" className={buttonClass()} onClick={() => setQuery('')}>
                清空搜索
              </button>
            ) : null}
          </div>
        ) : (
          filtered.map((m) => <BookCard key={m.id} m={m} />)
        )}
      </main>
    </div>
  );
}