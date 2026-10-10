import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { NodeType } from '../types/graph';

export function nodeCardSize(type: string | undefined): { width: number; height: number } {
  switch (type as NodeType) {
    case 'chapter':
      return { width: 220, height: 64 };
    case 'claim':
      return { width: 200, height: 72 };
    case 'person':
      return { width: 160, height: 56 };
    case 'work':
      return { width: 170, height: 70 };
    case 'concept':
    default:
      return { width: 168, height: 58 };
  }
}

/**
 * Volume-aware TB layout: prefer short edges by grouping under 辑/章 ranks,
 * using real card sizes so fitView stays readable.
 */
export function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 28,
    ranksep: 64,
    marginx: 32,
    marginy: 32,
    edgesep: 16,
  });

  const sizeById = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    const sz = nodeCardSize(n.type || (n.data as { nodeType?: string } | undefined)?.nodeType);
    sizeById.set(n.id, sz);
    g.setNode(n.id, { width: sz.width, height: sz.height });
  }

  // Prefer structural/path edges for ranking so semantic spans don't stretch the graph
  const rankEdges = edges.filter((e) => {
    const cls = e.className || '';
    return cls.includes('is-structural') || cls.includes('is-path-edge') || cls.includes('cm-edge--contains');
  });
  const useEdges = rankEdges.length ? rankEdges : edges;
  for (const e of useEdges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target, { weight: rankEdges.length ? 2 : 1, minlen: 1 });
    }
  }
  // Still register remaining edges lightly so nodes aren't orphaned without positions links
  if (rankEdges.length) {
    for (const e of edges) {
      if (rankEdges.includes(e)) continue;
      if (g.hasNode(e.source) && g.hasNode(e.target) && !g.hasEdge(e.source, e.target)) {
        g.setEdge(e.source, e.target, { weight: 0.2, minlen: 1 });
      }
    }
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const sz = sizeById.get(n.id) ?? nodeCardSize('concept');
    return {
      ...n,
      position: {
        x: pos.x - sz.width / 2,
        y: pos.y - sz.height / 2,
      },
      style: { ...(n.style || {}), width: sz.width, height: sz.height },
    };
  });
}
