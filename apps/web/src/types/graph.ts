export type NodeType = 'chapter' | 'concept' | 'claim' | 'person' | 'work';
export type EdgeType = 'related' | 'contains' | 'contrasts' | 'cites';
export type MapPublishStatus = 'draft' | 'published';

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
  /**
   * Author-pipeline only (draft/reviewed). Never render in the reader UI.
   * Kept optional so legacy JSON still type-checks if present; do not surface.
   */
  // reviewStatus intentionally omitted from the reader model
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

export interface MapStats {
  nodes: number;
  edges: number;
  chapters: number;
  concepts: number;
  claims?: number;
  persons?: number;
  works?: number;
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
  isbn?: string;
  language?: string;
  coverColor?: string;
  coverText?: string;
  status?: MapPublishStatus;
  schemaVersion?: string;
  source?: {
    file: string;
    kind?: string;
    imaKb?: string;
    mediaId?: string;
  };
  stats?: MapStats;
  nodeTypeBreakdown?: Partial<Record<NodeType, number>>;
  edgeTypeBreakdown?: Record<string, number>;
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
  coverColor?: string;
  coverText?: string;
  status?: MapPublishStatus;
  schemaVersion?: string;
  stats?: MapStats;
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

/** 发布状态（与已移除的审校「待审/已审」无关） */
export const STATUS_LABEL: Record<MapPublishStatus, string> = {
  draft: '草稿',
  published: '已发布',
};

export const STATUS_LABEL_WITH_PREFIX: Record<MapPublishStatus, string> = {
  draft: '发布状态：草稿',
  published: '发布状态：已发布',
};
