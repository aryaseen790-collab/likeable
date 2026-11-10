import { posts, pages, categories, site } from './data';
import { alternates, DEFAULT_LANG } from './i18n';
import { LANGS } from '../i18n/languages';

type Url = { loc: string; lastmod?: string; images?: string[]; alts?: { tag: string; href: string }[] };
const abs = (p: string) => new URL(p, site.origin).href;
const iso = (d: string) => new Date(d.endsWith('Z') ? d : `${d}Z`).toISOString().replace('.000Z', '+00:00');

export const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });

export function urlset(urls: Url[]) {
  const items = urls
    .map(
      (u) =>
        `\t<url>\n\t\t<loc>${u.loc}</loc>${u.lastmod ? `\n\t\t<lastmod>${u.lastmod}</lastmod>` : ''}${(u.alts ?? [])
          .map((a) => `\n\t\t<xhtml:link rel="alternate" hreflang="${a.tag}" href="${a.href}"/>`)
          .join('')}${(u.images ?? [])
          .map((i) => `\n\t\t<image:image>\n\t\t\t<image:loc>${i}</image:loc>\n\t\t</image:image>`)
          .join('')}\n\t</url>`,
    )
    .join('\n');
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${items}\n</urlset>`);
}

// Every English URL plus its translations, each tagged with its language and
// listing all language versions (hreflang) so search engines can pair them.
type LangUrl = Url & { lang: string };
const withTranslations = (urls: (Url & { enPath: string })[]): LangUrl[] =>
  urls.flatMap(({ enPath, ...u }) => {
    const alts = alternates(enPath);
    if (alts.length < 2) return [{ ...u, lang: DEFAULT_LANG }];
    const links = [...alts.map((a) => ({ tag: a.lang.tag, href: abs(a.href) })), { tag: 'x-default', href: abs(enPath) }];
    return alts.map((a) => ({ ...u, lang: a.lang.code, loc: abs(a.href), alts: links, images: a.lang.code === DEFAULT_LANG ? u.images : undefined }));
  });

const imagesIn = (html: string) => [...new Set([...html.matchAll(/<img[^>]+src="(\/wp-content\/uploads\/[^"]+)"/g)].map((m) => abs(m[1])))];
const newestPost = () => posts.map((p) => p.modified).sort().pop()!;

const postUrls = (): LangUrl[] =>
  withTranslations(posts.map((p) => ({ enPath: p.path, loc: abs(p.path), lastmod: iso(p.modified), images: [...(p.featured ? [abs(p.featured.src)] : []), ...imagesIn(p.html)] })));

const pageUrls = (): LangUrl[] =>
  withTranslations([
    { enPath: '/', loc: abs('/'), lastmod: iso(newestPost()) },
    ...['blog', 'privacy-policy', 'terms-conditions'].map((s) => ({ enPath: pages[s].path, loc: abs(pages[s].path), lastmod: iso(s === 'blog' ? newestPost() : pages[s].modified) })),
    { enPath: '/about/', loc: abs('/about/') },
    { enPath: '/contact/', loc: abs('/contact/') },
  ]);

const categoryUrls = (): LangUrl[] =>
  withTranslations(
    categories.map((c) => {
      const latest = posts.filter((p) => p.categories.includes(c.slug)).map((p) => p.modified).sort().pop();
      return { enPath: c.path, loc: abs(c.path), lastmod: latest ? iso(latest) : undefined };
    }),
  );

const authorUrls = (): LangUrl[] => {
  const enPath = `/author/${site.author.slug}/`;
  return withTranslations([{ enPath, loc: abs(enPath), lastmod: iso(newestPost()) }]);
};

const KINDS = { page: pageUrls, post: postUrls, category: categoryUrls, author: authorUrls } as const;
export type Kind = keyof typeof KINDS;

/** File name of one sitemap: English keeps the original WordPress names. */
export const sitemapFile = (kind: Kind, lang: string) => (lang === DEFAULT_LANG ? `${kind}-sitemap.xml` : `${kind}-sitemap-${lang}.xml`);

/** Every non-empty (kind, language) sitemap, in index order. */
export function sitemaps() {
  const out: { kind: Kind; lang: string; file: string; urls: Url[] }[] = [];
  for (const l of LANGS) {
    for (const kind of Object.keys(KINDS) as Kind[]) {
      const urls = KINDS[kind]().filter((u) => u.lang === l.code).map(({ lang: _l, ...u }) => u);
      if (urls.length) out.push({ kind, lang: l.code, file: sitemapFile(kind, l.code), urls });
    }
  }
  return out;
}

export const lastmodOf = (urls: Url[]) => urls.map((u) => u.lastmod ?? '').sort().pop() || undefined;
