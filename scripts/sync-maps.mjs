#!/usr/bin/env node
/**
 * Copy content/maps → 各 Web 应用的 public/maps，供 Vite 以静态 JSON 提供。
 * 目前有两个应用：apps/web（桌面）与 apps/web-mobile（移动端）。
 */
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'content', 'maps');

if (!existsSync(src)) {
  console.error('Missing content/maps');
  process.exit(1);
}

const targets = ['web', 'web-mobile']
  .map((app) => join(root, 'apps', app, 'public', 'maps'))
  .filter((dest) => existsSync(dirname(dest)));

for (const dest of targets) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Synced ${src} → ${dest}`);
}