#!/usr/bin/env node
/**
 * 静态资源同步（两个 Web 应用：apps/web 桌面 / apps/web-mobile 移动端）：
 * 1. content/maps → 各应用 public/maps（Vite 以静态 JSON 提供）
 * 2. apps/web/public/illustrations → 移动端 public/illustrations
 *    （封面 / 插画在 Git 里只存一份，源在桌面端 public）
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

// 插画 / 封面：apps/web/public/illustrations 为源，同步到移动端
const illSrc = join(root, 'apps', 'web', 'public', 'illustrations');
const illDest = join(root, 'apps', 'web-mobile', 'public', 'illustrations');
if (existsSync(illSrc) && existsSync(join(root, 'apps', 'web-mobile', 'public'))) {
  rmSync(illDest, { recursive: true, force: true });
  cpSync(illSrc, illDest, { recursive: true });
  console.log(`Synced ${illSrc} → ${illDest}`);
}