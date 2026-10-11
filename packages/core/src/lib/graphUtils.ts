import type { ConceptGraph, MapEdge, MapNode, NodeType } from '../types/graph';

export function buildAdjacency(graph: ConceptGraph) {
  const adj = new Map<string, Set<string>>();
  const edgeByPair = new Map<string, MapEdge[]>();
  for (const n of graph.nodes) adj.set(n.id, new Set());
  for (const e of graph.edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
    const k1 = `${e.source}|${e.target}`;
    const k2 = `${e.target}|${e.source}`;
    if (!edgeByPair.has(k1)) edgeByPair.set(k1, []);
    edgeByPair.get(k1)!.push(e);
    if (k1 !== k2) {
      if (!edgeByPair.has(k2)) edgeByPair.set(k2, []);
      edgeByPair.get(k2)!.push(e);
    }
  }
  return { adj, edgeByPair };
}

export function neighborsOf(adj: Map<string, Set<string>>, id: string): Set<string> {
  return new Set(adj.get(id) ?? []);
}

/** Structural / catalog edges that swamp the default map (contains / 收录 / 包含). */
export function isStructuralEdge(e: MapEdge): boolean {
  if (e.type === 'contains') return true;
  const label = (e.label || '').trim();
  return label === '收录' || label === '包含';
}

export function isSemanticEdge(e: MapEdge): boolean {
  return !isStructuralEdge(e);
}

/**
 * Search index: label / summary / tags / excerpt / chapter name.
 * Intentionally excludes long `content` so shared book-title boilerplate cannot flood results.
 */
export function matchesQuery(n: MapNode, q: string): boolean {
  if (!q) return true;
  const hay = [
    n.label,
    n.summary,
    n.source?.excerpt ?? '',
    n.source?.chapter ?? '',
    ...(n.tags ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return hay.includes(q);
}

/** Best snippet field for a search hit, with optional mark of query. */
export function snippetForQuery(n: MapNode, q: string): string {
  const qq = q.trim().toLowerCase();
  // Prefer label → tags → summary (概要) over excerpt so multi-hit lists are not the same paste
  const fields = [n.label, ...(n.tags ?? []), n.summary, n.source?.excerpt ?? ''];
  const clean = (raw: string) =>
    raw
      .replace(/（[^）]{0,40}）/g, '')
      .replace(/\([^)]{0,40}\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  for (const f of fields) {
    if (!f) continue;
    if (!qq || f.toLowerCase().includes(qq)) {
      let s = clean(f);
      if (!s) continue;
      // Prefer summary when query only hits identical excerpt across nodes
      if (f === n.source?.excerpt && n.summary && n.summary.trim()) {
        const sum = clean(n.summary);
        if (sum && (!qq || sum.toLowerCase().includes(qq) || !s.toLowerCase().includes(qq))) {
          // if excerpt matches but we have summary, and summary also relates or excerpt is generic: use summary
          if (sum.length > 8) s = sum;
        }
      }
      if (s.length <= 96) return s;
      if (!qq) return s.slice(0, 94) + '…';
      const i = s.toLowerCase().indexOf(qq);
      if (i < 0) return s.slice(0, 94) + '…';
      const start = Math.max(0, i - 24);
      const end = Math.min(s.length, i + qq.length + 48);
      return (start > 0 ? '…' : '') + s.slice(start, end) + (end < s.length ? '…' : '');
    }
  }
  return clean(n.summary || n.label || '').slice(0, 96);
}

/** Normalize reader-facing prose: collapse spacing and stray punctuation. */
function normalizeProse(raw: string): string {
  return (raw || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[。！？：:，,、\s]+/u, '')
    .replace(/[。！？：:]\s*[。！？：:]+/gu, '。')
    .trim();
}

/**
 * Argument-level body for the drawer.
 * Hide when empty, equal to summary, or merely repeating the excerpt.
 */
export function readerBody(n: MapNode): string | null {
  const cleaned = normalizeProse(n.content ?? '');
  if (!cleaned || /^[。！？：:\s]*$/u.test(cleaned)) return null;

  const summary = (n.summary ?? '').trim();
  if (cleaned === summary) return null;
  if (summary && cleaned.includes(summary) && cleaned.length < summary.length + 12) return null;

  const excerpt = (n.source?.excerpt ?? '').trim();
  if (excerpt.length > 20) {
    // content is a slice of the quote → nothing new to show
    if (excerpt.includes(cleaned)) return null;
    // content wraps the quote → keep only the framing sentences
    if (cleaned.includes(excerpt)) {
      let rest = cleaned.replace(excerpt, '').trim();
      const first = excerpt.split(/[。！？]/)[0];
      if (first && first.length > 12) rest = rest.replace(first, '').trim();
      rest = rest.replace(/^[。！？：:，,、\s]+/u, '').trim();
      if (!rest || rest.length < 24) return null;
      return rest;
    }
  }
  return cleaned;
}

export function hasDistinctContent(n: MapNode): boolean {
  return readerBody(n) != null;
}

/**
 * Chapter focus: chapter + 1-hop (all) + semantic neighbors of those 1-hop nodes
 * so focus is not just the contains tree.
 */
export function chapterSubgraphIds(
  graph: ConceptGraph,
  chapterId: string,
  adj: Map<string, Set<string>>,
): Set<string> {
  const ids = new Set<string>([chapterId]);
  const direct = adj.get(chapterId) ?? new Set();
  for (const id of direct) ids.add(id);

  const semanticAdj = new Map<string, Set<string>>();
  for (const n of graph.nodes) semanticAdj.set(n.id, new Set());
  for (const e of graph.edges) {
    if (isStructuralEdge(e)) continue;
    semanticAdj.get(e.source)?.add(e.target);
    semanticAdj.get(e.target)?.add(e.source);
  }
  const base = [...ids];
  for (const id of base) {
    for (const nb of semanticAdj.get(id) ?? []) ids.add(nb);
  }
  return ids;
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function nodeTypeColor(type: NodeType | string): string {
  switch (type) {
    case 'chapter':
      return readCssVar('--chapter', '#5b8fd4');
    case 'concept':
      return readCssVar('--concept', '#6fbf86');
    case 'claim':
      return readCssVar('--claim', '#e0a86a');
    case 'person':
      return readCssVar('--person', '#c59bdb');
    case 'work':
      return readCssVar('--work', '#6bb8c9');
    default:
      return readCssVar('--muted', '#8b9bb4');
  }
}

export function edgeTypeColor(type: string): string {
  switch (type) {
    case 'contains':
      return readCssVar('--edge-contains', readCssVar('--chapter', '#5b8fd4'));
    case 'contrasts':
      return readCssVar('--edge-contrasts', readCssVar('--claim', '#e0a86a'));
    case 'cites':
      return readCssVar('--edge-cites', readCssVar('--work', '#6bb8c9'));
    default:
      return readCssVar('--edge-related', readCssVar('--muted', '#6b7c93'));
  }
}

export function relatedFor(
  graph: ConceptGraph,
  nodeId: string,
): Array<{ node: MapNode; edge: MapEdge; direction: 'out' | 'in' }> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out: Array<{ node: MapNode; edge: MapEdge; direction: 'out' | 'in' }> = [];
  for (const e of graph.edges) {
    if (e.source === nodeId && byId.has(e.target)) {
      out.push({ node: byId.get(e.target)!, edge: e, direction: 'out' });
    } else if (e.target === nodeId && byId.has(e.source)) {
      out.push({ node: byId.get(e.source)!, edge: e, direction: 'in' });
    }
  }
  // Prefer semantic relations first
  out.sort((a, b) => Number(isStructuralEdge(a.edge)) - Number(isStructuralEdge(b.edge)));
  return out;
}

export function formatGeneratedAt(iso?: string): string {
  if (!iso) return '未知';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + ' (CST)';
  } catch {
    return iso;
  }
}

/** Date-only for reader UI (U11). */
export function formatGeneratedDate(iso?: string): string {
  if (!iso) return '未知';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch {
    return iso;
  }
}

export function dedupeTags(type: NodeType | string, tags: string[] | undefined): string[] {
  const typeLabel: Record<string, string> = {
    chapter: '章节',
    concept: '概念',
    claim: '主张',
    person: '人物',
    work: '著作',
  };
  const skip = new Set(
    [type, typeLabel[type], String(type)].filter(Boolean).map((s) => s.toLowerCase()),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags ?? []) {
    const key = t.trim().toLowerCase();
    if (!key || skip.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(t.trim());
  }
  return out;
}

/** Group chapters under 辑* parents when present in label order. */
export function groupChapters(chapters: MapNode[]): Array<{ group: string; items: MapNode[] }> {
  const groups: Array<{ group: string; items: MapNode[] }> = [];
  let current = { group: '篇目', items: [] as MapNode[] };
  for (const c of chapters) {
    if (/^辑[一二三四五六七八九十\d]/.test(c.label) || c.label === '前记' || c.label === '后记') {
      if (current.items.length) groups.push(current);
      current = { group: c.label, items: [c] };
    } else {
      current.items.push(c);
    }
  }
  if (current.items.length) groups.push(current);
  return groups;
}


/** Natural-language A—relates-to—B for the edge panel (never dump EN type codes). */
export function edgeRelationSentence(
  edge: MapEdge,
  sourceLabel: string,
  targetLabel: string,
): string {
  const typeZh: Record<string, string> = {
    related: '相关',
    contains: '包含',
    contrasts: '对照',
    cites: '引用',
  };
  const kind = typeZh[String(edge.type)] ?? String(edge.type);
  let rel = (edge.label || '').trim() || kind;
  rel = rel.replace(/（原关系类型：[^）]+）/g, '').trim() || kind;
  // synthetic path step
  if (edge.id.startsWith('path-gap:') || rel === '无线') {
    return `路径上「${sourceLabel}」与「${targetLabel}」之间暂无图谱边（无线）。`;
  }
  if (edge.type === 'contains' || rel === '收录' || rel === '包含') {
    return `「${sourceLabel}」里收有「${targetLabel}」。`;
  }
  if (edge.type === 'contrasts' || rel.includes('对照')) {
    return `「${sourceLabel}」与「${targetLabel}」相互对照：${rel === kind ? '一正一反，互为参照' : rel}。`;
  }
  if (edge.type === 'cites') {
    return `「${sourceLabel}」指向 / 引用「${targetLabel}」。`;
  }
  // verb-like labels: 阐发、互依、转向…
  if (rel !== kind) {
    return `「${sourceLabel}」${rel}「${targetLabel}」。`;
  }
  return `「${sourceLabel}」与「${targetLabel}」彼此关联。`;
}
