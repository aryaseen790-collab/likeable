import { defineConfig } from 'astro/config';

// URLs mirror the WordPress site exactly: /slug/ with a trailing slash.
export default defineConfig({
  site: 'https://likeable-person-test.com',
  // SITE_BASE is only set for the GitHub Pages preview (served under /likeable/).
  base: process.env.SITE_BASE || '/',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
