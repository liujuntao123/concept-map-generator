import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  IconNodes,
  IconSearch,
  IconSun,
  pathThemeIcon,
} from '../components/icons';
import { coverUrl } from '../lib/covers';
import { buttonClass, cardSurface, fieldClass, iconButtonClass } from '../components/ui/styles';
import { cn } from '../lib/cn';

function shortDesc(m: MapIndexEntry): string {
  const raw = (m.subtitle || m.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= 56) return raw;
  return `${raw.slice(0, 54)}…`;
}

/* 路径 chip 三色轮转 */
const PATH_CHIP_TONES = [
  'border-[#4f8fe8]/50 bg-[#4f8fe8]/10 dark:bg-[#4f8fe8]/18',
  'border-[#7fbf6a]/50 bg-[#7fbf6a]/10 dark:bg-[#7fbf6a]/16',
  'border-[#c678dd]/50 bg-[#c678dd]/10 dark:bg-[#c678dd]/18',
];

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
    <article
      className={cn(
        cardSurface,
        'group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[20px] transition-[transform,border-color,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-float',
      )}
      data-book={m.id}
    >
      {/* 封面铺满整卡作为底图（封面来自内容 meta.cover）：
          ① 用混合模式把封面「白底」吃掉、只让图画与字迹透出（浅色 multiply，深色 invert + screen）；
          ② 仅轻度模糊保留构图比例，但不过度，保证封面清晰可见；
          ③ 蒙层只压住底部信息条，让封面主体尽量透出来 */}
      <img
        src={coverUrl(m.id, m.cover)}
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center opacity-85 mix-blend-multiply blur-[2px] dark:opacity-65 dark:invert dark:mix-blend-screen"
      />
      {/* 蒙层：底部信息条压到实色保证对比度，更快让出上方封面 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-surface from-0% via-surface/78 via-26% to-transparent to-52%"
      />

      <div className="relative z-10 flex min-w-0 flex-col gap-2 border-t border-line/40 bg-surface/80 p-5 backdrop-blur-sm">
        {badge ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-line bg-surface/60 px-2 py-0.5 text-[0.72rem] leading-[1.5] text-ink/75">
              {badge}
            </span>
          </div>
        ) : null}

        <h2 className="text-[1.2rem] leading-tight font-bold">{m.title}</h2>
        {desc ? (
          <p className="line-clamp-2 text-[0.88rem] leading-snug text-ink/85">{desc}</p>
        ) : null}

        {m.stats ? (
          <div className="flex flex-wrap gap-1.5">
            <StatPill icon={<IconNodes size={13} />} text={`${m.stats.nodes} 节点`} />
            <StatPill icon={<IconEdges size={13} />} text={`${m.stats.edges} 关系`} />
            <StatPill icon={<IconBooks size={13} />} text={`${m.stats.chapters} 章`} />
          </div>
        ) : null}

        {chips.length ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1" aria-label="推荐路径">
            {chips.map((p, i) => (
              <Link
                key={p.id}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[0.78rem] text-ink transition-colors ease-soft hover:text-accent',
                  PATH_CHIP_TONES[i % PATH_CHIP_TONES.length],
                )}
                to={`/maps/${m.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(p.nodeIds[0] || '')}`}
                title={p.description}
              >
                {pathThemeIcon(p.theme || p.id || p.title)}
                <span>{p.theme || p.title}</span>
                {p.durationMin != null ? (
                  <em className="text-[0.72rem] text-muted not-italic">· 约 {p.durationMin} 分钟</em>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-1.5 flex flex-wrap gap-2.5">
          <Link
            className={buttonClass({
              variant: 'primary',
              className: 'h-[38px] shrink-0 px-4 text-[0.85rem] font-semibold',
            })}
            to={`/maps/${m.id}?view=all`}
          >
            <IconMap size={14} /> 进入地图
          </Link>
          <Link
            className={buttonClass({
              variant: 'ghost',
              className: 'h-[38px] shrink-0 px-4 text-[0.85rem] font-semibold',
            })}
            to={`/books/${m.id}`}
          >
            简介
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#5b8fd9]/25 bg-[#5b8fd9]/10 px-2.5 py-1 text-[0.75rem] text-[#2a5f9e] dark:bg-[#5b8fd9]/16 dark:text-ink">
      {icon} {text}
    </span>
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
      <div className="grid min-h-screen place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-7 py-5 text-center text-danger shadow-card">
          {error}
        </p>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="grid min-h-screen place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-7 py-5 text-center text-muted shadow-card">
          正在加载图书目录…
        </p>
      </div>
    );
  }

  const qTrim = query.trim();
  const totalNodes = index.maps.reduce((s, m) => s + (m.stats?.nodes ?? 0), 0);
  const totalEdges = index.maps.reduce((s, m) => s + (m.stats?.edges ?? 0), 0);

  return (
    <div className="page-wash-home grid min-h-screen grid-rows-[auto_1fr]">
      <header className="z-5 flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="brand-mark-tri h-10 w-10 shrink-0 rounded-inner shadow-[0_4px_14px_rgba(91,143,217,0.22)]" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-[1.15rem] font-bold">概念地图</h1>
            <p className="text-[0.8rem] text-muted">从一本书读出可交互的思想结构</p>
          </div>
        </div>
        <button
          type="button"
          className={iconButtonClass()}
          onClick={toggle}
          aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <main className="mx-auto w-full max-w-[920px] px-5 pt-2 pb-14">
        {/* 三个统计标签直接作为页面工具条的一部分，不再包成 Hero 模块 */}
        <div className="mb-5 flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center">
          <div className="flex flex-wrap items-center gap-2" aria-label="馆藏统计">
            <StatBadge icon={<IconBooks size={14} />} text={`${index.maps.length} 本`} />
            <StatBadge icon={<IconNodes size={14} />} text={`${totalNodes} 节点`} />
            <StatBadge icon={<IconEdges size={14} />} text={`${totalEdges} 关系`} />
          </div>
          <div className="relative min-[720px]:flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-muted" aria-hidden>
              <IconSearch size={16} />
            </span>
            <input
              className={cn(fieldClass, 'h-10 w-full rounded-full pr-3.5 pl-9 text-[0.95rem] shadow-soft')}
              type="search"
              placeholder="按书名、作者搜索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索图书"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
            <h2 className="mb-2 text-lg font-semibold">
              {qTrim ? '没有匹配的图书' : '还没有图书'}
            </h2>
            <p className="mb-4 text-sm text-muted">
              {qTrim ? '试试其他关键词。' : '生成第一本地图后会出现在这里。'}
            </p>
            {qTrim ? (
              <button
                type="button"
                className={buttonClass()}
                onClick={() => setQuery('')}
              >
                清空搜索
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[820px]:grid-cols-2">
            {filtered.map((m) => (
              <BookCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatBadge({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface/85 px-3.5 text-[0.82rem] text-ink/80 shadow-soft backdrop-blur-sm">
      <span className="text-accent">{icon}</span>
      {text}
    </span>
  );
}
