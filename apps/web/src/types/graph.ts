export type NodeType = 'chapter' | 'concept';

export interface SourceRef {
  chapter: string;
  file?: string;
  excerpt: string;
}

export interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  summary: string;
  content: string;
  source: SourceRef;
  tags?: string[];
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface ConceptGraph {
  mapId: string;
  schemaVersion: string;
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface MapMeta {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  stats?: {
    nodes: number;
    edges: number;
    chapters: number;
    concepts: number;
  };
}
