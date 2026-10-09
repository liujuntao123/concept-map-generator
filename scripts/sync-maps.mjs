#!/usr/bin/env node
/**
 * Copy content/maps → apps/web/public/maps so Vite can serve static JSON.
 */
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'content', 'maps');
const dest = join(root, 'apps', 'web', 'public', 'maps');

if (!existsSync(src)) {
  console.error('Missing content/maps');
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Synced ${src} → ${dest}`);
