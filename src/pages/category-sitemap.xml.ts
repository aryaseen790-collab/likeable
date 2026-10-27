import { urlset, categoryUrls } from '../lib/sitemap';
export const GET = () => urlset(categoryUrls());
