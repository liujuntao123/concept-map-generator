import { useCallback, useEffect, useImperativeHandle, useMemo, forwardRef } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import GraphNode from './GraphNode';
import { layoutWithDagre } from '../lib/layout';
import {
  chapterSubgraphIds,
  edgeTypeColor,
  matchesQuery,
  neighborsOf,
  nodeTypeColor,
} from '../lib/graphUtils';
import type { ConceptGraph, MapEdge, MapNode, NodeType } from '../types/graph';

const nodeTypes: NodeTypes = {
  chapter: GraphNode,
  concept: GraphNode,
  claim: GraphNode,
  person: GraphNode,
  work: GraphNode,
};

export type TypeFilter = 'all' | NodeType;

export interface MapCanvasHandle {
  fitView: () => void;
  focusSelected: () => void;
}

export interface VisibleStats {
  hitCount: number;
  visibleCount: number;
  totalCount: number;
}

interface Props {
  graph: ConceptGraph;
  filter: TypeFilter;
  query: string;
  chapterFocusId: string | null;
  onSelect: (node: MapNode | null) => void;
  onSelectEdge: (edge: MapEdge | null) => void;
  selectedId: string | null;
  selectedEdgeId: string | null;
  highlightPathIds?: string[] | null;
  onVisibleStats?: (stats: VisibleStats) => void;
}

function MapCanvasInner(
  {
    graph,
    filter,
    query,
    chapterFocusId,
    onSelect,
    onSelectEdge,
    selectedId,
    selectedEdgeId,
    highlightPathIds,
    onVisibleStats,
  }: Props,
  ref: React.Ref<MapCanvasHandle>,
) {
  const { fitView, setCenter, getNode, getZoom } = useReactFlow();

  const byId = useMemo(() => {
    const m = new Map<string, MapNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const n of graph.nodes) m.set(n.id, new Set());
    for (const e of graph.edges) {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    }
    return m;
  }, [graph]);

  const neighborSet = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return neighborsOf(adj, selectedId);
  }, [adj, selectedId]);

  const pathSet = useMemo(() => {
    if (!highlightPathIds?.length) return null;
    return new Set(highlightPathIds);
  }, [highlightPathIds]);

  const { initialNodes, initialEdges, hitIds, visibleIds } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let focusIds: Set<string> | null = null;
    if (chapterFocusId) {
      focusIds = chapterSubgraphIds(graph, chapterFocusId, adj);
    }

    const hits = new Set(
      graph.nodes
        .filter((n) => (filter === 'all' ? true : n.type === filter))
        .filter((n) => (focusIds ? focusIds.has(n.id) : true))
        .filter((n) => matchesQuery(n, q))
        .map((n) => n.id),
    );

    const visible = new Set(hits);

    // Keep selected node visible even if type filter would hide it (deep link)
    if (selectedId && byId.has(selectedId)) {
      if (!focusIds || focusIds.has(selectedId)) {
        visible.add(selectedId);
      }
    }

    // when searching, keep 1-hop context for matched nodes (mark separately)
    const contextIds = new Set<string>();
    if (q) {
      for (const id of hits) {
        for (const nb of adj.get(id) ?? []) {
          if (filter !== 'all') {
            const nbNode = byId.get(nb);
            if (nbNode && nbNode.type !== filter && nb !== selectedId) continue;
          }
          if (!focusIds || focusIds.has(nb)) {
            if (!hits.has(nb)) contextIds.add(nb);
            visible.add(nb);
          }
        }
      }
    }

    const rfNodes: Node[] = graph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        const isSel = n.id === selectedId;
        const isNb = neighborSet.has(n.id);
        const isHit = Boolean(q && hits.has(n.id));
        const isCtx = Boolean(q && contextIds.has(n.id));
        const dimmed = Boolean(
          (selectedId && !isSel && !isNb && !isHit) ||
            (pathSet && !pathSet.has(n.id) && !isSel) ||
            (q && isCtx && !isSel),
        );
        return {
          id: n.id,
          type: n.type,
          position: { x: 0, y: 0 },
          data: {
            label: n.label,
            nodeType: n.type,
            dimmed,
            neighbor: Boolean(selectedId && isNb),
            searchHit: isHit,
            searchContext: isCtx,
          },
          selected: isSel,
        };
      });

    const rfEdges: Edge[] = graph.edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e) => {
        const touchesSel =
          selectedId != null && (e.source === selectedId || e.target === selectedId);
        const inPath =
          pathSet != null && pathSet.has(e.source) && pathSet.has(e.target);
        const dimmed = Boolean(
          (selectedId && !touchesSel) || (pathSet && !inPath && !touchesSel),
        );
        const selected = e.id === selectedEdgeId;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: 'default',
          animated: e.type === 'contrasts' || e.type === 'cites',
          className: [dimmed ? 'is-dimmed' : '', touchesSel || selected ? 'is-hl' : '']
            .filter(Boolean)
            .join(' '),
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: {
            stroke: selected ? 'var(--accent)' : edgeTypeColor(String(e.type)),
            strokeWidth: selected || touchesSel ? 2.2 : 1.2,
          },
          labelStyle: { fill: 'var(--muted)', fontSize: 10 },
          labelBgStyle: { fill: 'var(--bg-elev)', fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          data: { edge: e },
        };
      });

    const laid = layoutWithDagre(rfNodes, rfEdges, 'TB');
    return {
      initialNodes: laid,
      initialEdges: rfEdges,
      hitIds: hits,
      visibleIds: visible,
    };
  }, [
    graph,
    filter,
    query,
    chapterFocusId,
    adj,
    selectedId,
    selectedEdgeId,
    neighborSet,
    pathSet,
    byId,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    onVisibleStats?.({
      hitCount: hitIds.size,
      visibleCount: visibleIds.size,
      totalCount: graph.nodes.length,
    });
  }, [hitIds, visibleIds, graph.nodes.length, onVisibleStats]);

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => {
        void fitView({ padding: 0.15, duration: 300 });
      },
      focusSelected: () => {
        if (!selectedId) {
          void fitView({ padding: 0.15, maxZoom: 0.9, duration: 300 });
          return;
        }
        const n = getNode(selectedId);
        if (n) {
          const w = n.measured?.width ?? 180;
          const h = n.measured?.height ?? 56;
          void setCenter(n.position.x + w / 2, n.position.y + h / 2, {
            zoom: 1.15,
            duration: 350,
          });
        }
      },
    }),
    [fitView, getNode, selectedId, setCenter],
  );

  // Initial readable zoom: fitView with maxZoom so nodes stay readable
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.18, maxZoom: 0.85, duration: 0 });
    }, 60);
    return () => window.clearTimeout(t);
    // only on graph / filter / focus / query shape changes that relayout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.mapId, filter, chapterFocusId, query, nodes.length]);

  // pan to selected when URL / external select changes
  useEffect(() => {
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      const n = getNode(selectedId);
      if (n) {
        const w = n.measured?.width ?? 180;
        const h = n.measured?.height ?? 56;
        const z = Math.max(getZoom(), 0.9);
        void setCenter(n.position.x + w / 2, n.position.y + h / 2, {
          zoom: Math.min(z, 1.15),
          duration: 350,
        });
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [selectedId, getNode, setCenter, getZoom, nodes.length]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectEdge(null);
      onSelect(byId.get(node.id) ?? null);
    },
    [byId, onSelect, onSelectEdge],
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const mn = byId.get(node.id);
      if (mn?.type === 'chapter') {
        onSelect(mn);
        window.dispatchEvent(
          new CustomEvent('cm-chapter-focus', { detail: { id: mn.id } }),
        );
      }
    },
    [byId, onSelect],
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const raw = (edge.data as { edge?: MapEdge } | undefined)?.edge;
      if (raw) {
        onSelect(null);
        onSelectEdge(raw);
      }
    },
    [onSelect, onSelectEdge],
  );

  const onPaneClick = useCallback(() => {
    onSelect(null);
    onSelectEdge(null);
  }, [onSelect, onSelectEdge]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 0.85 }}
      minZoom={0.12}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={22} size={1} color="var(--rf-bg-dot)" />
      {/* Controls bottom-left — away from MiniMap bottom-right (M1) */}
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        position="bottom-right"
        nodeColor={(n) => nodeTypeColor((n.type as string) || 'concept')}
        maskColor="color-mix(in srgb, var(--bg) 70%, transparent)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

const MapCanvasForward = forwardRef(MapCanvasInner);

export default function MapCanvas(props: Props & { canvasRef?: React.Ref<MapCanvasHandle> }) {
  const { canvasRef, ...rest } = props;
  return (
    <ReactFlowProvider>
      <MapCanvasForward {...rest} ref={canvasRef} />
    </ReactFlowProvider>
  );
}
