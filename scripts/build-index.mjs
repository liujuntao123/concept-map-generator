#!/usr/bin/env node
/**
 * Derive content/maps/index.json from each map's meta.json so the index can
 * never drift from the per-map metadata (version / generatedAt / stats).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapsDir = join(root, 'content', 'maps');
const indexPath = join(mapsDir, 'index.json');

const maps = [];
for (const d of readdirSync(mapsDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const metaPath = join(mapsDir, d.name, 'meta.json');
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  if (meta.id && meta.id !== d.name) {
    console.error(`ERR ${d.name}: meta.id "${meta.id}" != directory name`);
    process.exit(1);
  }
  maps.push({
    id: d.name,
    title: meta.title,
    subtitle: meta.subtitle,
    author: meta.author,
    description: meta.description,
    version: meta.version,
    generatedAt: meta.generatedAt,
    sourceFile: meta.source?.file,
    coverColor: meta.coverColor,
    coverText: meta.coverText,
    status: meta.status,
    schemaVersion: meta.schemaVersion,
    stats: meta.stats,
    path: `/maps/${d.name}`,
  });
}

maps.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));

const out = {
  generatedAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19) + '+08:00',
  maps,
};
writeFileSync(indexPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`Wrote ${indexPath} (${maps.length} maps)`);
