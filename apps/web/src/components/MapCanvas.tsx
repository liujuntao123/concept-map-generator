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
import { chapterSubgraphIds, matchesQuery, neighborsOf, nodeTypeColor } from '../lib/graphUtils';
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
  }: Props,
  ref: React.Ref<MapCanvasHandle>,
) {
  const { fitView, setCenter, getNode } = useReactFlow();

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

  const { initialNodes, initialEdges } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let focusIds: Set<string> | null = null;
    if (chapterFocusId) {
      focusIds = chapterSubgraphIds(graph, chapterFocusId, adj);
    }

    const visible = new Set(
      graph.nodes
        .filter((n) => (filter === 'all' ? true : n.type === filter))
        .filter((n) => (focusIds ? focusIds.has(n.id) : true))
        .filter((n) => matchesQuery(n, q))
        .map((n) => n.id),
    );

    // when searching, keep 1-hop context for matched nodes
    if (q) {
      const extra = new Set<string>();
      for (const id of visible) {
        for (const nb of adj.get(id) ?? []) {
          if (!focusIds || focusIds.has(nb)) extra.add(nb);
        }
      }
      for (const id of extra) visible.add(id);
    }

    const rfNodes: Node[] = graph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        const isSel = n.id === selectedId;
        const isNb = neighborSet.has(n.id);
        const dimmed = Boolean(
          (selectedId && !isSel && !isNb) || (pathSet && !pathSet.has(n.id) && !isSel),
        );
        return {
          id: n.id,
          type: n.type,
          position: { x: 0, y: 0 },
          data: {
            label: n.label,
            nodeType: n.type,
            reviewStatus: n.reviewStatus,
            dimmed,
            neighbor: Boolean(selectedId && isNb),
          },
          selected: isSel,
        };
      });

    const edgeColor = (t: string) => {
      if (t === 'contains') return '#5b8fd4';
      if (t === 'contrasts') return '#e0a86a';
      if (t === 'cites') return '#6bb8c9';
      return '#6b7c93';
    };

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
            stroke: selected ? 'var(--accent)' : edgeColor(String(e.type)),
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
    return { initialNodes: laid, initialEdges: rfEdges };
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
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useImperativeHandle(
    ref,
    () => ({
      fitView: () => {
        void fitView({ padding: 0.15, duration: 300 });
      },
      focusSelected: () => {
        if (!selectedId) {
          void fitView({ padding: 0.15, duration: 300 });
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

  // pan to selected when URL / external select changes
  useEffect(() => {
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      const n = getNode(selectedId);
      if (n) {
        const w = n.measured?.width ?? 180;
        const h = n.measured?.height ?? 56;
        void setCenter(n.position.x + w / 2, n.position.y + h / 2, {
          zoom: 1.05,
          duration: 350,
        });
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [selectedId, getNode, setCenter, nodes.length]);

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
        // parent handles via custom event pattern — call onSelect then dispatch
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
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.12}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={22} size={1} color="var(--rf-bg-dot)" />
      <Controls showInteractive={false} position="bottom-right" />
      <MiniMap
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
