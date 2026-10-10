import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate } from '../lib/graphUtils';
import { coverOf } from '../lib/covers';
import {
  EDGE_TYPE_LABEL,
  NODE_TYPE_LABEL,
  type MapMeta,
  type NodeType,
} from '../types/graph';
import { useTheme } from '../hooks/useTheme';
import { IconChevronLeft, IconMap, IconMoon, IconPath, IconSun } from '../components/icons';
import type { ConceptGraph } from '../types/graph';
import Pill from '../components/ui/Pill';
import { buttonClass, iconButtonClass, panelSurface } from '../components/ui/styles';
import { cn } from '../lib/cn';

/* 封面底板配色（沿用原设计的每本书配色映射） */
function plateTone(id: string): string {
  if (id.includes('kahneman')) {
    return 'bg-linear-to-b from-[#e7f0fb] to-[#f5f9fe] dark:from-[#182433] dark:to-[#151d2a]';
  }
  if (id.includes('chujia')) {
    return 'bg-linear-to-b from-[#f0ebf8] to-[#f8f5fc] dark:from-[#221d30] dark:to-[#1a1626]';
  }
  return 'bg-linear-to-b from-[#edf3fa] to-[#f7fafc] dark:from-[#182230] dark:to-[#151d29]';
}

export default function BookDetailPage() {
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
      <div className="grid min-h-screen place-content-center justify-items-center gap-3.5 bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-7 py-5 text-danger shadow-card">
          {error}
        </p>
        <Link to="/">返回图书列表</Link>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="grid min-h-screen place-content-center bg-canvas p-6">
        <p className="rounded-panel border border-line bg-surface px-7 py-5 text-muted shadow-card">
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

  return (
    <div className={cn('page-wash grid min-h-screen grid-rows-[auto_1fr]')}>
      <header className="z-5 flex flex-wrap items-center justify-between gap-2 px-5 py-3 max-[860px]:px-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.8rem] text-muted transition-colors ease-soft hover:border-accent hover:text-accent hover:no-underline"
            to="/"
          >
            <IconChevronLeft size={14} /> 图书列表
          </Link>
          <div className="brand-mark h-9 w-9 shrink-0 rounded-inner" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-[1.05rem] font-semibold">图书简介</h1>
            <p className="truncate text-[0.78rem] text-muted max-[860px]:max-w-[48vw]">
              {meta.title}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 max-[860px]:w-auto">
          <button
            type="button"
            className={iconButtonClass()}
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-4.5 px-5 pt-6 pb-14 max-[860px]:gap-4 max-[860px]:px-3.5 max-[860px]:pt-4.5 max-[860px]:pb-10">
        <section
          className="grid grid-cols-[176px_1fr] items-stretch gap-7 rounded-card border border-line bg-surface p-7 shadow-card max-[860px]:grid-cols-[112px_1fr] max-[860px]:gap-4.5 max-[860px]:p-4.5 max-[480px]:grid-cols-1 max-[480px]:gap-3.5"
          data-book={meta.id}
        >
          <div
            className={cn(
              'flex w-44 items-center justify-center self-stretch rounded-panel border border-[#7aa2c7]/25 p-4 max-[860px]:w-28 max-[860px]:p-2.5 max-[480px]:mx-auto max-[480px]:w-32',
              plateTone(meta.id),
            )}
            aria-hidden
          >
            <img
              src={coverOf(meta.id)}
              alt=""
              width={180}
              height={240}
              className="aspect-3/4 w-full rounded-lg object-contain shadow-[0_6px_18px_rgba(26,42,61,0.14)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
            />
          </div>

          <div className="flex min-w-0 flex-col">
            {byline ? (
              <div className="flex flex-wrap gap-1.5">
                <Pill>{byline}</Pill>
              </div>
            ) : null}
            <h1 className="mt-3 mb-0.5 text-[1.75rem] leading-tight font-bold max-[860px]:text-[1.4rem]">
              {meta.title}
            </h1>
            {meta.subtitle && meta.subtitle !== meta.title ? (
              <p className="text-[0.95rem] text-muted">{meta.subtitle}</p>
            ) : null}
            <p className="mt-3 leading-[1.68]">
              {meta.description ||
                '这本书被整理成可交互的概念地图：可从章节走进概念与主张，边旁有原文摘录。'}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-5 max-[860px]:pt-3.5 max-[480px]:flex-col max-[480px]:items-stretch">
              <Link
                className={buttonClass({
                  variant: 'primary',
                  size: 'lg',
                  className: 'max-[480px]:w-full',
                })}
                to={`/maps/${meta.id}?view=all`}
              >
                <IconMap size={14} /> 进入地图
              </Link>
              {meta.featuredPaths?.[0] ? (
                <Link
                  className={buttonClass({
                    variant: 'ghost',
                    size: 'lg',
                    className: 'max-[480px]:w-full',
                  })}
                  to={`/maps/${meta.id}?path=${encodeURIComponent(meta.featuredPaths[0].id)}&step=0&node=${encodeURIComponent(meta.featuredPaths[0].nodeIds[0] || '')}`}
                >
                  <IconPath size={14} /> 从推荐路径开始
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {meta.featuredPaths && meta.featuredPaths.length > 0 ? (
          <section className={cn(panelSurface, 'w-full p-5')}>
            <h2 className="mb-3.5 text-[0.78rem] tracking-[0.08em] text-muted uppercase">
              推荐阅读路径
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {meta.featuredPaths.map((p) => {
                const firstId = p.nodeIds[0] || '';
                const firstLabel =
                  graph?.nodes.find((n) => n.id === firstId)?.label || firstId;
                const shortNames = p.nodeIds.slice(0, 6).map((id, i) => {
                  const lab = graph?.nodes.find((n) => n.id === id)?.label || id;
                  const short = lab.length > 10 ? lab.slice(0, 9) + '…' : lab;
                  return `${i + 1}. ${short}`;
                });
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-panel border border-line bg-surface-2 p-4 transition-[transform,border-color,box-shadow] duration-150 ease-soft hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
                  >
                    <h3 className="text-base font-semibold">{p.theme || p.title}</h3>
                    <p className="text-[0.8rem] text-muted">
                      {p.difficulty || '入门'}
                      {p.durationMin ? ` · 约 ${p.durationMin} 分钟` : ''}
                      {p.arc ? ` · ${p.arc}` : ''}
                    </p>
                    <p className="text-[0.82rem] text-muted">{p.description}</p>
                    <ol className="m-0 list-decimal pl-4 text-[0.82rem] leading-relaxed text-muted">
                      {shortNames.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      {p.nodeIds.length > 6 ? <li>…共 {p.nodeIds.length} 步</li> : null}
                    </ol>
                    <Link
                      className={buttonClass({
                        variant: 'primary',
                        className:
                          'mt-auto h-10 w-full justify-center rounded-[10px] px-3.5 py-2 text-center leading-snug whitespace-normal',
                      })}
                      to={`/maps/${meta.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(firstId)}`}
                    >
                      <span>
                        从「{firstLabel.length > 12 ? firstLabel.slice(0, 11) + '…' : firstLabel}
                        」开始
                      </span>
                      <em className="text-[0.85em] font-medium not-italic opacity-85">
                        · {p.nodeIds.length} 步
                      </em>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <details className={cn(panelSurface, 'group w-full px-5.5 py-4.5')}>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.95rem] font-semibold [&::-webkit-details-marker]:hidden">
            关于这张地图（规模与类型）
            <span
              className="ml-auto h-2 w-2 shrink-0 rotate-45 border-r-2 border-b-2 border-muted transition-transform duration-200 group-open:rotate-[-135deg]"
              aria-hidden
            />
          </summary>

          <p className="mt-0 mb-0 text-[1.02rem] leading-relaxed font-semibold">
            {meta.stats
              ? `${meta.stats.nodes} 节点 · ${meta.stats.edges} 关系 · ${meta.stats.chapters} 章 · ${meta.stats.concepts} 概念`
              : '暂无规模数据'}
          </p>

          <div className="mt-3.5 grid grid-cols-2 gap-4.5 max-[560px]:grid-cols-1 max-[560px]:gap-3.5">
            <div>
              <h3 className="mb-2.5 text-[0.78rem] tracking-[0.06em] text-muted uppercase">
                节点类型
              </h3>
              <ul className="flex max-w-[300px] list-none flex-col gap-2 p-0 max-[560px]:max-w-none">
                {(Object.keys(NODE_TYPE_LABEL) as NodeType[]).map((ty) => {
                  const n = nodeBreakdown?.[ty] ?? 0;
                  if (!n) return null;
                  return (
                    <li key={ty} className="flex w-full items-center gap-2.5">
                      <Link
                        className="flex w-full items-center gap-2.5 no-underline"
                        to={`/maps/${meta.id}?type=${ty}`}
                      >
                        <Pill tone={ty}>{NODE_TYPE_LABEL[ty]}</Pill>
                        <strong className="tabular-nums">{n}</strong>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="mb-2.5 text-[0.78rem] tracking-[0.06em] text-muted uppercase">
                边类型
              </h3>
              <ul className="flex max-w-[300px] list-none flex-col gap-2 p-0 max-[560px]:max-w-none">
                {Object.entries(edgeBreakdown).map(([ty, n]) => (
                  <li key={ty} className="flex w-full items-center gap-2.5">
                    <Pill>{EDGE_TYPE_LABEL[ty] ?? ty}</Pill>
                    <strong className="tabular-nums">{n}</strong>
                  </li>
                ))}
                {Object.keys(edgeBreakdown).length === 0 ? (
                  <li className="text-[0.85rem] text-muted">暂无边类型统计</li>
                ) : null}
              </ul>
            </div>
          </div>

          <dl className="mt-4 mb-0 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
              <dt className="mb-0.5 text-[0.72rem] text-muted">生成日期</dt>
              <dd className="text-[0.92rem] font-semibold break-words">
                {formatGeneratedDate(meta.generatedAt)}
              </dd>
            </div>
            <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
              <dt className="mb-0.5 text-[0.72rem] text-muted">源文件</dt>
              <dd className="text-[0.92rem] font-semibold break-words">
                {meta.source?.file || '—'}
              </dd>
            </div>
            {meta.version ? (
              <div className="rounded-inner border border-line bg-surface-2 px-3.5 py-3">
                <dt className="mb-0.5 text-[0.72rem] text-muted">地图版本</dt>
                <dd className="text-[0.92rem] font-semibold break-words">{meta.version}</dd>
              </div>
            ) : null}
          </dl>
        </details>
      </main>
    </div>
  );
}
