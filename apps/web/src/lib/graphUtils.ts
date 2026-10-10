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

/** Structural / catalog edges that swamp the default map (contains / 收录 / 包含). */
export function isStructuralEdge(e: MapEdge): boolean {
  if (e.type === 'contains') return true;
  const label = (e.label || '').trim();
  return label === '收录' || label === '包含';
}

export function isSemanticEdge(e: MapEdge): boolean {
  return !isStructuralEdge(e);
}

/**
 * Search index: label / summary / tags / excerpt / chapter name.
 * Intentionally excludes long `content` so shared book-title boilerplate cannot flood results.
 */
export function matchesQuery(n: MapNode, q: string): boolean {
  if (!q) return true;
  const hay = [
    n.label,
    n.summary,
    n.source?.excerpt ?? '',
    n.source?.chapter ?? '',
    ...(n.tags ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return hay.includes(q);
}

/** Best snippet field for a search hit, with optional mark of query. */
export function snippetForQuery(n: MapNode, q: string): string {
  const qq = q.trim().toLowerCase();
  // Prefer label → tags → summary (概要) over excerpt so multi-hit lists are not the same paste
  const fields = [n.label, ...(n.tags ?? []), n.summary, n.source?.excerpt ?? ''];
  const clean = (raw: string) =>
    raw
      .replace(/（[^）]{0,40}）/g, '')
      .replace(/\([^)]{0,40}\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  for (const f of fields) {
    if (!f) continue;
    if (!qq || f.toLowerCase().includes(qq)) {
      let s = clean(f);
      if (!s) continue;
      // Prefer summary when query only hits identical excerpt across nodes
      if (f === n.source?.excerpt && n.summary && n.summary.trim()) {
        const sum = clean(n.summary);
        if (sum && (!qq || sum.toLowerCase().includes(qq) || !s.toLowerCase().includes(qq))) {
          // if excerpt matches but we have summary, and summary also relates or excerpt is generic: use summary
          if (sum.length > 8) s = sum;
        }
      }
      if (s.length <= 96) return s;
      if (!qq) return s.slice(0, 94) + '…';
      const i = s.toLowerCase().indexOf(qq);
      if (i < 0) return s.slice(0, 94) + '…';
      const start = Math.max(0, i - 24);
      const end = Math.min(s.length, i + qq.length + 48);
      return (start > 0 ? '…' : '') + s.slice(start, end) + (end < s.length ? '…' : '');
    }
  }
  return clean(n.summary || n.label || '').slice(0, 96);
}

const BOILERPLATE_RES: RegExp[] = [
  /与「概要」不同[^。]*。?/g,
  /核对接引请看下方摘录[^。]*。?/g,
  /请看下方摘录[^。]*。?/g,
  /文中继续推进[：:]/g,
  /后文还落到[：:]/g,
  /开篇与主线可概括为[：:]/g,
  /其原意可先把握为[：:]/g,
  /因此详述负责[^。]*。?/g,
  /因此「详述」负责展开层次与区分[^。]*。?/g,
  /二者必须不同，摘录则提供可核对的原文区间。?/g,
  /摘录提供可核对的原文区间。?/g,
  /就原文而言，核心说法是[：:]/g,
  /核心说法是[：:]\s*/g,
  /作者进一步区分或展开[：:]/g,
  /相关收束或转进[：:]/g,
  /概念「[^」]+」需要放回「[^」]+」的问题脉络里理解，而不是抽成词典义项。/g,
  /本篇「[^」]+」属于《[^》]+》的正式正文[^。]*。?/g,
  /论证上，作者把这一主张放进更长的思想史与自我澄清之中[：:]/g,
  /导读首先交代[：:]/g,
  /随后进入问题结构[：:]/g,
  /著作节点「[^」]+」对应书中导读所围绕的文本，而非简单书目条目。/g,
  /主张「[^」]+」不是口号，而是作者用来组织全书问题意识的枢纽命题。/g,
];

/** Strip generator UI instructions from node content for reader display. */
export function cleanReaderContent(raw: string): string {
  let c = (raw || '').trim();
  if (!c) return '';
  for (const re of BOILERPLATE_RES) c = c.replace(re, '');
  c = c.replace(/\s{2,}/g, ' ').replace(/^[。！？：:，,、\s]+/u, '').trim();
  c = c.replace(/^(核心说法是|作者进一步区分或展开|相关收束或转进)[：:]\s*$/u, '').trim();
  c = c.replace(/核心说法是[：:]\s*。/g, '').trim();
  c = c.replace(/^[。！？：:\s]+/u, '').trim();
  c = c.replace(/[。！？：:]\s*[。！？：:]+/gu, '。').trim();
  if (/^[。！？：:\s]*$/u.test(c)) return '';
  return c;
}

/**
 * Argument-level body for the drawer.
 * Hide when empty, equal to summary, leftover template, or mostly repeating the excerpt.
 */
export function readerBody(n: MapNode): string | null {
  let cleaned = cleanReaderContent(n.content ?? '');
  if (!cleaned) return null;
  cleaned = cleaned.replace(/^[。！？：:\s]+/u, '').trim();
  if (!cleaned || /^[。！？：:\s]*$/u.test(cleaned)) return null;
  const summary = (n.summary ?? '').trim();
  if (cleaned === summary) return null;
  if (summary && cleaned.includes(summary) && cleaned.length < summary.length + 12) return null;
  if (cleaned.includes('属于《') && cleaned.includes('正式正文')) return null;
  const excerpt = (n.source?.excerpt ?? '').trim();
  if (excerpt && excerpt.length > 20) {
    // if cleaned largely embeds excerpt, keep only the non-excerpt framing sentences
    if (cleaned.includes(excerpt.slice(0, Math.min(40, excerpt.length)))) {
      let rest = cleaned.replace(excerpt, '').trim();
      // also strip near-duplicate first sentence of excerpt
      const first = excerpt.split(/[。！？]/)[0];
      if (first && first.length > 12) rest = rest.replace(first, '').trim();
      // Ux2-7: strip leading sentence punct left by excerpt splice (。！？：)
      rest = rest.replace(/^[。！？：:，,、\s]+/u, '').trim();
      // drop empty / punct-only leftovers
      if (!rest || /^[。！？：:\s]*$/u.test(rest) || rest.length < 24) return null;
      return rest;
    }
  }
  // final guard for any path
  cleaned = cleaned.replace(/^[。！？：:\s]+/u, '').trim();
  if (!cleaned || /^[。！？：:\s]*$/u.test(cleaned)) return null;
  return cleaned;
}

export function hasDistinctContent(n: MapNode): boolean {
  return readerBody(n) != null;
}

/**
 * Chapter focus: chapter + 1-hop (all) + semantic neighbors of those 1-hop nodes
 * so focus is not just the contains tree.
 */
export function chapterSubgraphIds(
  graph: ConceptGraph,
  chapterId: string,
  adj: Map<string, Set<string>>,
): Set<string> {
  const ids = new Set<string>([chapterId]);
  const direct = adj.get(chapterId) ?? new Set();
  for (const id of direct) ids.add(id);

  const semanticAdj = new Map<string, Set<string>>();
  for (const n of graph.nodes) semanticAdj.set(n.id, new Set());
  for (const e of graph.edges) {
    if (isStructuralEdge(e)) continue;
    semanticAdj.get(e.source)?.add(e.target);
    semanticAdj.get(e.target)?.add(e.source);
  }
  const base = [...ids];
  for (const id of base) {
    for (const nb of semanticAdj.get(id) ?? []) ids.add(nb);
  }
  return ids;
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function nodeTypeColor(type: NodeType | string): string {
  switch (type) {
    case 'chapter':
      return readCssVar('--chapter', '#5b8fd4');
    case 'concept':
      return readCssVar('--concept', '#6fbf86');
    case 'claim':
      return readCssVar('--claim', '#e0a86a');
    case 'person':
      return readCssVar('--person', '#c59bdb');
    case 'work':
      return readCssVar('--work', '#6bb8c9');
    default:
      return readCssVar('--muted', '#8b9bb4');
  }
}

export function edgeTypeColor(type: string): string {
  switch (type) {
    case 'contains':
      return readCssVar('--edge-contains', readCssVar('--chapter', '#5b8fd4'));
    case 'contrasts':
      return readCssVar('--edge-contrasts', readCssVar('--claim', '#e0a86a'));
    case 'cites':
      return readCssVar('--edge-cites', readCssVar('--work', '#6bb8c9'));
    default:
      return readCssVar('--edge-related', readCssVar('--muted', '#6b7c93'));
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
  // Prefer semantic relations first
  out.sort((a, b) => Number(isStructuralEdge(a.edge)) - Number(isStructuralEdge(b.edge)));
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

/** Date-only for reader UI (U11). */
export function formatGeneratedDate(iso?: string): string {
  if (!iso) return '未知';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch {
    return iso;
  }
}

export function dedupeTags(type: NodeType | string, tags: string[] | undefined): string[] {
  const typeLabel: Record<string, string> = {
    chapter: '章节',
    concept: '概念',
    claim: '主张',
    person: '人物',
    work: '著作',
  };
  const skip = new Set(
    [type, typeLabel[type], String(type)].filter(Boolean).map((s) => s.toLowerCase()),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags ?? []) {
    const key = t.trim().toLowerCase();
    if (!key || skip.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(t.trim());
  }
  return out;
}

/** Group chapters under 辑* parents when present in label order. */
export function groupChapters(chapters: MapNode[]): Array<{ group: string; items: MapNode[] }> {
  const groups: Array<{ group: string; items: MapNode[] }> = [];
  let current = { group: '篇目', items: [] as MapNode[] };
  for (const c of chapters) {
    if (/^辑[一二三四五六七八九十\d]/.test(c.label) || c.label === '前记' || c.label === '后记') {
      if (current.items.length) groups.push(current);
      current = { group: c.label, items: [c] };
    } else {
      current.items.push(c);
    }
  }
  if (current.items.length) groups.push(current);
  return groups;
}


/** Natural-language A—relates-to—B for the edge panel (never dump EN type codes). */
export function edgeRelationSentence(
  edge: MapEdge,
  sourceLabel: string,
  targetLabel: string,
): string {
  const typeZh: Record<string, string> = {
    related: '相关',
    contains: '包含',
    contrasts: '对照',
    cites: '引用',
  };
  const kind = typeZh[String(edge.type)] ?? String(edge.type);
  let rel = (edge.label || '').trim() || kind;
  rel = rel.replace(/（原关系类型：[^）]+）/g, '').trim() || kind;
  // synthetic path step
  if (edge.id.startsWith('path-gap:') || rel === '无线') {
    return `路径上「${sourceLabel}」与「${targetLabel}」之间暂无图谱边（无线）。`;
  }
  if (edge.type === 'contains' || rel === '收录' || rel === '包含') {
    return `「${sourceLabel}」里收有「${targetLabel}」。`;
  }
  if (edge.type === 'contrasts' || rel.includes('对照')) {
    return `「${sourceLabel}」与「${targetLabel}」相互对照：${rel === kind ? '一正一反，互为参照' : rel}。`;
  }
  if (edge.type === 'cites') {
    return `「${sourceLabel}」指向 / 引用「${targetLabel}」。`;
  }
  // verb-like labels: 阐发、互依、转向…
  if (rel !== kind) {
    return `「${sourceLabel}」${rel}「${targetLabel}」。`;
  }
  return `「${sourceLabel}」与「${targetLabel}」彼此关联。`;
}
