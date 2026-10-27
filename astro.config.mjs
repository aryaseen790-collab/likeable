import { defineConfig } from 'astro/config';

// URLs mirror the WordPress site exactly: /slug/ with a trailing slash.
export default defineConfig({
  site: 'https://likeable-person-test.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
