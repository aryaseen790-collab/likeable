import { urlset, pageUrls } from '../lib/sitemap';
export const GET = () => urlset(pageUrls());
