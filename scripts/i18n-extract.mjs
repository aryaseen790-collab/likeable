// Writes the English source of every translatable document to src/i18n/source/,
// one JSON file per document: { source: <hash>, meta: {...}, segments: [...] }.
// A translation is src/i18n/<lang>/<doc>.json with the same shape: copy `source`,
// translate every `meta` value and every segment, keep the <n>…</n> / <n/>
// placeholders exactly. Mirrors sourceDocs() in src/lib/i18n.ts; if the two ever
// drift, the hash check there skips the translation with a warning.
import fs from 'node:fs';
import path from 'node:path';
import { extract, hashSegments } from '../src/lib/segment.mjs';

const read = (f) => JSON.parse(fs.readFileSync(path.resolve('src/data', f), 'utf8'));
const posts = read('posts.json');
const pages = read('pages.json');
const home = read('home.json');
const questions = read('questions.json');
const seo = read('seo.json');
const seoOf = (p) => ({ title: seo[p]?.title ?? '', description: seo[p]?.meta.find((m) => m.name === 'description')?.content ?? '' });

const HOME = ['lpt-what-section', 'lpt-likable-section', 'lpt-social-section', 'lpt-unlikable-section', 'lpt-personality-section', 'lpt-popular-section', 'lpt-tips-section', 'lpt-faq-section', 'lpt-cta-section'];
const docs = {
  home: { meta: {}, segments: HOME.flatMap((c) => extract(home.sections.find((s) => s.cls === c).html)) },
  quiz: { meta: {}, segments: questions.flatMap((q) => [q.text, q.hook, ...q.options]) },
};
for (const p of posts) {
  docs[`post-${p.slug}`] = {
    meta: { title: p.title, excerpt: p.excerpt, featuredAlt: p.featured?.alt ?? '', seoTitle: seoOf(p.path).title, seoDescription: seoOf(p.path).description },
    segments: extract(p.html),
  };
}
for (const slug of ['privacy-policy', 'terms-conditions']) {
  const pg = pages[slug];
  docs[`page-${slug}`] = { meta: { title: pg.title, seoTitle: seoOf(pg.path).title, seoDescription: seoOf(pg.path).description }, segments: extract(pg.html) };
}

const out = path.resolve('src/i18n/source');
fs.mkdirSync(out, { recursive: true });
for (const [name, d] of Object.entries(docs)) {
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ source: hashSegments(d.segments), meta: d.meta, segments: d.segments }, null, 1) + '\n');
}
console.log(`wrote ${Object.keys(docs).length} source documents to src/i18n/source/`);
