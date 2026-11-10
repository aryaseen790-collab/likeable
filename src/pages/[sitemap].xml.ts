// One sitemap per content type and language: page-sitemap.xml, post-sitemap.xml,
// category-sitemap.xml, author-sitemap.xml for English (the original WordPress
// names), and page-sitemap-es.xml etc. for each translated language.
import { urlset, sitemaps } from '../lib/sitemap';

export const getStaticPaths = () => sitemaps().map((m) => ({ params: { sitemap: m.file.replace(/\.xml$/, '') }, props: { urls: m.urls } }));

export const GET = ({ props }: { props: { urls: Parameters<typeof urlset>[0] } }) => urlset(props.urls);
