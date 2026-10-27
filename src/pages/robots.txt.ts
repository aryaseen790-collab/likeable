import { site } from '../lib/data';
export const GET = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
