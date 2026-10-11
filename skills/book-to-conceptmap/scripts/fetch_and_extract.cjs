#!/usr/bin/env node
/**
 * Fetch media from IMA OpenAPI and extract text from epub.
 * Usage:
 *   node fetch_and_extract.cjs --kb-id ID --media-id ID [--out DIR]
 *   node fetch_and_extract.cjs --media-id ID --out DIR
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

# 抽取封面：优先文件名含 cover 的图片，否则取第一张；写到 <out>/cover.<ext>
cov_imgs = [p for p in raw.rglob('*') if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.gif')]
cover = next((p for p in sorted(cov_imgs) if 'cover' in p.name.lower()), None) or (sorted(cov_imgs)[0] if cov_imgs else None)
cover_name = None
if cover is not None:
    import shutil
    cover_name = 'cover' + cover.suffix.lower()
    shutil.copy(cover, out / cover_name)

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
print(json.dumps({'essays': len(essays), 'total_chars': sum(e['chars'] for e in essays), 'cover': cover_name}, ensure_ascii=False))
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`extract failed: ${r.stderr || r.stdout}`);
  }
  return JSON.parse(r.stdout.trim().split('\n').pop());
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.mediaId) {
    console.log(`Usage: node fetch_and_extract.cjs --media-id <id> [--kb-id <id>] [--out DIR]
IMA_API_CJS=${IMA_API}`);
    process.exit(args.help ? 0 : 1);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const info = runIma('openapi/wiki/v1/get_media_info', { media_id: args.mediaId });
  if (info.code !== 0) throw new Error(JSON.stringify(info));
  fs.writeFileSync(path.join(args.out, 'media_info.json'), JSON.stringify(info, null, 2));

  const urlInfo = info.data && info.data.url_info;
  if (!urlInfo || !urlInfo.url) throw new Error('no url_info in get_media_info');

  const mediaType = info.data.media_type;
  const ext = mediaType === 21 ? '.epub' : mediaType === 1 ? '.pdf' : '.bin';
  const filePath = path.join(args.out, `source${ext}`);
  const bytes = await download(urlInfo.url, urlInfo.headers || {}, filePath);
  console.log(JSON.stringify({ downloaded: bytes, file: filePath, media_type: mediaType }));

  if (ext === '.epub') {
    const stats = extractEpub(filePath, args.out);
    console.log(JSON.stringify({ extract: stats, out: args.out }));
  } else {
    console.log(JSON.stringify({ note: 'non-epub: raw file saved only', out: args.out }));
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
