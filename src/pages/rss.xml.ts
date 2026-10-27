import { posts, site, categoryBySlug } from '../lib/data';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function GET() {
  const items = posts
    .map(
      (p) => `<item><title>${esc(p.title)}</title><link>${site.origin}${p.path}</link><guid isPermaLink="true">${site.origin}${p.path}</guid><pubDate>${new Date(p.date + 'Z').toUTCString()}</pubDate>${p.categories
        .map((c) => `<category>${esc(categoryBySlug(c)?.name ?? c)}</category>`)
        .join('')}<description>${esc(p.excerpt)}</description></item>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)}</title><link>${site.origin}/</link><description>${esc(site.tagline)}</description><language>en-US</language>${items}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
}
