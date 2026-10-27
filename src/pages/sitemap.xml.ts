import { xml, postUrls, pageUrls, categoryUrls, lastmodOf } from '../lib/sitemap';
import { site } from '../lib/data';

export function GET() {
  const maps = [
    ['post-sitemap.xml', lastmodOf(postUrls())],
    ['page-sitemap.xml', lastmodOf(pageUrls())],
    ['category-sitemap.xml', lastmodOf(categoryUrls())],
  ];
  return xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps
      .map(([f, m]) => `\t<sitemap>\n\t\t<loc>${site.origin}/${f}</loc>\n\t\t<lastmod>${m}</lastmod>\n\t</sitemap>`)
      .join('\n')}\n</sitemapindex>`,
  );
}
