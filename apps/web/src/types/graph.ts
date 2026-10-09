export type NodeType = 'chapter' | 'concept' | 'claim' | 'person' | 'work';
export type EdgeType = 'related' | 'contains' | 'contrasts' | 'cites';
export type ReviewStatus = 'draft' | 'reviewed';

export interface SourceRef {
  chapter: string;
  file?: string;
  excerpt: string;
  /** epub 内锚点 / 文件名，便于「在书中定位」 */
  anchor?: string;
}

export interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  summary: string;
  content: string;
  source: SourceRef;
  tags?: string[];
  reviewStatus?: ReviewStatus;
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType | string;
  label: string;
  description?: string;
}

export interface ConceptGraph {
  mapId: string;
  schemaVersion: string;
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface FeaturedPath {
  id: string;
  title: string;
  description: string;
  nodeIds: string[];
}

export interface MapMeta {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  version?: string;
  generatedAt?: string;
  createdAt?: string;
  publisher?: string;
  source?: {
    file: string;
    kind?: string;
    imaKb?: string;
    mediaId?: string;
  };
  stats?: {
    nodes: number;
    edges: number;
    chapters: number;
    concepts: number;
    claims?: number;
    persons?: number;
    works?: number;
  };
  featuredPaths?: FeaturedPath[];
  ima?: Record<string, unknown>;
}

export interface MapIndexEntry {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  version?: string;
  generatedAt?: string;
  sourceFile?: string;
  stats?: MapMeta['stats'];
  path: string;
}

export interface MapsIndex {
  generatedAt?: string;
  maps: MapIndexEntry[];
}

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  chapter: '章节',
  concept: '概念',
  claim: '主张',
  person: '人物',
  work: '著作',
};

export const EDGE_TYPE_LABEL: Record<string, string> = {
  related: '相关',
  contains: '包含',
  contrasts: '对照',
  cites: '引用',
};
