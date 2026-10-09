import { useCallback, useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ChapterNode from './ChapterNode';
import ConceptNode from './ConceptNode';
import { layoutWithDagre } from '../lib/layout';
import type { ConceptGraph, MapNode } from '../types/graph';

const nodeTypes: NodeTypes = {
  chapter: ChapterNode,
  concept: ConceptNode,
};

interface Props {
  graph: ConceptGraph;
  filter: 'all' | 'chapter' | 'concept';
  query: string;
  onSelect: (node: MapNode | null) => void;
  selectedId: string | null;
}

function MapCanvasInner({ graph, filter, query, onSelect, selectedId }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, MapNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = new Set(
      graph.nodes
        .filter((n) => (filter === 'all' ? true : n.type === filter))
        .filter((n) => {
          if (!q) return true;
          return (
            n.label.toLowerCase().includes(q) ||
            n.summary.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
          );
        })
        .map((n) => n.id),
    );

    // keep endpoints if edge connects a visible node to keep local context
    for (const e of graph.edges) {
      if (visible.has(e.source) || visible.has(e.target)) {
        // when filtering by type, only expand within filter? keep both ends for context
        if (filter === 'all' || !q) {
          /* no-op */
        }
      }
    }

    const rfNodes: Node[] = graph.nodes
      .filter((n) => visible.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: 0, y: 0 },
        data: { label: n.label },
      }));

    const rfEdges: Edge[] = graph.edges
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'default',
        animated: e.type === 'elaborates' || e.type === 'introduces',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { stroke: '#6b7c93', strokeWidth: 1.2 },
        labelStyle: { fill: '#8b9bb4', fontSize: 10 },
        labelBgStyle: { fill: '#121820', fillOpacity: 0.85 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      }));

    const laid = layoutWithDagre(rfNodes, rfEdges, 'TB');
    return { initialNodes: laid, initialEdges: rfEdges };
  }, [graph, filter, query]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    );
  }, [selectedId, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelect(byId.get(node.id) ?? null);
    },
    [byId, onSelect],
  );

  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.15}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={22} size={1} color="#243044" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => (n.type === 'chapter' ? '#3d6ea8' : '#4a8f62')}
        maskColor="rgba(10,14,20,0.7)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export default function MapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <MapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
