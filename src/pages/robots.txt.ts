import { site } from '../lib/data';
import { sitemaps } from '../lib/sitemap';

// The index first, then every individual sitemap (one per content type and language).
export const GET = () =>
  new Response(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${site.origin}/sitemap.xml`, ...sitemaps().map((m) => `Sitemap: ${site.origin}/${m.file}`), ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
