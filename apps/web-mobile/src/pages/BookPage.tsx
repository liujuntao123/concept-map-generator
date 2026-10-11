import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  buttonClass,
  cn,
  coverInfoOf,
  EDGE_TYPE_LABEL,
  fetchJson,
  formatGeneratedDate,
  iconButtonClass,
  IconChevronLeft,
  IconMap,
  IconMoon,
  IconPath,
  IconSun,
  NODE_TYPE_LABEL,
  Pill,
  plateOf,
  TypeCover,
  useTheme,
  type ConceptGraph,
  type MapMeta,
  type NodeType,
} from '@concept-map/core';
import Collapse from '../components/Collapse';

export default function BookPage() {
  const params = useParams();
  const bookId = params.bookId || params.mapId || '';
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [graph, setGraph] = useState<ConceptGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [data, g] = await Promise.all([
          fetchJson<MapMeta>(
            `/maps/${bookId}/meta.json`,
            '无法加载图书详情。请确认图书地址是否正确。',
          ),
          fetchJson<ConceptGraph>(`/maps/${bookId}/graph.json`, '无法加载图谱').catch(() => null),
        ]);
        if (!cancelled) {
          setMeta(data);
          setGraph(g);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setMeta(null);
          setError(e instanceof Error ? e.message : '无法加载图书详情');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!meta) return;
    document.title = `${meta.title} · 概念地图`;
    return () => {
      document.title = '概念地图';
    };
  }, [meta]);

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

  if (!meta) {
    return (
      <div className="grid min-h-dvh place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-6 py-5 text-muted shadow-card">
          正在加载图书详情…
        </p>
      </div>
    );
  }

  const nodeBreakdown = meta.nodeTypeBreakdown ?? {
    chapter: meta.stats?.chapters,
    concept: meta.stats?.concepts,
    claim: meta.stats?.claims,
    person: meta.stats?.persons,
    work: meta.stats?.works,
  };
  const edgeBreakdown = meta.edgeTypeBreakdown ?? {};
  const year = meta.generatedAt ? formatGeneratedDate(meta.generatedAt).slice(0, 4) : '';
  const byline = [meta.author, meta.publisher, year].filter(Boolean).join(' · ');
  const firstPath = meta.featuredPaths?.[0];
  const cover = coverInfoOf(meta.id, meta.title, meta.coverText, meta.coverColor);

  return (
    <div className="mobile-wash min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/88 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center gap-1.5 px-2 py-2">
          <Link
            to="/"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            aria-label="返回图书列表"
          >
            <IconChevronLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[0.95rem] leading-tight font-semibold">图书简介</h1>
            <p className="m-0 truncate text-[0.72rem] text-muted">{meta.title}</p>
          </div>
          <button
            type="button"
            className={iconButtonClass({ className: 'h-11 w-11 border-transparent bg-transparent' })}
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-3 px-3.5 pt-3.5 pb-32">
        <section
          className="rounded-card border border-line bg-surface p-4 shadow-card"
          data-book={meta.id}
        >
          <div
            className={cn(
              'mx-auto flex w-40 items-center justify-center rounded-panel border border-[#7aa2c7]/25 p-3',
              plateOf(meta.id),
            )}
            aria-hidden
          >
            {cover.kind === 'image' ? (
              <img
                src={cover.src}
                alt=""
                width={160}
                height={213}
                className="aspect-3/4 w-full rounded-lg object-contain shadow-[0_6px_18px_rgba(26,42,61,0.14)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
              />
            ) : (
              <TypeCover
                text={cover.text}
                color={cover.color}
                className="aspect-3/4 w-full rounded-lg shadow-[0_6px_18px_rgba(26,42,61,0.14)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
                markClassName="text-[2.6rem]"
              />
            )}
          </div>

          {byline ? (
            <div className="mt-3 flex justify-center">
              <Pill>{byline}</Pill>
            </div>
          ) : null}
          <h1 className="mt-2.5 mb-1 text-center text-[1.35rem] leading-tight font-bold">
            {meta.title}
          </h1>
          {meta.subtitle && meta.subtitle !== meta.title ? (
            <p className="mt-0 mb-1 text-center text-[0.88rem] text-muted">{meta.subtitle}</p>
          ) : null}
          <p className="mt-2 mb-0 text-[0.92rem] leading-[1.68] text-ink/90">
            {meta.description ||
              '这本书被整理成可交互的概念地图：可从章节走进概念与主张，边旁有原文摘录。'}
          </p>
        </section>

        {meta.featuredPaths && meta.featuredPaths.length > 0 ? (
          <section className="rounded-card border border-line bg-surface px-4 pt-1 pb-3 shadow-card">
            <Collapse className="border-t-0" title="推荐阅读路径" defaultOpen>
              <div className="flex flex-col gap-2.5">
                {meta.featuredPaths.map((p) => {
                  const firstId = p.nodeIds[0] || '';
                  const firstLabel = graph?.nodes.find((n) => n.id === firstId)?.label || firstId;
                  const shortNames = p.nodeIds.slice(0, 6).map((id, i) => {
                    const lab = graph?.nodes.find((n) => n.id === id)?.label || id;
                    const short = lab.length > 10 ? lab.slice(0, 9) + '…' : lab;
                    return `${i + 1}. ${short}`;
                  });
                  return (
                    <div
                      key={p.id}
                      className="rounded-panel border border-line bg-surface-2 p-3.5"
                    >
                      <h3 className="mt-0 mb-1 text-[0.95rem] font-semibold">
                        {p.theme || p.title}
                      </h3>
                      <p className="mt-0 mb-1 text-[0.75rem] text-muted">
                        {p.difficulty || '入门'}
                        {p.durationMin ? ` · 约 ${p.durationMin} 分钟` : ''}
                        {` · ${p.nodeIds.length} 步`}
                      </p>
                      <p className="mt-0 mb-1.5 text-[0.8rem] text-muted">{p.description}</p>
                      <ol className="m-0 mb-2.5 list-decimal pl-4 text-[0.8rem] leading-relaxed text-muted">
                        {shortNames.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                        {p.nodeIds.length > 6 ? <li>…共 {p.nodeIds.length} 步</li> : null}
                      </ol>
                      <Link
                        className={buttonClass({
                          variant: 'primary',
                          size: 'lg',
                          className: 'w-full',
                        })}
                        to={`/maps/${meta.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(firstId)}`}
                      >
                        从「{firstLabel.length > 12 ? firstLabel.slice(0, 11) + '…' : firstLabel}
                        」开始
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Collapse>
          </section>
        ) : null}

        <section className="rounded-card border border-line bg-surface px-4 pt-1 pb-3 shadow-card">
          <Collapse className="border-t-0" title="关于这张地图（规模与类型）">
            <p className="mt-0 mb-0 text-[0.95rem] leading-relaxed font-semibold">
              {meta.stats
                ? `${meta.stats.nodes} 节点 · ${meta.stats.edges} 关系 · ${meta.stats.chapters} 章 · ${meta.stats.concepts} 概念`
                : '暂无规模数据'}
            </p>

            <h3 className="mt-3.5 mb-2 text-[0.72rem] tracking-[0.06em] text-muted uppercase">
              节点类型
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {(Object.keys(NODE_TYPE_LABEL) as NodeType[]).map((ty) => {
                const n = nodeBreakdown?.[ty] ?? 0;
                if (!n) return null;
                return (
                  <li key={ty}>
                    <Link
                      className="flex items-center gap-2.5 text-ink no-underline"
                      to={`/maps/${meta.id}?type=${ty}`}
                    >
                      <Pill tone={ty}>{NODE_TYPE_LABEL[ty]}</Pill>
                      <strong className="tabular-nums">{n}</strong>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-3.5 mb-2 text-[0.72rem] tracking-[0.06em] text-muted uppercase">
              边类型
            </h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {Object.entries(edgeBreakdown).map(([ty, n]) => (
                <li key={ty} className="flex items-center gap-2.5">
                  <Pill>{EDGE_TYPE_LABEL[ty] ?? ty}</Pill>
                  <strong className="tabular-nums">{n}</strong>
                </li>
              ))}
              {Object.keys(edgeBreakdown).length === 0 ? (
                <li className="text-[0.85rem] text-muted">暂无边类型统计</li>
              ) : null}
            </ul>

            <dl className="mt-3.5 mb-0 grid grid-cols-1 gap-2.5">
              <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
                <dt className="mb-0.5 text-[0.72rem] text-muted">生成日期</dt>
                <dd className="m-0 text-[0.9rem] font-semibold break-words">
                  {formatGeneratedDate(meta.generatedAt)}
                </dd>
              </div>
              <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
                <dt className="mb-0.5 text-[0.72rem] text-muted">源文件</dt>
                <dd className="m-0 text-[0.9rem] font-semibold break-words">
                  {meta.source?.file || '—'}
                </dd>
              </div>
              {meta.version ? (
                <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
                  <dt className="mb-0.5 text-[0.72rem] text-muted">地图版本</dt>
                  <dd className="m-0 text-[0.9rem] font-semibold break-words">{meta.version}</dd>
                </div>
              ) : null}
            </dl>
          </Collapse>
        </section>
      </main>

      {/* 常驻底部操作条 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-3.5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur-md">
        <div className="flex gap-2">
          {firstPath ? (
            <Link
              className={buttonClass({ size: 'lg', className: 'flex-1' })}
              to={`/maps/${meta.id}?path=${encodeURIComponent(firstPath.id)}&step=0&node=${encodeURIComponent(firstPath.nodeIds[0] || '')}`}
            >
              <IconPath size={15} /> 推荐路径
            </Link>
          ) : null}
          <Link
            className={buttonClass({ variant: 'primary', size: 'lg', className: 'flex-[1.4]' })}
            to={`/maps/${meta.id}?view=all`}
          >
            <IconMap size={15} /> 进入地图
          </Link>
        </div>
      </div>
    </div>
  );
}