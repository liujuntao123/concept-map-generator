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
      <div className="cm-shell cm-shell--center">
        <p className="cm-error">{error}</p>
        <Link to="/">返回图书列表</Link>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="cm-shell cm-shell--center">
        <p className="cm-loading">正在加载图书详情…</p>
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
    <div className="cm-shell cm-shell--simple">
      <header className="cm-topbar cm-topbar--detail">
        <div className="cm-brand cm-brand--detail">
          <Link className="cm-back-link" to="/">
            <IconChevronLeft size={14} /> 图书列表
          </Link>
          <div className="cm-brand__mark" aria-hidden />
          <div className="cm-brand__text">
            <h1>图书简介</h1>
            <p>{meta.title}</p>
          </div>
        </div>
        <div className="cm-toolbar">
          <button
            type="button"
            className="cm-icon-btn cm-theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <main className="cm-book-detail">
        <section className="cm-book-detail__hero" data-book={meta.id}>
          <div className="cm-book-detail__cover cm-book-detail__cover--plate" aria-hidden>
            <img src={coverOf(meta.id)} alt="" width={180} height={240} />
          </div>
          <div className="cm-book-detail__intro">
            {byline ? (
              <div className="cm-book-card__badges">
                <span className="cm-pill">{byline}</span>
              </div>
            ) : null}
            <h1>{meta.title}</h1>
            {meta.subtitle && meta.subtitle !== meta.title ? (
              <p className="cm-book-detail__subtitle">{meta.subtitle}</p>
            ) : null}
            <p className="cm-book-detail__desc">
              {meta.description ||
                '这本书被整理成可交互的概念地图：可从章节走进概念与主张，边旁有原文摘录。'}
            </p>
            <div className="cm-book-detail__cta">
              <Link className="cm-btn cm-btn--primary" to={`/maps/${meta.id}?view=all`}>
                <IconMap size={14} /> 进入地图
              </Link>
              {meta.featuredPaths?.[0] ? (
                <Link
                  className="cm-btn cm-btn--ghost"
                  to={`/maps/${meta.id}?path=${encodeURIComponent(meta.featuredPaths[0].id)}&step=0&node=${encodeURIComponent(meta.featuredPaths[0].nodeIds[0] || '')}`}
                >
                  <IconPath size={14} /> 从推荐路径开始
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {meta.featuredPaths && meta.featuredPaths.length > 0 ? (
          <section className="cm-panel cm-panel--wide">
            <h2>推荐阅读路径</h2>
            <div className="cm-path-cards">
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
                  <div key={p.id} className="cm-path-card">
                    <h3>{p.theme || p.title}</h3>
                    <p className="cm-path-card__meta">
                      {p.difficulty || '入门'}
                      {p.durationMin ? ` · 约 ${p.durationMin} 分钟` : ''}
                      {p.arc ? ` · ${p.arc}` : ''}
                    </p>
                    <p>{p.description}</p>
                    <ol className="cm-path-card__steps">
                      {shortNames.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      {p.nodeIds.length > 6 ? <li>…共 {p.nodeIds.length} 步</li> : null}
                    </ol>
                    <Link
                      className="cm-btn cm-btn--primary cm-path-card__start"
                      to={`/maps/${meta.id}?path=${encodeURIComponent(p.id)}&step=0&node=${encodeURIComponent(firstId)}`}
                    >
                      <span>
                        从「{firstLabel.length > 12 ? firstLabel.slice(0, 11) + '…' : firstLabel}」开始
                      </span>
                      <em>{p.nodeIds.length} 步</em>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <details className="cm-panel cm-panel--wide cm-about-fold">
          <summary>关于这张地图（规模与类型）</summary>
          <p className="cm-scale-line">
            {meta.stats
              ? `${meta.stats.nodes} 节点 · ${meta.stats.edges} 关系 · ${meta.stats.chapters} 章 · ${meta.stats.concepts} 概念`
              : '暂无规模数据'}
          </p>
          <div className="cm-book-detail__grid">
            <div>
              <h3>节点类型</h3>
              <ul className="cm-breakdown">
                {(Object.keys(NODE_TYPE_LABEL) as NodeType[]).map((ty) => {
                  const n = nodeBreakdown?.[ty] ?? 0;
                  if (!n) return null;
                  return (
                    <li key={ty}>
                      <Link to={`/maps/${meta.id}?type=${ty}`}>
                        <span className={`cm-pill cm-pill--${ty}`}>{NODE_TYPE_LABEL[ty]}</span>
                        <strong>{n}</strong>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3>边类型</h3>
              <ul className="cm-breakdown">
                {Object.entries(edgeBreakdown).map(([ty, n]) => (
                  <li key={ty}>
                    <span className="cm-pill">{EDGE_TYPE_LABEL[ty] ?? ty}</span>
                    <strong>{n}</strong>
                  </li>
                ))}
                {Object.keys(edgeBreakdown).length === 0 ? (
                  <li className="cm-muted">暂无边类型统计</li>
                ) : null}
              </ul>
            </div>
          </div>
          <dl className="cm-meta-grid">
            <div>
              <dt>生成日期</dt>
              <dd>{formatGeneratedDate(meta.generatedAt)}</dd>
            </div>
            <div>
              <dt>源文件</dt>
              <dd>{meta.source?.file || '—'}</dd>
            </div>
            {meta.version ? (
              <div>
                <dt>地图版本</dt>
                <dd>{meta.version}</dd>
              </div>
            ) : null}
          </dl>
        </details>
      </main>
    </div>
  );
}
