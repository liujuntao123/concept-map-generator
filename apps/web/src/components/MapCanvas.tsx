import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react';
import {
  Background,
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
import { layoutPathSpine, layoutWithDagre } from '../lib/layout';
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

const READABLE_MIN_ZOOM = 0.8;

export type TypeFilter = 'all' | NodeType;

export interface MapCanvasHandle {
  fitView: () => void;
  focusSelected: () => void;
  focusNeighborhood: (ids: string[]) => void;
  zoomIn: () => void;
  zoomOut: () => void;
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
  const { fitView, getNode, getZoom, setViewport, getViewport, zoomIn, zoomOut, setCenter } =
    useReactFlow();
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
    highlightPathIds?.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [highlightPathIds]);

  const currentPathNodeId =
    pathStepIndex != null && highlightPathIds?.[pathStepIndex]
      ? highlightPathIds[pathStepIndex]
      : null;

  const focusIds = useMemo(() => {
    if (!chapterFocusId) return null;
    return chapterSubgraphIds(graph, chapterFocusId, adj);
  }, [graph, chapterFocusId, adj]);

  const neighborhoodSet = useMemo(() => {
    if (pathSet) return pathSet;
    if (!selectedId) return null;
    return new Set<string>([selectedId, ...neighborSet]);
  }, [selectedId, neighborSet, pathSet]);

  const { initialNodes, initialEdges, hitIds, visibleIds } = useMemo(() => {
    const q = query.trim().toLowerCase();

    let candidate = graph.nodes;
    if (pathSet) {
      candidate = graph.nodes.filter((n) => pathSet.has(n.id));
    }

    const hits = new Set(
      candidate
        .filter((n) => (filter === 'all' ? true : n.type === filter))
        .filter((n) => (focusIds && !pathSet ? focusIds.has(n.id) : true))
        .filter((n) => matchesQuery(n, q))
        .map((n) => n.id),
    );

    const visible = new Set(hits);
    if (pathSet) {
      for (const id of pathSet) if (byId.has(id)) visible.add(id);
    }

    const contextIds = new Set<string>();
    if (q && !pathSet) {
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
        const isSel = n.id === selectedId || n.id === currentPathNodeId;
        const isNb = neighborSet.has(n.id);
        const isHit = Boolean(q && hits.has(n.id));
        const isCtx = Boolean(q && contextIds.has(n.id));
        const inFocus = focusIds ? focusIds.has(n.id) : true;
        const inNbhd = neighborhoodSet ? neighborhoodSet.has(n.id) : true;
        // Ux3-6: do NOT dim nodes inside focused chapter
        const dimmed = Boolean(
          (pathSet && n.id !== currentPathNodeId && !isSel) ||
            (!pathSet && neighborhoodSet && !inNbhd && !isHit && !(focusIds && inFocus)) ||
            (!pathSet && selectedId && !isSel && !isNb && !isHit && !focusIds) ||
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
          selected: isSel,
          draggable: false,
          connectable: false,
        };
      });

    const showContains =
      showStructuralEdges || Boolean(chapterFocusId);

    // --- Edges ---
    const rfEdges: Edge[] = [];

    if (pathSet && highlightPathIds && highlightPathIds.length >= 2) {
      // Ux3-2: spine edges in step order; invent「下一步」when missing
      for (let i = 0; i < highlightPathIds.length - 1; i++) {
        const a = highlightPathIds[i];
        const b = highlightPathIds[i + 1];
        if (!visible.has(a) || !visible.has(b)) continue;
        const existing = graph.edges.find(
          (e) =>
            (e.source === a && e.target === b) || (e.source === b && e.target === a),
        );
        const isCurrentStep = pathStepIndex === i || pathStepIndex === i + 1;
        const synId = `path-next:${a}>${b}`;
        const raw: MapEdge = existing
          ? { ...existing, source: a, target: b }
          : {
              id: synId,
              source: a,
              target: b,
              type: 'related',
              label: '下一步',
            };
        const selected = raw.id === selectedEdgeId || (!existing && selectedEdgeId === synId);
        const showLabel = true;
        rfEdges.push({
          id: existing?.id ?? synId,
          source: a,
          target: b,
          label: showLabel ? (existing?.label ?? '下一步') : undefined,
          type: 'smoothstep',
          animated: false,
          interactionWidth: 16,
          zIndex: 25,
          className: [
            'is-path-edge',
            !existing ? 'is-path-synthetic' : '',
            isCurrentStep || selected ? 'is-hl' : 'is-path-dim',
            `cm-edge--${raw.type}`,
          ]
            .filter(Boolean)
            .join(' '),
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
          style: {
            stroke: selected || isCurrentStep ? 'var(--accent)' : edgeTypeColor(String(raw.type)),
            strokeWidth: selected || isCurrentStep ? 2.8 : 2,
            strokeDasharray: existing ? undefined : '5 5',
            opacity: isCurrentStep || selected ? 1 : 0.45,
          },
          labelStyle: { fill: 'var(--text)', fontSize: 11, fontWeight: 650 },
          labelBgStyle: { fill: 'var(--bg-elev)', fillOpacity: 0.96 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 4,
          data: { edge: raw },
        });
      }
    } else {
      for (const e of graph.edges) {
        if (!visible.has(e.source) || !visible.has(e.target)) continue;
        if (isStructuralEdge(e) && !showContains) continue;
        const structural = isStructuralEdge(e);
        const touchesSel =
          selectedId != null && (e.source === selectedId || e.target === selectedId);
        const inNbhd = Boolean(
          neighborhoodSet &&
            neighborhoodSet.has(e.source) &&
            neighborhoodSet.has(e.target),
        );
        const selected = e.id === selectedEdgeId;
        const hovered = e.id === hoveredEdgeId;
        const showLabel = selected || hovered || touchesSel;
        const farFade = Boolean(neighborhoodSet && !inNbhd && !touchesSel && !focusIds);
        const dimmed = Boolean(
          structural || (selectedId && !touchesSel) || farFade,
        );
        const stroke =
          selected || hovered || touchesSel
            ? 'var(--accent)'
            : edgeTypeColor(String(e.type));
        const strokeDasharray =
          e.type === 'contrasts' ? '6 4' : e.type === 'cites' ? '2 3' : undefined;
        rfEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          label: showLabel ? e.label : undefined,
          type: 'smoothstep',
          animated: false,
          interactionWidth: 16,
          zIndex: selected || hovered || touchesSel ? 20 : farFade ? 0 : 2,
          className: [
            dimmed ? 'is-dimmed' : '',
            farFade ? 'is-far' : '',
            structural ? 'is-structural' : '',
            touchesSel || selected ? 'is-hl' : '',
            `cm-edge--${e.type}`,
          ]
            .filter(Boolean)
            .join(' '),
          markerEnd: structural
            ? undefined
            : { type: MarkerType.ArrowClosed, width: 12, height: 12 },
          style: {
            stroke,
            strokeWidth: selected || touchesSel ? 2.6 : structural ? 1.2 : 1.5,
            strokeDasharray,
            opacity: structural ? 0.28 : farFade ? 0.1 : dimmed ? 0.32 : 1,
          },
          labelStyle: { fill: 'var(--text)', fontSize: 11, fontWeight: 650 },
          labelBgStyle: { fill: 'var(--bg-elev)', fillOpacity: 0.96 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 4,
          data: { edge: e },
        });
      }
    }

    const laid = pathSet && highlightPathIds
      ? layoutPathSpine(rfNodes, highlightPathIds)
      : layoutWithDagre(rfNodes, rfEdges, 'TB');

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
    focusIds,
    adj,
    selectedId,
    selectedEdgeId,
    neighborSet,
    pathSet,
    pathIndex,
    pathStepIndex,
    highlightPathIds,
    currentPathNodeId,
    neighborhoodSet,
    byId,
    showStructuralEdges,
    hoveredEdgeId,
    chapterFocusId,
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
        padding: 0.32,
        minZoom: READABLE_MIN_ZOOM,
        maxZoom: 1.15,
        duration,
      }).then(() => {
        if (getZoom() < READABLE_MIN_ZOOM) {
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
        padding: 0.48,
        minZoom: READABLE_MIN_ZOOM,
        maxZoom: 1.35,
        duration: 360,
      });
    },
    [fitView, getNode, fitReadable],
  );

  const zoomTowardSelection = useCallback(
    (dir: 'in' | 'out') => {
      const factor = dir === 'in' ? 1.2 : 1 / 1.2;
      if (selectedId) {
        const n = getNode(selectedId);
        if (n) {
          const w = n.measured?.width ?? 180;
          const h = n.measured?.height ?? 56;
          const next = Math.min(2, Math.max(0.12, getZoom() * factor));
          void setCenter(n.position.x + w / 2, n.position.y + h / 2, {
            zoom: next,
            duration: 180,
          });
          return;
        }
      }
      if (dir === 'in') void zoomIn({ duration: 180 });
      else void zoomOut({ duration: 180 });
    },
    [selectedId, getNode, getZoom, setCenter, zoomIn, zoomOut],
  );

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => fitReadable(300),
      focusSelected: () => {
        if (!selectedId) {
          fitReadable(300);
          return;
        }
        focusNeighborhood([selectedId, ...neighborSet]);
      },
      focusNeighborhood,
      zoomIn: () => zoomTowardSelection('in'),
      zoomOut: () => zoomTowardSelection('out'),
    }),
    [fitReadable, selectedId, neighborSet, focusNeighborhood, zoomTowardSelection],
  );

  useEffect(() => {
    if (selectedId || pathSet) return;
    const t = window.setTimeout(() => fitReadable(0), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.mapId, filter, chapterFocusId, query, nodes.length]);

  useEffect(() => {
    if (pathSet && highlightPathIds?.length) {
      // Ux3-3: frame current step (and adjacent) so phone + drawer leave map readable
      const cur =
        pathStepIndex != null && highlightPathIds[pathStepIndex]
          ? highlightPathIds[pathStepIndex]
          : highlightPathIds[0];
      const ids = [cur];
      if (pathStepIndex != null && pathStepIndex > 0) ids.unshift(highlightPathIds[pathStepIndex - 1]);
      if (pathStepIndex != null && pathStepIndex < highlightPathIds.length - 1)
        ids.push(highlightPathIds[pathStepIndex + 1]);
      const t = window.setTimeout(() => focusNeighborhood(ids), 120);
      return () => window.clearTimeout(t);
    }
    if (selectedEdgeId) {
      let e = graph.edges.find((x) => x.id === selectedEdgeId);
      if (!e && selectedEdgeId.startsWith('path-next:')) {
        const body = selectedEdgeId.slice('path-next:'.length);
        const [sa, sb] = body.split('>');
        if (sa && sb) e = { id: selectedEdgeId, source: sa, target: sb, type: 'related', label: '下一步' };
      }
      if (e) {
        const t = window.setTimeout(
          () => focusNeighborhood([e!.source, e!.target]),
          120,
        );
        return () => window.clearTimeout(t);
      }
    }
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      focusNeighborhood([selectedId, ...neighborsOf(adj, selectedId)]);
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedEdgeId, highlightPathIds?.join('|'), pathStepIndex, nodes.length]);

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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        className="cm-flow"
        onInit={() => {
          if (highlightPathIds?.length) {
            const cur =
              pathStepIndex != null && highlightPathIds[pathStepIndex]
                ? highlightPathIds[pathStepIndex]
                : highlightPathIds[0];
            focusNeighborhood([cur]);
          } else if (selectedId)
            focusNeighborhood([selectedId, ...neighborsOf(adj, selectedId)]);
          else fitReadable(0);
        }}
      >
        <Background gap={22} size={1} color="var(--rf-bg-dot)" />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            if (currentPathNodeId && n.id === currentPathNodeId) return 'var(--accent)';
            if (pathSet?.has(n.id)) return 'var(--claim)';
            if (chapterFocusId && n.id === chapterFocusId) return 'var(--accent)';
            if (focusIds?.has(n.id)) return nodeTypeColor((n.type as string) || 'concept');
            return nodeTypeColor((n.type as string) || 'concept');
          }}
          maskColor="color-mix(in srgb, var(--bg) 55%, transparent)"
          pannable
          zoomable
          className="cm-minimap"
        />
      </ReactFlow>
      <div className="cm-zoom-controls" role="group" aria-label="缩放">
        <button type="button" className="cm-btn" onClick={() => zoomTowardSelection('in')}>
          放大
        </button>
        <button type="button" className="cm-btn" onClick={() => zoomTowardSelection('out')}>
          缩小
        </button>
        <button type="button" className="cm-btn" onClick={() => fitReadable(300)}>
          适配可见
        </button>
        <button
          type="button"
          className="cm-btn"
          onClick={() => {
            if (selectedId) focusNeighborhood([selectedId, ...neighborSet]);
            else if (highlightPathIds?.length) focusNeighborhood(highlightPathIds);
            else fitReadable(300);
          }}
        >
          聚焦邻域
        </button>
      </div>
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
