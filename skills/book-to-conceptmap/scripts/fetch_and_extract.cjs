#!/usr/bin/env node
/**
 * Fetch media from IMA OpenAPI and extract text + 真实封面 from epub.
 *
 * Usage:
 *   # 走 IMA：下载 epub → 抽取正文 → 提取封面
 *   node fetch_and_extract.cjs --kb-id ID --media-id ID [--out DIR] [--cover-out FILE]
 *   # 本地已有 epub（跳过 IMA）
 *   node fetch_and_extract.cjs --epub FILE [--out DIR] [--cover-out FILE] [--cover-only]
 *
 * 封面定位顺序（见 SKILL.md「封面规范」）：
 *   OPF <meta name="cover"> → manifest properties="cover-image" → id/href 含 cover 的图片 → cover.xhtml 内首个图片
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const IMA_API =
  process.env.IMA_API_CJS ||
  path.join(os.homedir(), 'agent-data/workflows/ima-skill/ima_api.cjs');

function parseArgs(argv) {
  const out = { out: path.join(process.cwd(), 'book-extract') };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kb-id') out.kbId = argv[++i];
    else if (a === '--media-id') out.mediaId = argv[++i];
    else if (a === '--out') out.out = path.resolve(argv[++i]);
    else if (a === '--epub') out.epub = path.resolve(argv[++i]);
    else if (a === '--cover-out') out.coverOut = path.resolve(argv[++i]);
    else if (a === '--cover-only') out.coverOnly = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function runIma(apiPath, body) {
  const r = spawnSync(
    process.execPath,
    [IMA_API, apiPath, JSON.stringify(body)],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`ima_api failed (${apiPath}): ${err || r.status}`);
  }
  return JSON.parse(r.stdout);
}

async function download(url, headers, dest) {
  const res = await fetch(url, { headers: headers || {} });
  if (!res.ok) throw new Error(`download failed HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

/* ---------- 封面提取（Node + unzip，不依赖 Python） ---------- */

function unzipList(epubPath) {
  const r = spawnSync('unzip', ['-Z1', epubPath], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`unzip list failed: ${r.stderr || r.status}`);
  return r.stdout.split(/\r?\n/).filter(Boolean);
}

function unzipRead(epubPath, entry, asUtf8) {
  const r = spawnSync('unzip', ['-p', epubPath, entry], {
    encoding: asUtf8 ? 'utf8' : null,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`unzip read failed for ${entry}: ${r.stderr || r.status}`);
  return r.stdout;
}

function findCoverEntry(epubPath) {
  const entries = unzipList(epubPath);
  const findEntry = (name) => {
    const n = name.replace(/^\.\//, '');
    return (
      entries.find((e) => e === n) ||
      entries.find((e) => e.toLowerCase() === n.toLowerCase()) ||
      null
    );
  };

  const containerEntry = findEntry('META-INF/container.xml');
  let opfEntry = null;
  if (containerEntry) {
    const xml = unzipRead(epubPath, containerEntry, true);
    const m = xml.match(/full-path\s*=\s*["']([^"']+)["']/i);
    if (m) opfEntry = findEntry(decodeURIComponent(m[1]));
  }
  if (!opfEntry) opfEntry = entries.find((e) => /\.opf$/i.test(e)) || null;
  if (!opfEntry) throw new Error('epub 内找不到 OPF');

  const opf = unzipRead(epubPath, opfEntry, true);
  const baseDir = path.posix.dirname(opfEntry);
  const manifest = new Map();
  const itemRe = /<item\b[^>]*>/gi;
  let it;
  while ((it = itemRe.exec(opf))) {
    const tag = it[0];
    const id = (tag.match(/\bid\s*=\s*["']([^"']+)["']/i) || [])[1];
    const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
    const mediaType = (tag.match(/\bmedia-type\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    const properties = (tag.match(/\bproperties\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (id && href) manifest.set(id, { href, mediaType, properties });
  }
  const resolve = (href) => {
    const clean = decodeURIComponent(href.split('#')[0]);
    const rel = clean.startsWith('/') ? clean.slice(1) : path.posix.join(baseDir, clean);
    return path.posix.normalize(rel);
  };

  // 1) <meta name="cover" content="ID">
  const metaCover = opf.match(/<meta\b[^>]*name\s*=\s*["']cover["'][^>]*>/i);
  if (metaCover) {
    const cid = (metaCover[0].match(/content\s*=\s*["']([^"']+)["']/i) || [])[1];
    const item = cid && manifest.get(cid);
    if (item) {
      const p = findEntry(resolve(item.href));
      if (p) return p;
    }
  }
  // 2) properties="cover-image"
  for (const item of manifest.values()) {
    if (/\bcover-image\b/i.test(item.properties)) {
      const p = findEntry(resolve(item.href));
      if (p) return p;
    }
  }
  // 3) id / href 含 cover 的图片
  for (const [id, item] of manifest) {
    if (/^image\//i.test(item.mediaType) && /cover/i.test(`${id} ${item.href}`)) {
      const p = findEntry(resolve(item.href));
      if (p) return p;
    }
  }
  // 4) cover.xhtml / cover.html 内的首个图片引用
  const coverPage = entries.find((e) => /(^|\/)cover\.x?html?$/i.test(e));
  if (coverPage) {
    const html = unzipRead(epubPath, coverPage, true);
    const src =
      (html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i) ||
        html.match(/xlink:href\s*=\s*["']([^"']+)["']/i) ||
        [])[1];
    if (src) {
      const rel = path.posix.join(
        path.posix.dirname(coverPage),
        decodeURIComponent(src.split('#')[0]),
      );
      const p = findEntry(path.posix.normalize(rel));
      if (p) return p;
    }
  }
  throw new Error('未在 epub 中找到封面（OPF meta / cover-image / cover.xhtml 均未命中）');
}

function extractCover(epubPath, outDir, coverOut) {
  const entry = findCoverEntry(epubPath);
  const ext = (path.extname(entry) || '.jpg').toLowerCase();
  const dest = coverOut || path.join(outDir, `cover${ext}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = unzipRead(epubPath, entry);
  fs.writeFileSync(dest, buf);
  return { entry, dest, bytes: buf.length };
}

function extractEpub(epubPath, outDir) {
  const py = `
import json, re, zipfile
from pathlib import Path
from bs4 import BeautifulSoup

epub = Path(${JSON.stringify(epubPath)})
out = Path(${JSON.stringify(outDir)})
raw = out / 'epub_raw'
raw.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(epub) as z:
    z.extractall(raw)

oebps = raw / 'OEBPS'
if not oebps.exists():
    # find any html
    htmls = list(raw.rglob('*.html')) + list(raw.rglob('*.xhtml'))
else:
    htmls = sorted(oebps.glob('text*.html')) or sorted(oebps.glob('*.html'))

essays = []
chap_dir = out / 'chapters'
chap_dir.mkdir(exist_ok=True)
for i, p in enumerate(htmls):
    soup = BeautifulSoup(p.read_text(encoding='utf-8', errors='ignore'), 'lxml')
    for tag in soup(['script','style']):
        tag.decompose()
    h = soup.find('h2') or soup.find('h1')
    title = h.get_text(strip=True) if h else p.name
    text = soup.get_text('\\n', strip=True)
    text = re.sub(r'\\n{3,}', '\\n\\n', text)
    if text.startswith('未知'):
        text = text[2:].lstrip('\\n')
    essays.append({'file': p.name, 'index': i, 'title': title, 'chars': len(text), 'text': text})
    safe = re.sub(r'[^\\w\\u4e00-\\u9fff\\-]+', '_', title)[:40]
    (chap_dir / f'{i:02d}_{safe}.txt').write_text(text, encoding='utf-8')

(out / 'essays.json').write_text(json.dumps(essays, ensure_ascii=False, indent=2), encoding='utf-8')
(out / 'full.txt').write_text('\\n\\n===== FILE SEP =====\\n\\n'.join(e['text'] for e in essays), encoding='utf-8')
print(json.dumps({'essays': len(essays), 'total_chars': sum(e['chars'] for e in essays)}, ensure_ascii=False))
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`extract failed: ${r.stderr || r.stdout}`);
  }
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.mediaId && !args.epub)) {
    console.log(`Usage:
  # 走 IMA：下载 epub → 抽取正文 → 提取封面
  node fetch_and_extract.cjs --kb-id <id> --media-id <id> [--out DIR] [--cover-out FILE]
  # 本地已有 epub（跳过 IMA）
  node fetch_and_extract.cjs --epub FILE [--out DIR] [--cover-out FILE] [--cover-only]
IMA_API_CJS=${IMA_API}`);
    process.exit(args.help ? 0 : 1);
  }

  fs.mkdirSync(args.out, { recursive: true });

  let filePath = args.epub;
  if (!filePath) {
    const info = runIma('openapi/wiki/v1/get_media_info', { media_id: args.mediaId });
    if (info.code !== 0) throw new Error(JSON.stringify(info));
    fs.writeFileSync(path.join(args.out, 'media_info.json'), JSON.stringify(info, null, 2));

    const urlInfo = info.data && info.data.url_info;
    if (!urlInfo || !urlInfo.url) throw new Error('no url_info in get_media_info');

    const mediaType = info.data.media_type;
    const ext = mediaType === 21 ? '.epub' : mediaType === 1 ? '.pdf' : '.bin';
    filePath = path.join(args.out, `source${ext}`);
    const bytes = await download(urlInfo.url, urlInfo.headers || {}, filePath);
    console.log(JSON.stringify({ downloaded: bytes, file: filePath, media_type: mediaType }));
  }

  if (!/\.epub$/i.test(filePath)) {
    console.log(JSON.stringify({ note: 'non-epub: raw file saved only', out: args.out }));
    return;
  }

  // 封面：失败不阻塞正文抽取（对应「封面规范」的字型封面兜底）
  try {
    const cover = extractCover(filePath, args.out, args.coverOut);
    console.log(
      JSON.stringify({
        cover,
        next: `在 packages/core/src/lib/covers.ts 的 COVER_SRC 登记：'<mapId>': '/illustrations/cover-<mapId>${path.extname(cover.dest)}'`,
      }),
    );
  } catch (e) {
    console.error(`cover skipped: ${e.message || e}`);
  }

  if (args.coverOnly) return;

  const stats = extractEpub(filePath, args.out);
  console.log(JSON.stringify({ extract: stats, out: args.out }));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
