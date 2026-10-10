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
  const fields = [n.summary, n.source?.excerpt ?? '', n.label, ...(n.tags ?? [])];
  for (const f of fields) {
    if (!f) continue;
    if (!qq || f.toLowerCase().includes(qq)) {
      const s = f.trim();
      if (s.length <= 96) return s;
      if (!qq) return s.slice(0, 94) + '…';
      const i = s.toLowerCase().indexOf(qq);
      if (i < 0) return s.slice(0, 94) + '…';
      const start = Math.max(0, i - 24);
      const end = Math.min(s.length, i + qq.length + 48);
      return (start > 0 ? '…' : '') + s.slice(start, end) + (end < s.length ? '…' : '');
    }
  }
  return (n.summary || n.label || '').slice(0, 96);
}

const BOILERPLATE_RES: RegExp[] = [
  /与「概要」不同[^。]*。?/g,
  /核对接引请看下方摘录[^。]*。?/g,
  /请看下方摘录[^。]*。?/g,
  /文中继续推进[：:]/g,
  /后文还落到[：:]/g,
  /开篇与主线可概括为[：:]/g,
  /其原意可先把握为[：:]/g,
  /因此详述负责[^。]*。?/g,
  /本篇「[^」]+」属于《[^》]+》的正式正文[^。]*。?/g,
];

/** Strip generator UI instructions from node content for reader display. */
export function cleanReaderContent(raw: string): string {
  let c = (raw || '').trim();
  if (!c) return '';
  for (const re of BOILERPLATE_RES) c = c.replace(re, '');
  c = c.replace(/\s{2,}/g, ' ').replace(/^[：:，,、\s]+/, '').trim();
  return c;
}

/**
 * Argument-level body for the drawer.
 * Hide when empty, equal to summary, leftover template, or mostly repeating the excerpt.
 */
export function readerBody(n: MapNode): string | null {
  const cleaned = cleanReaderContent(n.content ?? '');
  if (!cleaned) return null;
  const summary = (n.summary ?? '').trim();
  if (cleaned === summary) return null;
  if (cleaned.includes('属于《') && cleaned.includes('正式正文')) return null;
  const excerpt = (n.source?.excerpt ?? '').trim();
  if (excerpt && excerpt.length > 20) {
    // if cleaned largely embeds excerpt, keep only the non-excerpt framing sentences
    if (cleaned.includes(excerpt.slice(0, Math.min(40, excerpt.length)))) {
      let rest = cleaned.replace(excerpt, '').trim();
      // also strip near-duplicate first sentence of excerpt
      const first = excerpt.split(/[。！？]/)[0];
      if (first && first.length > 12) rest = rest.replace(first, '').trim();
      rest = rest.replace(/^[：:，,、\s]+/, '').trim();
      if (rest.length < 24) return null;
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
