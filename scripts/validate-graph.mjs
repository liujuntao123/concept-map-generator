#!/usr/bin/env node
/**
 * Validate every content/maps/<id>/graph.json against the JSON Schema, plus
 * structural / quality invariants that the old validator missed:
 *   - edge.source / edge.target resolve to existing nodes
 *   - no duplicate node / edge ids, no self-loops
 *   - node.type / edge.type within the reader-supported enums
 *   - summary must not equal content (detail must add something)
 *   - content must not contain generator template residue
 *   - source.excerpt present and not too short
 *   - graph.mapId / meta.id match the directory name
 *   - meta.stats / node & edge breakdown match the actual graph
 *   - index.json version / generatedAt per map match meta.json
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'apps/web/package.json'));
const Ajv = require('ajv');

const schema = JSON.parse(readFileSync(join(root, 'schemas', 'graph.schema.json'), 'utf8'));
delete schema.$schema; // avoid meta-schema fetch
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const NODE_TYPES = new Set(schema.$defs.node.properties.type.enum);
const EDGE_TYPES = new Set(schema.$defs.edge.properties.type.enum);
const MIN_EXCERPT = 40;

// Scaffolding phrases emitted by the retired craft_content() generator. Their
// presence in reader-facing text means a generator leak.
const TEMPLATE_RESIDUE = [
  /文中继续推进[：:]/,
  /后文还落到[：:]/,
  /核对接引请看下方摘录/,
  /与「概要」不同/,
  /本篇「[^」]*」属于《/,
  /组织全书问题意识的枢纽命题/,
  /「详述」负责展开层次/,
];

const mapsDir = join(root, 'content', 'maps');
const dirs = readdirSync(mapsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
const fails = [];
const warns = [];
const summary = [];

const fail = (id, msg) => fails.push(`${id}: ${msg}`);
const warn = (id, msg) => warns.push(`${id}: ${msg}`);

const counts = (arr, key) => {
  const out = {};
  for (const x of arr) out[x[key]] = (out[x[key]] || 0) + 1;
  return out;
};
const sameCounts = (a, b) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) if ((a?.[k] || 0) !== (b?.[k] || 0)) return false;
  return true;
};

for (const d of dirs) {
  const id = d.name;
  const graphPath = join(mapsDir, id, 'graph.json');
  if (!existsSync(graphPath)) {
    warn(id, 'no graph.json (skipped)');
    continue;
  }
  const graph = JSON.parse(readFileSync(graphPath, 'utf8'));

  // 1) JSON Schema
  if (!validate(graph)) {
    fail(id, `schema: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
    continue;
  }

  const ids = new Set();
  for (const n of graph.nodes) {
    if (ids.has(n.id)) fail(id, `duplicate node id "${n.id}"`);
    ids.add(n.id);
    if (!NODE_TYPES.has(n.type)) fail(id, `node "${n.id}" has unsupported type "${n.type}"`);
    if ((n.summary || '').trim() === (n.content || '').trim() && (n.summary || '').trim() !== '') {
      fail(id, `node "${n.id}" content equals summary`);
    }
    if (n.content && TEMPLATE_RESIDUE.some((re) => re.test(n.content))) {
      fail(id, `node "${n.id}" content contains generator template residue`);
    }
    const excerpt = (n.source?.excerpt || '').trim();
    if (!excerpt) fail(id, `node "${n.id}" missing source.excerpt`);
    else if (excerpt.length < MIN_EXCERPT) {
      fail(id, `node "${n.id}" excerpt too short (${excerpt.length} < ${MIN_EXCERPT})`);
    }
  }

  const edgeIds = new Set();
  for (const e of graph.edges) {
    if (edgeIds.has(e.id)) fail(id, `duplicate edge id "${e.id}"`);
    edgeIds.add(e.id);
    if (!EDGE_TYPES.has(e.type)) fail(id, `edge "${e.id}" has unsupported type "${e.type}"`);
    if (!ids.has(e.source) || !ids.has(e.target)) {
      fail(id, `edge "${e.id}" refs missing node ${e.source} -> ${e.target}`);
    }
    if (e.source === e.target) fail(id, `edge "${e.id}" is a self-loop`);
  }

  // 2) meta.json
  const metaPath = join(mapsDir, id, 'meta.json');
  if (!existsSync(metaPath)) {
    fail(id, 'missing meta.json');
  } else {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    if (meta.id && meta.id !== id) fail(id, `meta.id "${meta.id}" != directory name`);
    if (graph.mapId !== id) fail(id, `graph.mapId "${graph.mapId}" != directory name`);
    const nodeCounts = counts(graph.nodes, 'type');
    const edgeCounts = counts(graph.edges, 'type');
    const actual = {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      chapters: nodeCounts.chapter || 0,
      concepts: nodeCounts.concept || 0,
      claims: nodeCounts.claim || 0,
      persons: nodeCounts.person || 0,
      works: nodeCounts.work || 0,
    };
    if (meta.stats && !sameCounts(meta.stats, actual)) {
      fail(id, `meta.stats ${JSON.stringify(meta.stats)} != actual ${JSON.stringify(actual)}`);
    }
    if (meta.nodeTypeBreakdown && !sameCounts(meta.nodeTypeBreakdown, nodeCounts)) {
      fail(id, 'meta.nodeTypeBreakdown != actual node types');
    }
    if (meta.edgeTypeBreakdown && !sameCounts(meta.edgeTypeBreakdown, edgeCounts)) {
      fail(id, 'meta.edgeTypeBreakdown != actual edge types');
    }
  }

  // 3) index.json consistency
  if (existsSync(indexPathOf())) {
    const idx = JSON.parse(readFileSync(indexPathOf(), 'utf8'));
    const entry = (idx.maps || []).find((m) => m.id === id);
    if (!entry) fail(id, 'not listed in index.json');
    else if (metaPath && existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (entry.version !== meta.version) {
        fail(id, `index.version ${entry.version} != meta.version ${meta.version}`);
      }
      if (entry.generatedAt !== meta.generatedAt) {
        fail(id, `index.generatedAt != meta.generatedAt`);
      }
    }
  }

  const orphan = graph.nodes.filter(
    (n) => !graph.edges.some((e) => e.source === n.id || e.target === n.id),
  );
  if (orphan.length) warn(id, `${orphan.length} orphan node(s): ${orphan.map((n) => n.id).join(', ')}`);

  summary.push(`${id}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
}

function indexPathOf() {
  return join(mapsDir, 'index.json');
}

for (const s of summary) console.log(`OK ${s}`);
for (const w of warns) console.warn(`WARN ${w}`);
for (const f of fails) console.error(`FAIL ${f}`);

if (fails.length) {
  console.error(`\n${fails.length} failure(s), ${warns.length} warning(s).`);
  process.exit(1);
}
console.log(`\nAll graphs valid.${warns.length ? ` (${warns.length} warning(s))` : ''}`);
