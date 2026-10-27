// Preview builds only: GitHub Pages serves this repo under /<repo>/, so prefix the
// root-relative links that come from templates and imported WordPress content.
// Astro's `base` already handles its own /_astro assets. Also marks pages noindex
// so the preview never competes with the live site.
import fs from 'node:fs';
import path from 'node:path';

const base = (process.env.SITE_BASE || '').replace(/\/$/, '');
if (!base) {
  console.log('SITE_BASE not set; nothing to do');
  process.exit(0);
}
const DIST = path.resolve('dist');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const fix = (url) => (url.startsWith('/') && !url.startsWith('//') && !url.startsWith(base + '/') ? base + url : url);

let files = 0;
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replace(/(\s(?:href|src|poster)=")([^"]*)"/g, (_, a, u) => `${a}${fix(u)}"`)
    .replace(/(\ssrcset=")([^"]*)"/g, (_, a, set) => `${a}${set.split(',').map((p) => p.trim().replace(/^\S+/, fix)).join(', ')}"`)
    .replace('<head>', '<head><meta name="robots" content="noindex, nofollow">');
  fs.writeFileSync(file, html);
  files++;
}
console.log(`rebased ${files} pages under ${base}/`);
