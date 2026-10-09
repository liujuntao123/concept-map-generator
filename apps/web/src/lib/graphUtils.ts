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

export function matchesQuery(n: MapNode, q: string): boolean {
  if (!q) return true;
  const hay = [
    n.label,
    n.summary,
    n.content,
    n.source?.excerpt ?? '',
    n.source?.chapter ?? '',
    ...(n.tags ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return hay.includes(q);
}

/** Chapter focus: chapter node + all nodes connected by a path of length 1 that are concepts/etc under contains/related */
export function chapterSubgraphIds(
  _graph: ConceptGraph,
  chapterId: string,
  adj: Map<string, Set<string>>,
): Set<string> {
  const ids = new Set<string>([chapterId]);
  const direct = adj.get(chapterId) ?? new Set();
  for (const id of direct) ids.add(id);
  // also include 2-hop concepts that are only connected via those neighbors for richer focus? keep 1-hop for clarity
  // include edges between visible nodes only in canvas filter
  return ids;
}

export function nodeTypeColor(type: NodeType | string): string {
  switch (type) {
    case 'chapter':
      return '#5b8fd4';
    case 'concept':
      return '#6fbf86';
    case 'claim':
      return '#e0a86a';
    case 'person':
      return '#c59bdb';
    case 'work':
      return '#6bb8c9';
    default:
      return '#8b9bb4';
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
