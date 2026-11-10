import { xml, sitemaps, lastmodOf } from '../lib/sitemap';
import { site } from '../lib/data';

// Sitemap index listing every per-type, per-language sitemap.
export function GET() {
  const items = sitemaps()
    .map((m) => {
      const mod = lastmodOf(m.urls);
      return `\t<sitemap>\n\t\t<loc>${site.origin}/${m.file}</loc>${mod ? `\n\t\t<lastmod>${mod}</lastmod>` : ''}\n\t</sitemap>`;
    })
    .join('\n');
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`);
}
