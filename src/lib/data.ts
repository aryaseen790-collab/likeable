import postsJson from '../data/posts.json';
import pagesJson from '../data/pages.json';
import categoriesJson from '../data/categories.json';
import siteJson from '../data/site.json';
import seoJson from '../data/seo.json';
import homeJson from '../data/home.json';
import questionsJson from '../data/questions.json';
import fs from 'node:fs';
import path from 'node:path';

export type Featured = { src: string; width: number; height: number; alt: string; srcset: string; sizes: Record<string, string> };
export type TocItem = { id: string; text: string; level: number };
export type Post = {
  id: number; slug: string; path: string; title: string; date: string; modified: string; excerpt: string;
  categories: string[]; featured: Featured | null; layout: 'article' | 'custom'; toc: TocItem[]; schema: string[]; html: string;
};
export type Category = { id: number; slug: string; name: string; description: string; count: number; path: string };
export type Seo = {
  title: string; canonical: string | null; prev: string | null; next: string | null;
  meta: ({ name: string; content: string } | { property: string; content: string })[]; jsonld: string[];
};

// Imported images: lazy-load them, and add a srcset from the resized copies
// WordPress generated (name-300x200.webp etc., downloaded next to the original).
const UPLOADS = path.resolve('public');
const variantCache = new Map<string, string>();
// Pixel width from a PNG / WebP / JPEG header (no image library needed).
function widthOf(file: string): number | undefined {
  try {
    const b = fs.readFileSync(file);
    if (b.readUInt32BE(0) === 0x89504e47) return b.readUInt32BE(16);
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = b.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return 1 + b.readUIntLE(24, 3);
      if (chunk === 'VP8 ') return b.readUInt16LE(26) & 0x3fff;
      if (chunk === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21]);
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      for (let i = 2; i < b.length; ) {
        const marker = b[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return b.readUInt16BE(i + 7);
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch {}
  return undefined;
}
function srcsetFor(src: string) {
  if (variantCache.has(src)) return variantCache.get(src)!;
  let out = '';
  const m = src.match(/^(\/wp-content\/uploads\/.+\/)([^/]+?)\.(webp|jpe?g|png)$/i);
  if (m) {
    try {
      const [, dir, base, ext] = m;
      const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)x\\d+\\.${ext}$`);
      const sizes = fs
        .readdirSync(path.join(UPLOADS, dir))
        .map((f) => [f, f.match(re)?.[1]] as const)
        .filter(([, w]) => w && Number(w) > 150)
        .sort((a, b) => Number(a[1]) - Number(b[1]));
      const full = widthOf(path.join(UPLOADS, src));
      if (sizes.length) out = [...sizes.map(([f, w]) => `${dir}${f} ${w}w`), ...(full ? [`${src} ${full}w`] : [])].join(', ');
    } catch {}
  }
  variantCache.set(src, out);
  return out;
}
export function enhanceImages(html: string, sizes = '(max-width: 860px) 100vw, 800px') {
  return html.replace(/<img\b([^>]*)>/g, (_tag, attrs: string) => {
    let a = attrs;
    if (!/\sloading=/.test(a)) a += ' loading="lazy"';
    if (!/\sdecoding=/.test(a)) a += ' decoding="async"';
    if (!/\ssrcset=/.test(a)) {
      const src = a.match(/\ssrc="([^"]+)"/)?.[1];
      const set = src && srcsetFor(src);
      if (set) a += ` srcset="${set}" sizes="${sizes}"`;
    }
    return `<img${a}>`;
  });
}

export const site = siteJson;
export const posts = (postsJson as Post[]).map((p) => ({ ...p, html: enhanceImages(p.html) }));
export const pages = Object.fromEntries(
  Object.entries(pagesJson as Record<string, { slug: string; path: string; title: string; date: string; modified: string; toc: TocItem[]; html?: string; intro?: string }>).map(
    ([k, v]) => [k, v.html ? { ...v, html: enhanceImages(v.html) } : v],
  ),
);
export const categories = categoriesJson as Category[];
export const seo = seoJson as Record<string, Seo>;
export const home = { ...homeJson, sections: homeJson.sections.map((x) => ({ ...x, html: enhanceImages(x.html, '(max-width: 620px) 100vw, (max-width: 900px) 50vw, 400px') })) };
export const questions = questionsJson as { text: string; options: string[]; hook: string; category: string }[];

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
export const postsIn = (slug: string) => posts.filter((p) => p.categories.includes(slug));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const readingTime = (html: string) => {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
};

export function paginate<T>(items: T[], perPage: number) {
  const total = Math.max(1, Math.ceil(items.length / perPage));
  return Array.from({ length: total }, (_, i) => ({ page: i + 1, total, items: items.slice(i * perPage, (i + 1) * perPage) }));
}

export function related(post: Post, n = 3) {
  const same = posts.filter((p) => p.slug !== post.slug && p.categories.some((c) => post.categories.includes(c)));
  const rest = posts.filter((p) => p.slug !== post.slug && !same.includes(p));
  return [...same, ...rest].slice(0, n);
}

// The 9 dimensions, with the descriptions written in the Complete Guide.
export function dimensions() {
  const guide = posts.find((p) => p.slug === 'complete-guide')!;
  const cards = [...guide.html.matchAll(/<div class="lpt-dim-card">([\s\S]*?)<\/div>\s*<\/div>/g)];
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
  return cards.map((m) => {
    const icon = m[1].match(/lpt-dim-icon">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const name = m[1].match(/lpt-dim-name">([\s\S]*?)<\/div>/)?.[1] ?? '';
    const desc = m[1].match(/lpt-dim-desc">([\s\S]*?)$/)?.[1] ?? '';
    return { icon: strip(icon), name: strip(name), desc: strip(desc) };
  });
}
