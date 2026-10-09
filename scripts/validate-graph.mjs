#!/usr/bin/env node
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

const mapsDir = join(root, 'content', 'maps');
const entries = readdirSync(mapsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
let failed = 0;

for (const d of entries) {
  const graphPath = join(mapsDir, d.name, 'graph.json');
  if (!existsSync(graphPath)) continue;
  const data = JSON.parse(readFileSync(graphPath, 'utf8'));
  const ok = validate(data);
  if (!ok) {
    failed++;
    console.error(`FAIL ${d.name}:`, validate.errors);
  } else {
    const ids = new Set(data.nodes.map((n) => n.id));
    for (const e of data.edges) {
      if (!ids.has(e.source) || !ids.has(e.target)) {
        failed++;
        console.error(`FAIL ${d.name}: edge ${e.id} refs missing node ${e.source} -> ${e.target}`);
      }
    }
    console.log(`OK ${d.name} (${data.nodes.length} nodes, ${data.edges.length} edges)`);
  }
}

if (failed) process.exit(1);
console.log('All graphs valid.');
