// Verifies the static build: every internal href/src/srcset resolves to a file in dist/,
// and every URL from the original WordPress sitemaps exists. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const ORIGIN = 'https://likeable-person-test.com';
const LEGACY = [
  '/', '/blog/', '/blog/page/2/', '/page/2/', '/privacy-policy/', '/terms-conditions/', '/author/admin/',
  '/am-i-likable-signs/', '/how-to-make-a-great-first-impression/', '/likeability-in-friendships/', '/how-to-be-more-likable/',
  '/the-science-of-likeability-what-psychology-actually-says/', '/likeable-person-test-results/', '/complete-guide/',
  '/category/discover/', '/category/science/', '/category/how-to-improvement/', '/category/relationships/',
  '/sitemap.xml', '/post-sitemap.xml', '/page-sitemap.xml', '/category-sitemap.xml', '/robots.txt',
];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const exists = (p) => {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  const f = path.join(DIST, clean);
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html')));
};

const missing = new Map();
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const anchors = new Map(htmlFiles.map((f) => [f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
let checked = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const refs = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0])),
  ];
  for (let ref of refs) {
    if (ref.startsWith(ORIGIN)) ref = ref.slice(ORIGIN.length) || '/';
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    checked++;
    const [p, hash] = ref.split('#');
    let ok = p === '' || exists(p);
    if (ok && hash && p.endsWith('/')) {
      const target = path.join(DIST, p, 'index.html');
      ok = anchors.get(target)?.has(decodeURIComponent(hash)) ?? true;
    }
    if (!ok) missing.set(ref, [...(missing.get(ref) ?? []), path.relative(DIST, file)]);
  }
}
const legacyMissing = LEGACY.filter((u) => !exists(u));
console.log(`checked ${checked} internal references in ${htmlFiles.length} pages`);
for (const [ref, from] of missing) console.log(`  ✗ ${ref}  (in ${[...new Set(from)].slice(0, 3).join(', ')})`);
for (const u of legacyMissing) console.log(`  ✗ legacy URL missing: ${u}`);
if (missing.size || legacyMissing.length) process.exit(1);
console.log(`all ${LEGACY.length} legacy WordPress URLs present ✓`);
