import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react';
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
import MapLegend from './MapLegend';
import { layoutWithDagre } from '../lib/layout';
import {
  chapterSubgraphIds,
  edgeTypeColor,
  isStructuralEdge,
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

const READABLE_MIN_ZOOM = 0.75;

export type TypeFilter = 'all' | NodeType;

export interface MapCanvasHandle {
  fitView: () => void;
  focusSelected: () => void;
  focusNeighborhood: (ids: string[]) => void;
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
  pathStepIndex?: number | null;
  showStructuralEdges?: boolean;
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
    pathStepIndex = null,
    showStructuralEdges = false,
    onVisibleStats,
  }: Props,
  ref: React.Ref<MapCanvasHandle>,
) {
  const { fitView, getNode, getZoom, setViewport, getViewport } = useReactFlow();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

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

  const pathIndex = useMemo(() => {
    const m = new Map<string, number>();
    if (highlightPathIds) {
      highlightPathIds.forEach((id, i) => m.set(id, i + 1));
    }
    return m;
  }, [highlightPathIds]);

  const neighborhoodSet = useMemo(() => {
    if (pathSet) return pathSet;
    if (!selectedId) return null;
    const s = new Set<string>([selectedId, ...neighborSet]);
    return s;
  }, [selectedId, neighborSet, pathSet]);

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

    // Path nodes always visible when touring
    if (pathSet) {
      for (const id of pathSet) {
        if (byId.has(id)) {
          if (filter === 'all' || byId.get(id)!.type === filter) visible.add(id);
          else visible.add(id); // path overrides type filter for tour continuity
        }
      }
    }

    const contextIds = new Set<string>();
    if (q) {
      for (const id of hits) {
        for (const nb of adj.get(id) ?? []) {
          if (filter !== 'all') {
            const nbNode = byId.get(nb);
            if (nbNode && nbNode.type !== filter) continue;
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
        const inNbhd = neighborhoodSet ? neighborhoodSet.has(n.id) : true;
        const dimmed = Boolean(
          (neighborhoodSet && !inNbhd && !isHit) ||
            (selectedId && !isSel && !isNb && !isHit && !pathSet) ||
            (pathSet && !pathSet.has(n.id) && !isSel) ||
            (q && isCtx && !isSel),
        );
        return {
          id: n.id,
          type: n.type,
          position: { x: 0, y: 0 },
          zIndex: isSel || pathIndex.has(n.id) ? 10 : isNb ? 5 : 1,
          data: {
            label: n.label,
            nodeType: n.type,
            dimmed,
            neighbor: Boolean(selectedId && isNb),
            searchHit: isHit,
            searchContext: isCtx,
            pathStep: pathIndex.get(n.id) ?? null,
          },
          selected: isSel || (pathStepIndex != null && highlightPathIds?.[pathStepIndex] === n.id),
        };
      });

    const rfEdges: Edge[] = graph.edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .filter((e) => showStructuralEdges || !isStructuralEdge(e))
      .map((e) => {
        const structural = isStructuralEdge(e);
        const touchesSel =
          selectedId != null && (e.source === selectedId || e.target === selectedId);
        const inPath =
          pathSet != null && pathSet.has(e.source) && pathSet.has(e.target);
        const inNbhd = Boolean(
          neighborhoodSet &&
            neighborhoodSet.has(e.source) &&
            neighborhoodSet.has(e.target),
        );
        const selected = e.id === selectedEdgeId;
        const hovered = e.id === hoveredEdgeId;
        const showLabel = selected || hovered || inPath;
        const farFade = Boolean(neighborhoodSet && !inNbhd && !inPath && !touchesSel);
        const dimmed = Boolean(
          structural ||
            (selectedId && !touchesSel && !inPath) ||
            (pathSet && !inPath && !touchesSel) ||
            farFade,
        );

        const stroke =
          selected || hovered
            ? 'var(--accent)'
            : edgeTypeColor(String(e.type));

        const strokeDasharray =
          e.type === 'contrasts' ? '7 5' : e.type === 'cites' ? '2 4' : undefined;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: showLabel ? e.label : undefined,
          type: 'default',
          animated: e.type === 'contrasts' || e.type === 'cites',
          zIndex: selected || hovered || inPath ? 20 : farFade ? 0 : 2,
          className: [
            dimmed ? 'is-dimmed' : '',
            farFade ? 'is-far' : '',
            structural ? 'is-structural' : '',
            touchesSel || selected || inPath ? 'is-hl' : '',
            `cm-edge--${e.type}`,
          ]
            .filter(Boolean)
            .join(' '),
          markerEnd: structural
            ? undefined
            : { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: {
            stroke,
            strokeWidth: selected || touchesSel || inPath ? 2.4 : structural ? 1 : 1.4,
            strokeDasharray,
            opacity: structural ? 0.18 : farFade ? 0.12 : dimmed ? 0.35 : 1,
          },
          labelStyle: {
            fill: 'var(--text)',
            fontSize: 11,
            fontWeight: 600,
          },
          labelBgStyle: { fill: 'var(--bg-elev)', fillOpacity: 0.95 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 4,
          data: { edge: e },
        };
      });

    // Selected edge on top
    rfEdges.sort((a, b) => {
      const as = a.id === selectedEdgeId ? 1 : 0;
      const bs = b.id === selectedEdgeId ? 1 : 0;
      return as - bs;
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
    pathIndex,
    pathStepIndex,
    highlightPathIds,
    neighborhoodSet,
    byId,
    showStructuralEdges,
    hoveredEdgeId,
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

  const fitReadable = useCallback(
    (duration = 0) => {
      void fitView({
        padding: 0.18,
        minZoom: READABLE_MIN_ZOOM,
        maxZoom: 1.2,
        duration,
      }).then(() => {
        const z = getZoom();
        if (z < READABLE_MIN_ZOOM) {
          const vp = getViewport();
          void setViewport({ ...vp, zoom: READABLE_MIN_ZOOM }, { duration: 0 });
        }
      });
    },
    [fitView, getZoom, getViewport, setViewport],
  );

  const focusNeighborhood = useCallback(
    (ids: string[]) => {
      const present = ids.filter((id) => getNode(id));
      if (!present.length) {
        fitReadable(300);
        return;
      }
      void fitView({
        nodes: present.map((id) => ({ id })),
        padding: 0.35,
        minZoom: READABLE_MIN_ZOOM,
        maxZoom: 1.25,
        duration: 380,
      });
    },
    [fitView, getNode, fitReadable],
  );

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => {
        void fitView({ padding: 0.15, duration: 300 });
      },
      focusSelected: () => {
        if (!selectedId) {
          fitReadable(300);
          return;
        }
        const ids = [selectedId, ...neighborSet];
        focusNeighborhood([...ids]);
      },
      focusNeighborhood,
    }),
    [fitView, fitReadable, selectedId, neighborSet, focusNeighborhood],
  );

  // Cold open default: readable full (or focused) fit
  useEffect(() => {
    if (selectedId || pathSet) return;
    const t = window.setTimeout(() => fitReadable(0), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.mapId, filter, chapterFocusId, query, nodes.length]);

  // U2: auto-fit neighborhood when selection / path changes
  useEffect(() => {
    if (pathSet && highlightPathIds?.length) {
      const t = window.setTimeout(() => {
        focusNeighborhood(highlightPathIds);
      }, 120);
      return () => window.clearTimeout(t);
    }
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      const ids = [selectedId, ...neighborsOf(adj, selectedId)];
      focusNeighborhood([...ids]);
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, highlightPathIds?.join('|'), nodes.length]);

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
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView={false}
        minZoom={0.12}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: READABLE_MIN_ZOOM }}
        proOptions={{ hideAttribution: true }}
        onInit={() => {
          if (selectedId) {
            focusNeighborhood([selectedId, ...neighborsOf(adj, selectedId)]);
          } else if (highlightPathIds?.length) {
            focusNeighborhood(highlightPathIds);
          } else {
            fitReadable(0);
          }
        }}
      >
        <Background gap={22} size={1} color="var(--rf-bg-dot)" />
        <Controls showInteractive={false} position="bottom-left" showFitView={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => nodeTypeColor((n.type as string) || 'concept')}
          maskColor="color-mix(in srgb, var(--bg) 70%, transparent)"
          pannable
          zoomable
        />
      </ReactFlow>
      <MapLegend />
    </>
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
