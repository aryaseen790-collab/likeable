import { posts, pages, categories, site } from './data';

type Url = { loc: string; lastmod?: string; images?: string[] };
const abs = (p: string) => new URL(p, site.origin).href;
const iso = (d: string) => new Date(d.endsWith('Z') ? d : `${d}Z`).toISOString().replace('.000Z', '+00:00');

export const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });

export function urlset(urls: Url[]) {
  const items = urls
    .map(
      (u) =>
        `\t<url>\n\t\t<loc>${u.loc}</loc>${u.lastmod ? `\n\t\t<lastmod>${u.lastmod}</lastmod>` : ''}${(u.images ?? [])
          .map((i) => `\n\t\t<image:image>\n\t\t\t<image:loc>${i}</image:loc>\n\t\t</image:image>`)
          .join('')}\n\t</url>`,
    )
    .join('\n');
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${items}\n</urlset>`);
}

const imagesIn = (html: string) => [...new Set([...html.matchAll(/<img[^>]+src="(\/wp-content\/uploads\/[^"]+)"/g)].map((m) => abs(m[1])))];

export const postUrls = (): Url[] =>
  posts.map((p) => ({ loc: abs(p.path), lastmod: iso(p.modified), images: [...(p.featured ? [abs(p.featured.src)] : []), ...imagesIn(p.html)] }));

export const pageUrls = (): Url[] => {
  const newest = posts.map((p) => p.modified).sort().pop()!;
  return [
    { loc: abs('/'), lastmod: iso(newest) },
    ...['blog', 'privacy-policy', 'terms-conditions'].map((s) => ({ loc: abs(pages[s].path), lastmod: iso(pages[s].modified) })),
    { loc: abs('/about/') },
    { loc: abs('/contact/') },
  ];
};

export const categoryUrls = (): Url[] =>
  categories.map((c) => {
    const latest = posts.filter((p) => p.categories.includes(c.slug)).map((p) => p.modified).sort().pop();
    return { loc: abs(c.path), lastmod: latest ? iso(latest) : undefined };
  });

export const lastmodOf = (urls: Url[]) => urls.map((u) => u.lastmod ?? '').sort().pop();
