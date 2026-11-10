// Post-build: shrink every generated HTML page in dist/.
// - JSON-LD blocks are re-serialised compactly, minus the duplicated articleBody
//   text and repeated @graph nodes (see slimJsonLd)
// - whitespace collapsed conservatively (runs become one space, so text spacing
//   between inline elements is kept), comments removed, inline JS/CSS minified
// Attribute quotes are kept: scripts/rebase.mjs and scripts/check-links.mjs read them.
import fs from 'node:fs';
import path from 'node:path';
import { minify } from 'html-minifier-terser';

const DIST = path.resolve('dist');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

// Article nodes from the old SEO plugin carry the whole article again as
// `articleBody` (up to 34 KB). The text is already on the page and Google's
// Article rich results do not use it, so it is dropped. Exact duplicate nodes
// in a @graph (the plugin emits the BreadcrumbList twice) are dropped too.
const slimNode = (node) => {
  if (Array.isArray(node)) node.forEach(slimNode);
  else if (node && typeof node === 'object') {
    const types = [].concat(node['@type'] || []);
    if (types.some((t) => /Article|BlogPosting/.test(t))) delete node.articleBody;
    Object.values(node).forEach(slimNode); // nested nodes (e.g. WebPage.mainEntity)
  }
  return node;
};
const slimJsonLd = (data) => {
  if (Array.isArray(data['@graph'])) {
    const seen = new Set();
    data['@graph'] = data['@graph'].map(slimNode).filter((n) => {
      const key = JSON.stringify(n);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else slimNode(data);
  return data;
};
const compactJsonLd = (html) =>
  html.replace(/(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (whole, open, body, close) => {
    try {
      return open + JSON.stringify(slimJsonLd(JSON.parse(body))).replace(/<\//g, '<\\/') + close;
    } catch {
      return whole; // leave anything that is not strict JSON untouched
    }
  });

const files = walk(DIST).filter((f) => f.endsWith('.html'));
let before = 0;
let after = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const out = await minify(compactJsonLd(src), {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyJS: true,
    minifyCSS: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    keepClosingSlash: false,
    caseSensitive: false,
  });
  fs.writeFileSync(file, out);
  before += Buffer.byteLength(src);
  after += Buffer.byteLength(out);
}
console.log(`minified ${files.length} HTML files: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (${Math.round((1 - after / before) * 100)}% smaller)`);
