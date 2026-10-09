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

/** True when content is empty or duplicates summary (no dedicated 详述 to show). */
export function hasDistinctContent(n: MapNode): boolean {
  const c = (n.content ?? '').trim();
  if (!c) return false;
  const s = (n.summary ?? '').trim();
  if (c === s) return false;
  // leftover template wrappers should never show
  if (c.includes('属于《') && c.includes('正式正文')) return false;
  return true;
}

/** Chapter focus: chapter node + 1-hop neighbors */
export function chapterSubgraphIds(
  _graph: ConceptGraph,
  chapterId: string,
  adj: Map<string, Set<string>>,
): Set<string> {
  const ids = new Set<string>([chapterId]);
  const direct = adj.get(chapterId) ?? new Set();
  for (const id of direct) ids.add(id);
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
      return readCssVar('--chapter', '#5b8fd4');
    case 'contrasts':
      return readCssVar('--claim', '#e0a86a');
    case 'cites':
      return readCssVar('--work', '#6bb8c9');
    default:
      return readCssVar('--muted', '#6b7c93');
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

/** Tags that merely repeat the node type label (e.g. 章节 on a chapter). */
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
