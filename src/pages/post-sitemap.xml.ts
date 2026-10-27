import { urlset, postUrls } from '../lib/sitemap';
export const GET = () => urlset(postUrls());
