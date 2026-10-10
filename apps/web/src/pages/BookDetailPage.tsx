import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchJson } from '../lib/fetchJson';
import { formatGeneratedDate } from '../lib/graphUtils';
import {
  EDGE_TYPE_LABEL,
  NODE_TYPE_LABEL,
  STATUS_LABEL,
  type MapMeta,
  type MapPublishStatus,
  type NodeType,
} from '../types/graph';
import { useTheme } from '../hooks/useTheme';

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.bookId || params.mapId || '';
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchJson<MapMeta>(
          `/maps/${bookId}/meta.json`,
          '无法加载图书详情。请确认图书地址是否正确。',
        );
        if (!cancelled) {
          setMeta(data);
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

  const status = (meta.status ?? 'draft') as MapPublishStatus;

  const nodeBreakdown = meta.nodeTypeBreakdown ?? {
    chapter: meta.stats?.chapters,
    concept: meta.stats?.concepts,
    claim: meta.stats?.claims,
    person: meta.stats?.persons,
    work: meta.stats?.works,
  };

  const edgeBreakdown = meta.edgeTypeBreakdown ?? {};

  const coverText = meta.coverText || meta.title?.trim().slice(0, 1) || '?';

  return (
    <div className="cm-shell">
      <header className="cm-topbar">
        <div className="cm-brand">
          <div className="cm-brand__mark" aria-hidden />
          <div>
            <Link className="cm-back" to="/">
              ← 图书列表
            </Link>
            <h1>图书详情</h1>
            <p>{meta.title}</p>
          </div>
        </div>
        <div className="cm-toolbar">
          <Link className="cm-btn cm-btn--primary" to={`/maps/${meta.id}`}>
            打开地图
          </Link>
          <button
            type="button"
            className="cm-theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main className="cm-book-detail">
        <section className="cm-book-detail__hero">
          <div
            className="cm-book-detail__cover"
            style={{ background: meta.coverColor || 'var(--bg-elev-2)' }}
            aria-hidden
          >
            <span>{coverText}</span>
          </div>
          <div className="cm-book-detail__intro">
            <div className="cm-book-card__badges">
              <span className={`cm-pill cm-pill--status-${status}`} title="发布状态">
                发布状态：{STATUS_LABEL[status]}
              </span>
              {meta.version ? <span className="cm-pill">v{meta.version}</span> : null}
              {meta.schemaVersion ? (
                <span className="cm-pill">schema {meta.schemaVersion}</span>
              ) : null}
            </div>
            <h1>{meta.title}</h1>
            <p className="cm-book-detail__byline">
              {[meta.author, meta.publisher, meta.subtitle].filter(Boolean).join(' · ')}
            </p>
            {meta.description ? <p className="cm-book-detail__desc">{meta.description}</p> : null}
            <div className="cm-book-detail__cta">
              <Link className="cm-btn cm-btn--primary" to={`/maps/${meta.id}`}>
                打开完整地图
              </Link>
              <Link className="cm-btn cm-btn--ghost" to={`/maps/${meta.id}?type=concept`}>
                只看概念
              </Link>
              <Link className="cm-btn cm-btn--ghost" to={`/maps/${meta.id}?type=chapter`}>
                只看章节
              </Link>
            </div>
          </div>
        </section>

        <section className="cm-book-detail__grid">
          <div className="cm-panel">
            <h2>规模概览</h2>
            <p className="cm-scale-line">
              {meta.stats
                ? `${meta.stats.nodes} 节点 · ${meta.stats.edges} 关系 · ${meta.stats.chapters} 章 · ${meta.stats.concepts} 概念`
                : '暂无规模数据'}
            </p>
          </div>

          <div className="cm-panel">
            <h2>节点类型</h2>
            <ul className="cm-breakdown">
              {(Object.keys(NODE_TYPE_LABEL) as NodeType[]).map((t) => {
                const n = nodeBreakdown?.[t] ?? 0;
                if (!n) return null;
                return (
                  <li key={t}>
                    <Link to={`/maps/${meta.id}?type=${t}`}>
                      <span className={`cm-pill cm-pill--${t}`}>{NODE_TYPE_LABEL[t]}</span>
                      <strong>{n}</strong>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="cm-panel">
            <h2>边类型</h2>
            <ul className="cm-breakdown">
              {Object.entries(edgeBreakdown).map(([t, n]) => (
                <li key={t}>
                  <span className="cm-pill">{EDGE_TYPE_LABEL[t] ?? t}</span>
                  <strong>{n}</strong>
                </li>
              ))}
              {Object.keys(edgeBreakdown).length === 0 ? (
                <li className="cm-muted">暂无边类型统计</li>
              ) : null}
            </ul>
          </div>

          <div className="cm-panel">
            <h2>来源与溯源</h2>
            <dl className="cm-dl cm-dl--stacked">
              <div>
                <dt>源文件</dt>
                <dd>{meta.source?.file || meta.ima?.file_name?.toString() || '—'}</dd>
              </div>
              <div>
                <dt>类型</dt>
                <dd>{meta.source?.kind || '—'}</dd>
              </div>
              <div>
                <dt>IMA 知识库</dt>
                <dd>{meta.source?.imaKb || meta.ima?.kb_name?.toString() || '—'}</dd>
              </div>
              <div>
                <dt>生成时间</dt>
                <dd>{formatGeneratedDate(meta.generatedAt)}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{formatGeneratedDate(meta.createdAt)}</dd>
              </div>
              {meta.isbn ? (
                <div>
                  <dt>ISBN</dt>
                  <dd>{meta.isbn}</dd>
                </div>
              ) : null}
              {meta.language ? (
                <div>
                  <dt>语言</dt>
                  <dd>{meta.language}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        {meta.featuredPaths && meta.featuredPaths.length > 0 ? (
          <section className="cm-panel cm-panel--wide">
            <h2>推荐阅读路径</h2>
            <div className="cm-path-cards">
              {meta.featuredPaths.map((p) => (
                <Link
                  key={p.id}
                  className="cm-path-card"
                  to={`/maps/${meta.id}?node=${encodeURIComponent(p.nodeIds[0] || '')}`}
                >
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <span>{p.nodeIds.length} 个节点</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
