import postsJson from '../data/posts.json';
import pagesJson from '../data/pages.json';
import categoriesJson from '../data/categories.json';
import siteJson from '../data/site.json';
import seoJson from '../data/seo.json';
import homeJson from '../data/home.json';
import questionsJson from '../data/questions.json';

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

export const site = siteJson;
export const posts = postsJson as Post[];
export const pages = pagesJson as Record<string, { slug: string; path: string; title: string; date: string; modified: string; toc: TocItem[]; html?: string; intro?: string }>;
export const categories = categoriesJson as Category[];
export const seo = seoJson as Record<string, Seo>;
export const home = homeJson;
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
