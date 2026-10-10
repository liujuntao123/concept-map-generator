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
  IconNetwork,
  IconNodes,
  IconSearch,
  IconSun,
  pathThemeIcon,
} from '../components/icons';
import { coverOf } from '../lib/covers';
import { buttonClass, cardSurface, fieldClass, iconButtonClass } from '../components/ui/styles';
import { cn } from '../lib/cn';

function shortDesc(m: MapIndexEntry): string {
  const raw = (m.subtitle || m.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= 56) return raw;
  return `${raw.slice(0, 54)}…`;
}

/* 每本书的强调色与封面媒体区底色（沿用原设计的配色映射） */
function accentBar(id: string): string {
  if (id.includes('kahneman')) return 'bg-linear-to-b from-[#3d7ad6] via-[#5b8fd9] to-[#98c379]';
  if (id.includes('chujia')) return 'bg-linear-to-b from-[#8b6cc9] via-[#c678dd] to-[#e06c75]';
  return 'bg-linear-to-b from-[#4f8fe8] via-[#7aa2c7] to-[#6a9fd8]';
}

function coverMedia(id: string): string {
  if (id.includes('kahneman')) {
    return 'bg-linear-to-b from-[#e7f0fb] to-[#f5f9fe] dark:from-[#182433] dark:to-[#151d2a]';
  }
  if (id.includes('chujia')) {
    return 'bg-linear-to-b from-[#f0ebf8] to-[#f8f5fc] dark:from-[#221d30] dark:to-[#1a1626]';
  }
  return 'bg-linear-to-b from-[#edf3fa] to-[#f7fafc] dark:from-[#182230] dark:to-[#151d29]';
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
        'group grid grid-cols-[6px_132px_1fr] overflow-hidden rounded-[20px] transition-[transform,border-color,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-float max-[860px]:grid-cols-[5px_96px_1fr]',
      )}
      data-book={m.id}
    >
      <div className={cn('w-1.5 rounded-l-[20px]', accentBar(m.id))} aria-hidden />

      <div
        className={cn(
          'flex w-[132px] flex-col items-center justify-center px-2.5 py-3.5 max-[860px]:w-24 max-[860px]:px-2',
          coverMedia(m.id),
        )}
        aria-hidden
      >
        <div className="relative flex w-full justify-center">
          <span className="absolute inset-[10%_-8%_-2%_-8%] rounded-card bg-[radial-gradient(ellipse_at_center,rgba(91,143,217,0.35),transparent_70%)] opacity-85 blur-[10px]" />
          <img
            src={coverOf(m.id)}
            alt=""
            width={120}
            height={160}
            decoding="async"
            className="relative aspect-3/4 w-28 rounded-[10px] border border-[#7aa2c7]/35 bg-[#eef3f8] object-contain shadow-[0_6px_16px_rgba(26,42,61,0.12)] dark:border-[#7aa2c7]/40 dark:bg-[#1a2433] max-[860px]:w-[78px]"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 py-4 pr-5 pl-1 max-[860px]:py-3 max-[860px]:pr-3.5 max-[860px]:pl-0">
        {badge ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[0.72rem] leading-[1.5] text-muted">
              {badge}
            </span>
          </div>
        ) : null}

        <h2 className="text-[1.2rem] leading-tight font-bold">{m.title}</h2>
        {desc ? <p className="line-clamp-2 text-[0.88rem] leading-snug text-muted">{desc}</p> : null}

        {m.stats ? (
          <div className="flex flex-wrap gap-1.5">
            <StatPill icon={<IconNodes size={13} />} text={`${m.stats.nodes} 节点`} />
            <StatPill icon={<IconEdges size={13} />} text={`${m.stats.edges} 关系`} />
            <StatPill icon={<IconBooks size={13} />} text={`${m.stats.chapters} 章`} />
          </div>
        ) : null}

        {chips.length ? (
          <div
            className="flex flex-wrap gap-1.5 overflow-x-auto pt-0.5 pb-1 max-[860px]:flex-nowrap max-[860px]:[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="推荐路径"
          >
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

        <div className="mt-1.5 flex gap-2.5 max-[860px]:flex-nowrap">
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
        <section className="hero-photo relative isolate mb-4 flex min-h-[248px] items-center overflow-hidden rounded-[22px] border border-[#c5d4e6]/55 shadow-card max-[760px]:min-h-[212px] dark:border-[#7aa2c7]/32">
          <span className="hero-scrim absolute inset-0" aria-hidden />
          <div className="relative z-1 max-w-[60%] px-10 py-9 max-[760px]:max-w-full max-[760px]:px-5.5 max-[760px]:py-6.5">
            <h1 className="mb-2.5 flex items-center gap-2.5 text-[1.7rem] leading-tight font-bold max-[760px]:text-[1.4rem]">
              <IconNetwork size={26} className="text-accent" /> 图书与地图
            </h1>
            <p className="mb-4 max-w-[26em] text-[0.98rem] leading-relaxed text-ink/76">
              沿路径阅读，或打开全景图。节点旁有原文。
            </p>
            <div className="flex flex-wrap gap-2" aria-label="馆藏统计">
              <HeroStat icon={<IconBooks size={14} />} text={`${index.maps.length} 本`} />
              <HeroStat icon={<IconNodes size={14} />} text={`${totalNodes} 节点`} />
              <HeroStat icon={<IconEdges size={14} />} text={`${totalEdges} 关系`} />
            </div>
          </div>
        </section>

        <div className="relative mb-4">
          <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-muted" aria-hidden>
            <IconSearch size={16} />
          </span>
          <input
            className={cn(fieldClass, 'w-full rounded-full py-3 pr-3.5 pl-9 text-[0.95rem] shadow-soft')}
            type="search"
            placeholder="按书名、作者搜索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索图书"
          />
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
          <div className="flex flex-col gap-4">
            {filtered.map((m) => (
              <BookCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function HeroStat({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-white/62 px-3 py-1.5 text-[0.82rem] text-ink shadow-[0_2px_10px_rgba(30,50,80,0.08)] backdrop-blur-[8px] dark:border-[#94b2d6]/28 dark:bg-[#141b26]/55 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
      {icon} {text}
    </span>
  );
}
