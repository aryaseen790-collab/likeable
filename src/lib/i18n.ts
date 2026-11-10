// Multilingual layer. English content comes from src/data (the WordPress
// import); translations live in src/i18n/<lang>/*.json (content) and
// src/i18n/ui/<lang>.json (interface strings). A page exists in a language only
// when its translation is present, matches the current English source and
// passes validation — so no language URL ever shows English content.
import { LANGS, DEFAULT_LANG, langOf, type Lang } from '../i18n/languages';
import { extract, apply, hashSegments, validSegment } from './segment.mjs';
import { posts as enPosts, pages as enPages, home as enHome, questions as enQuestions, categories, site, seo as seoMap, readingTime as enReadingTime, type Post, type TocItem } from './data';
import enUi from '../i18n/ui/en.json';

export { LANGS, DEFAULT_LANG, langOf, type Lang };
type Dict = Record<string, string>;
type DocFile = { source: string; meta?: Record<string, string>; segments: string[] };

const uiFiles = import.meta.glob('../i18n/ui/*.json', { eager: true, import: 'default' }) as Record<string, Dict>;
const docFiles = import.meta.glob('../i18n/[a-z][a-z]/*.json', { eager: true, import: 'default' }) as Record<string, DocFile>;
const ui: Record<string, Dict> = Object.fromEntries(Object.entries(uiFiles).map(([p, d]) => [p.match(/(\w+)\.json$/)![1], d]));
const doc = (lang: string, name: string): DocFile | undefined => docFiles[`../i18n/${lang}/${name}.json`];

// ---------------------------------------------------------------------------
// Interface strings
// ---------------------------------------------------------------------------
const markers = (s: string) => [...(s.match(/<\/?[a-z]+>|\{\w+\}/g) || [])].sort().join('|');
const warned = new Set<string>();
const warn = (msg: string) => {
  if (!warned.has(msg)) {
    warned.add(msg);
    console.warn(`[i18n] ${msg}`);
  }
};

/** Interface string in `lang` (English fallback), with {vars} filled in. */
export function t(lang: string, key: string, vars: Record<string, string | number> = {}) {
  const en = (enUi as Dict)[key];
  if (en === undefined) warn(`missing English UI key "${key}"`);
  let s = lang === DEFAULT_LANG ? en : ui[lang]?.[key];
  if (lang !== DEFAULT_LANG && (s === undefined || markers(s) !== markers(en ?? ''))) {
    if (s !== undefined) warn(`${lang}: "${key}" has different tags/placeholders; using English`);
    s = en;
  }
  return (s ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Path in `lang`: '/blog/' -> '/es/blog/'. */
export const lpath = (lang: string, path: string) => (lang === DEFAULT_LANG ? path : `/${lang}${path}`);

// ---------------------------------------------------------------------------
// Content documents
// ---------------------------------------------------------------------------
const HOME_SECTIONS = ['lpt-what-section', 'lpt-likable-section', 'lpt-social-section', 'lpt-unlikable-section', 'lpt-personality-section', 'lpt-popular-section', 'lpt-tips-section', 'lpt-faq-section', 'lpt-cta-section'];
const homeSections = () => HOME_SECTIONS.map((cls) => enHome.sections.find((s) => s.cls === cls)!);

/** English source of every translatable document (also used by scripts/i18n-extract). */
export function sourceDocs() {
  const docs: Record<string, { meta: Record<string, string>; segments: string[] }> = {};
  docs.home = { meta: {}, segments: homeSections().flatMap((s) => extract(s.html)) };
  docs.quiz = { meta: {}, segments: enQuestions.flatMap((q) => [q.text, q.hook, ...q.options]) };
  for (const p of enPosts) {
    docs[`post-${p.slug}`] = {
      meta: { title: p.title, excerpt: p.excerpt, featuredAlt: p.featured?.alt ?? '', seoTitle: seoOf(p.path).title, seoDescription: seoOf(p.path).description },
      segments: extract(p.html),
    };
  }
  for (const slug of ['privacy-policy', 'terms-conditions']) {
    const pg = enPages[slug];
    docs[`page-${slug}`] = { meta: { title: pg.title, seoTitle: seoOf(pg.path).title, seoDescription: seoOf(pg.path).description }, segments: extract(pg.html!) };
  }
  return docs;
}
function seoOf(path: string) {
  const s = seoMap[path];
  const desc = s?.meta.find((m) => 'name' in m && m.name === 'description')?.content ?? '';
  return { title: s?.title ?? '', description: desc };
}

let sourceCache: ReturnType<typeof sourceDocs> | null = null;
const sources = () => (sourceCache ??= sourceDocs());

/** Validated translation of a document, or null when missing/stale/broken. */
const translatedCache = new Map<string, ReturnType<typeof validate>>();
function translated(lang: string, name: string) {
  const key = `${lang}/${name}`;
  if (!translatedCache.has(key)) translatedCache.set(key, validate(lang, name));
  return translatedCache.get(key)!;
}
function validate(lang: string, name: string) {
  if (lang === DEFAULT_LANG) return null;
  const file = doc(lang, name);
  const src = sources()[name];
  if (!file || !src) return null;
  if (file.source !== hashSegments(src.segments)) {
    warn(`${lang}/${name}: translation is for an older English version; skipped`);
    return null;
  }
  if (file.segments.length !== src.segments.length) {
    warn(`${lang}/${name}: ${file.segments.length} segments, expected ${src.segments.length}; skipped`);
    return null;
  }
  const bad = src.segments.filter((s, i) => !validSegment(s, file.segments[i])).length;
  if (bad) {
    warn(`${lang}/${name}: ${bad} segments with mismatched placeholders; skipped`);
    return null;
  }
  return file;
}

/** Languages whose home page (interface + quiz + home content) is complete. */
let liveCache: Lang[] | null = null;
export const liveLangs = (): Lang[] => (liveCache ??= LANGS.filter((l) => l.code === DEFAULT_LANG || (ui[l.code] && translated(l.code, 'home') && translated(l.code, 'quiz'))));
export const isLive = (code: string) => liveLangs().some((l) => l.code === code);

/** Home sections (same shape as src/data/home.json sections) in `lang`. */
export function homeIn(lang: string) {
  const secs = homeSections();
  const tr = translated(lang, 'home');
  if (!tr) return secs;
  let i = 0;
  return secs.map((s) => {
    const n = extract(s.html).length;
    const part = tr.segments.slice(i, i + n);
    i += n;
    return { ...s, html: apply(s.html, part).html };
  });
}

export function quizIn(lang: string) {
  const tr = translated(lang, 'quiz');
  if (!tr) return enQuestions;
  return enQuestions.map((q, i) => {
    const [text, hook, ...options] = tr.segments.slice(i * 6, i * 6 + 6);
    return { ...q, text, hook, options };
  });
}

function tocFrom(html: string): TocItem[] {
  return [...html.matchAll(/<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)]
    .filter((m) => !/<summary|<details/.test(m[0]))
    .map((m) => ({ level: Number(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, '').trim() }));
}

export type LocalPost = Post & { lang: string; seoTitle?: string; seoDescription?: string };
/** A post in `lang`, or null if it is not translated. English returns the original. */
export function postIn(lang: string, slug: string): LocalPost | null {
  const p = enPosts.find((x) => x.slug === slug);
  if (!p) return null;
  if (lang === DEFAULT_LANG) return { ...p, lang };
  const tr = translated(lang, `post-${slug}`);
  if (!tr) return null;
  const html = apply(p.html, tr.segments).html;
  const m = tr.meta ?? {};
  return {
    ...p,
    lang,
    path: lpath(lang, p.path),
    title: m.title || p.title,
    excerpt: m.excerpt || p.excerpt,
    featured: p.featured ? { ...p.featured, alt: m.featuredAlt || p.featured.alt } : null,
    html,
    toc: p.layout === 'custom' ? p.toc : tocFrom(html),
    seoTitle: m.seoTitle,
    seoDescription: m.seoDescription,
  };
}
export const postsIn = (lang: string) => enPosts.map((p) => postIn(lang, p.slug)).filter(Boolean) as LocalPost[];

export function pageIn(lang: string, slug: string) {
  const pg = enPages[slug];
  if (!pg?.html) return null;
  if (lang === DEFAULT_LANG) return { ...pg, html: pg.html, lang, seoTitle: undefined as string | undefined, seoDescription: undefined as string | undefined };
  const tr = translated(lang, `page-${slug}`);
  if (!tr) return null;
  const html = apply(pg.html, tr.segments).html;
  const m = tr.meta ?? {};
  return { ...pg, lang, path: lpath(lang, pg.path), title: m.title || pg.title, html, toc: tocFrom(html), seoTitle: m.seoTitle, seoDescription: m.seoDescription };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const categoryName = (lang: string, slug: string) => t(lang, `category.${slug}`) || categories.find((c) => c.slug === slug)?.name || slug;
export const formatDateIn = (lang: string, iso: string) =>
  new Date(iso).toLocaleDateString(langOf(lang).tag, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export function readingTimeIn(lang: string, html: string) {
  if (['zh', 'ja', 'ko'].includes(lang)) {
    const chars = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
    return Math.max(1, Math.round(chars / 450));
  }
  return enReadingTime(html);
}

/** Every language a given English path exists in (for hreflang + switcher). */
export function alternates(enPath: string): { lang: Lang; href: string }[] {
  const exists = (code: string) => {
    if (code === DEFAULT_LANG) return true;
    if (!isLive(code)) return false;
    const slug = enPath.replace(/^\/|\/$/g, '');
    if (enPath === '/' || ['about', 'contact'].includes(slug)) return true;
    if (slug === 'blog' || slug.startsWith('blog/')) return postsIn(code).length > 0;
    if (enPosts.some((p) => p.slug === slug)) return !!postIn(code, slug);
    if (enPages[slug]?.html) return !!pageIn(code, slug);
    if (slug.startsWith('category/')) return postsIn(code).some((p) => p.categories.includes(slug.split('/')[1]));
    if (slug.startsWith('author/')) return postsIn(code).length > 0;
    return false;
  };
  return LANGS.filter((l) => exists(l.code)).map((l) => ({ lang: l, href: lpath(l.code, enPath) }));
}

/** Quiz strings sent to the browser (fetched from /i18n/quiz-<lang>.json). */
export function quizBundle(lang: string) {
  const keys = Object.keys(enUi).filter((k) => /^(test|band|cat|report)\./.test(k) || /^dim\.\d\.name$/.test(k) || k === 'dim.shortEI');
  const strings = Object.fromEntries(keys.map((k) => [k, t(lang, k)]));
  const learn: Record<string, string> = {
    'First Impressions': 'how-to-make-a-great-first-impression',
    Communication: 'how-to-be-more-likable',
    'Social Skills': 'likeability-in-friendships',
    Empathy: 'the-science-of-likeability-what-psychology-actually-says',
    Positivity: 'am-i-likable-signs',
  };
  const learnMore = Object.fromEntries(Object.entries(learn).map(([cat, slug]) => [cat, postIn(lang, slug) ? lpath(lang, `/${slug}/`) : `/${slug}/`]));
  return { lang, questions: quizIn(lang), strings, learnMore };
}

export const authorName = (lang: string) => (lang === DEFAULT_LANG ? site.author.name : t(lang, 'author.name'));
