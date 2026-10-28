// Imports the live WordPress site (likeable-person-test.com) into static data
// files used by the Astro build:
//   - src/data/*.json          posts, pages, categories, home sections, SEO head per URL
//   - public/wp-content/uploads/...  every referenced image, at the exact same path
//
// Run with `npm run import`. Output is committed, so builds never depend on WordPress.
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://likeable-person-test.com';
const API = `${ORIGIN}/wp-json/wp/v2`;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'src/data');
const PUBLIC = path.join(ROOT, 'public');
const CACHE = path.join(ROOT, '.cache/wp');
const UA = { 'user-agent': 'Mozilla/5.0 (likeable-site-import)' };

const images = new Set();

async function get(url, { json = true } = {}) {
  const key = path.join(CACHE, encodeURIComponent(url));
  try {
    const hit = await fs.readFile(key, 'utf8');
    return json ? JSON.parse(hit) : hit;
  } catch {}
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const body = await res.text();
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(key, body);
      return json ? JSON.parse(body) : body;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
}

const decodeCfEmail = (hex) => {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
};

const slugify = (s) =>
  s.toLowerCase().replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// Absolute site URL -> root-relative path with WordPress-style trailing slash.
function localUrl(href) {
  if (!href || href.startsWith('#')) return href;
  let u;
  try {
    u = new URL(href, ORIGIN);
  } catch {
    return href;
  }
  if (u.hostname !== 'likeable-person-test.com') return href;
  if (u.pathname.startsWith('/wp-content/uploads/')) {
    images.add(u.pathname);
    return u.pathname;
  }
  if (u.pathname.startsWith('/cdn-cgi/l/email-protection')) return `mailto:${decodeCfEmail(u.hash.slice(1))}`;
  let p = u.pathname;
  if (!p.endsWith('/') && !path.extname(p)) p += '/';
  return p + u.search + u.hash;
}

function localSrcset(srcset) {
  return srcset
    .split(',')
    .map((part) => {
      const [url, w] = part.trim().split(/\s+/);
      return `${localUrl(url)} ${w || ''}`.trim();
    })
    .join(', ');
}

// ---------------------------------------------------------------------------
// Content cleaning: Kadence/Gutenberg markup -> semantic HTML
// ---------------------------------------------------------------------------
const KEEP_ATTRS = new Set(['href', 'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'id', 'colspan', 'rowspan', 'title', 'target', 'rel', 'datetime', 'open', 'scope']);

function cleanHtml(html, { keepClassPrefixes = [], dropPostGrids = true } = {}) {
  const $ = cheerio.load(html, null, false);
  const schema = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    schema.push($(el).html().trim());
  });
  $('style, script, link, noscript, meta, svg').remove();
  $('*').contents().filter((_, n) => n.type === 'comment').remove();
  $('.kb-table-of-content-nav, .kb-table-of-content-wrap').remove();
  if (dropPostGrids) $('.wp-block-kadence-postgrid, .kt-blocks-post-loop-block, .kt-post-grid-wrap').remove();
  $('.kt-blocks-accordion-icon-trigger, .lpt-faq-chevron').remove();

  // Cloudflare-obfuscated emails
  $('[data-cfemail]').each((_, el) => {
    $(el).replaceWith(decodeCfEmail($(el).attr('data-cfemail')));
  });

  // Kadence accordion -> <details>
  $('.wp-block-kadence-accordion').each((_, acc) => {
    const items = $(acc)
      .find('.kt-accordion-pane')
      .map((_, pane) => {
        const q = $(pane).find('.kt-blocks-accordion-title').first().text().trim();
        const a = $(pane).find('.kt-accordion-panel-inner').first().html() || '';
        return `<details><summary>${q}</summary><div class="faq-a">${a}</div></details>`;
      })
      .get();
    $(acc).replaceWith(`<div class="faq-list">${items.join('')}</div>`);
  });

  // Custom guide/results/home FAQ markup -> <details>
  $('.lpt-faq-item, .lptr-faq-item').each((_, item) => {
    const $i = $(item);
    const q = $i.find('.lpt-faq-q, .lptr-faq-q, .lpt-faq-question').first();
    const a = $i.find('.lpt-faq-a, .lptr-faq-a, .lpt-faq-answer-inner, .lpt-faq-answer').first();
    $i.replaceWith(`<details class="${$i.attr('class')}"><summary>${q.text().trim()}</summary><div class="faq-a">${a.html() || ''}</div></details>`);
  });

  // Kadence buttons -> plain links
  $('.wp-block-kadence-advancedbtn').each((_, wrap) => {
    const links = $(wrap)
      .find('a')
      .map((_, a) => `<a class="btn" href="${$(a).attr('href')}">${$(a).text().trim()}</a>`)
      .get();
    $(wrap).replaceWith(`<p class="btn-row">${links.join(' ')}</p>`);
  });

  // Kadence advanced headings keep their tag but lose wrappers
  $('.wp-block-kadence-advancedheading').each((_, el) => {
    const tag = el.tagName;
    const cls = /^h[1-6]$/.test(tag) ? '' : ' class="cta-title"';
    $(el).replaceWith(`<${/^h[1-6]$/.test(tag) ? tag : 'p'}${cls}>${$(el).html()}</${/^h[1-6]$/.test(tag) ? tag : 'p'}>`);
  });

  // CTA panels (Kadence column with background overlay)
  $('.kb-section-has-overlay').each((_, el) => {
    el.tagName = 'aside';
    $(el).attr('class', 'cta-box');
  });

  // Images: local paths, keep responsive attributes
  $('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('data-src') || $img.attr('src');
    $img.attr('src', localUrl(src));
    const srcset = $img.attr('data-srcset') || $img.attr('srcset');
    if (srcset) $img.attr('srcset', localSrcset(srcset));
    else $img.removeAttr('sizes');
    $img.attr('loading', 'lazy').attr('decoding', 'async');
    if (!$img.attr('alt')) $img.attr('alt', '');
  });
  $('a[href]').each((_, a) => {
    $(a).attr('href', localUrl($(a).attr('href')));
  });

  // Unwrap layout-only wrappers
  const unwrapSel = [
    '.wp-block-columns', '.wp-block-column', '.wp-block-kadence-column:not(.cta-box)', '.kt-inside-inner-col',
    '.wp-block-kadence-rowlayout', '.kt-row-column-wrap', '.wp-block-kadence-image', '.kb-row-layout-wrap',
    '.wp-block-group', '.wp-block-group__inner-container', '.kadence-column-wrap',
  ].join(',');
  for (let pass = 0; pass < 6; pass++) {
    const els = $(unwrapSel).toArray();
    if (!els.length) break;
    for (const el of els) $(el).replaceWith($(el).contents());
  }
  // Kadence wraps the custom guide/results/home markup in a column div with a generated class.
  $('div[class*="kadence-column"]').each((_, el) => {
    $(el).replaceWith($(el).contents());
  });

  // Strip presentational attributes; keep only meaningful classes.
  const KEEP_CLASSES = new Set(['btn', 'btn-row', 'cta-box', 'cta-title', 'faq-list', 'faq-a']);
  $('*').each((_, el) => {
    const $el = $(el);
    const cls = ($el.attr('class') || '')
      .split(/\s+/)
      .filter((c) => KEEP_CLASSES.has(c) || keepClassPrefixes.some((p) => c.startsWith(p)) || ['excellent', 'good', 'average', 'low'].includes(c));
    for (const name of Object.keys(el.attribs || {})) {
      if (name === 'class') continue;
      if (!KEEP_ATTRS.has(name) && !name.startsWith('aria-') && !(name === 'style' && /--/.test(el.attribs.style))) $el.removeAttr(name);
    }
    if (cls.length) $el.attr('class', cls.join(' '));
    else $el.removeAttr('class');
  });
  // Repair links that an unclosed <a> in the source spread across later blocks.
  $('a').each((_, a) => {
    const $a = $(a);
    if ($a.find('div, p, h1, h2, h3, h4, h5, h6, ul, ol').length) $a.replaceWith($a.contents());
  });
  $('a').each((_, a) => {
    const $a = $(a);
    if (!$a.text().trim() && !$a.find('img').length) $a.remove();
  });

  // Headings: stable ids for anchors / TOC
  const toc = [];
  const used = new Set($('[id]').map((_, e) => $(e).attr('id')).get());
  $('h2, h3').each((_, h) => {
    const $h = $(h);
    if ($h.closest('summary, details, nav, aside').length) return;
    let id = $h.attr('id');
    if (!id) {
      const base = slugify($h.text()) || 'section';
      id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      $h.attr('id', id);
    }
    toc.push({ id, text: $h.text().trim(), level: Number(h.tagName[1]) });
  });
  $('p').each((_, p) => {
    if (!$(p).text().trim() && !$(p).find('img, a, iframe').length) $(p).remove();
  });
  $('figure:empty, div:empty, span:empty').remove();

  const out = $.html().replace(/\n{3,}/g, '\n\n').trim();
  return { html: out, toc, schema };
}

// ---------------------------------------------------------------------------
// SEO head capture from the rendered pages (AIOSEO output)
// ---------------------------------------------------------------------------
function captureHead(html) {
  const $ = cheerio.load(html);
  const meta = [];
  $('head meta').each((_, m) => {
    const name = $(m).attr('name');
    const property = $(m).attr('property');
    const content = $(m).attr('content');
    if (!content) return;
    if (name && ['viewport', 'generator', 'msapplication-TileImage'].includes(name)) return;
    if (name) meta.push({ name, content: localizeOg(name, content) });
    else if (property) meta.push({ property, content: localizeOg(property, content) });
  });
  const jsonld = $('head script[type="application/ld+json"]')
    .map((_, s) => $(s).html().trim())
    .get();
  return {
    title: $('head title').first().text().trim(),
    canonical: $('link[rel="canonical"]').attr('href') || null,
    prev: $('link[rel="prev"]').attr('href') || null,
    next: $('link[rel="next"]').attr('href') || null,
    meta,
    jsonld,
  };
}
// og/twitter images stay absolute (they must be), but must also exist locally.
function localizeOg(key, content) {
  if (/image/.test(key) && content.includes('/wp-content/uploads/')) localUrl(content);
  return content;
}

// ---------------------------------------------------------------------------
async function downloadImages() {
  let fetched = 0;
  await Promise.all(
    [...images].map(async (p, i) => {
      const dest = path.join(PUBLIC, decodeURIComponent(p));
      try {
        await fs.access(dest);
        return;
      } catch {}
      await new Promise((r) => setTimeout(r, (i % 8) * 50));
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await fetch(ORIGIN + p, { headers: UA });
          if (!res.ok) throw new Error(`${res.status} ${p}`);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
          fetched++;
          return;
        } catch (err) {
          if (attempt >= 4) {
            console.warn('  ! image failed', p, err.message);
            return;
          }
          await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        }
      }
    }),
  );
  return fetched;
}

const text = (html) => cheerio.load(`<div>${html}</div>`)('div').text().replace(/\s+/g, ' ').trim();

async function main() {
  await fs.mkdir(DATA, { recursive: true });
  const [posts, pages, categories, media, users] = await Promise.all([
    get(`${API}/posts?per_page=100`),
    get(`${API}/pages?per_page=100`),
    get(`${API}/categories?per_page=100`),
    get(`${API}/media?per_page=100`),
    get(`${API}/users`),
  ]);

  // Every size of every media item, so srcsets and featured images resolve.
  const mediaById = new Map();
  for (const m of media) {
    const sizes = m.media_details?.sizes || {};
    for (const s of Object.values(sizes)) localUrl(s.source_url);
    localUrl(m.source_url);
    const srcset = Object.values(sizes)
      .filter((s) => !/-150x150\./.test(s.source_url))
      .sort((a, b) => a.width - b.width)
      .map((s) => `${localUrl(s.source_url)} ${s.width}w`);
    mediaById.set(m.id, {
      src: localUrl(m.source_url),
      width: m.media_details?.width,
      height: m.media_details?.height,
      alt: m.alt_text || text(m.title.rendered),
      srcset: srcset.join(', '),
      sizes: Object.fromEntries(Object.entries(sizes).map(([k, s]) => [k, localUrl(s.source_url)])),
    });
  }

  const catById = new Map(categories.map((c) => [c.id, c]));
  const CUSTOM = new Set(['complete-guide', 'likeable-person-test-results']);

  const postData = posts
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => {
      const custom = CUSTOM.has(p.slug);
      const { html, toc, schema } = cleanHtml(p.content.rendered, {
        keepClassPrefixes: custom ? ['lpt-', 'lptr-'] : [],
      });
      return {
        id: p.id,
        slug: p.slug,
        path: `/${p.slug}/`,
        title: text(p.title.rendered),
        date: p.date,
        modified: p.modified,
        excerpt: text(p.excerpt.rendered),
        categories: p.categories.map((id) => catById.get(id)?.slug).filter(Boolean),
        featured: mediaById.get(p.featured_media) || null,
        layout: custom ? 'custom' : 'article',
        toc,
        schema,
        html,
      };
    });

  const pageData = {};
  for (const p of pages) {
    if (p.slug === 'home') continue;
    const { html, toc } = cleanHtml(p.content.rendered);
    pageData[p.slug] = {
      id: p.id,
      slug: p.slug,
      path: `/${p.slug}/`,
      title: text(p.title.rendered),
      date: p.date,
      modified: p.modified,
      toc,
      html,
    };
  }
  // The blog page is a heading + intro + post grid; keep only the intro copy.
  {
    const $ = cheerio.load(pages.find((p) => p.slug === 'blog').content.rendered, null, false);
    pageData.blog.intro = $('p').map((_, p) => $(p).text().trim()).get().filter(Boolean)[0] || '';
    delete pageData.blog.html;
  }

  // Home page: split the custom markup into its sections.
  const home = pages.find((p) => p.slug === 'home');
  const $home = cheerio.load(home.content.rendered, null, false);
  const homeSections = [];
  $home('section').each((_, s) => {
    const cls = ($home(s).attr('class') || '').split(' ')[0];
    const { html } = cleanHtml($home.html(s), { keepClassPrefixes: ['lpt-'], dropPostGrids: true });
    homeSections.push({ cls, id: $home(s).attr('id') || null, html });
  });
  // The "Our Blog" intro column between the tips and the FAQ.
  const blogCol = $home('div[class*="kadence-column53"]').first();
  const homeBlog = {
    heading: blogCol.find('h2').first().text().trim(),
    intro: blogCol.find('p').map((_, p) => $home(p).text().trim()).get().filter(Boolean),
  };

  // The 25 quiz questions live in an inline script on the home page.
  const quizScript = $home('script').map((_, s) => $home(s).html()).get().find((s) => s.includes('lptQuestions'));
  const questions = JSON.parse(
    quizScript
      .match(/var lptQuestions = (\[[\s\S]*?\]);/)[1]
      .replace(/([{,])\s*(text|options|hook|category)\s*:/g, '$1"$2":'),
  );

  // Rendered HTML for SEO head + pagination facts.
  const paths = [
    '/', '/blog/', '/blog/page/2/', '/page/2/', '/privacy-policy/', '/terms-conditions/', '/author/admin/',
    ...posts.map((p) => `/${p.slug}/`),
    ...categories.filter((c) => c.count > 0).map((c) => `/category/${c.slug}/`),
  ];
  const seo = {};
  let blogPerPage = 0;
  let homePerPage = 0;
  for (const p of paths) {
    const html = await get(ORIGIN + p, { json: false });
    seo[p] = captureHead(html);
    const $ = cheerio.load(html);
    if (p === '/blog/') blogPerPage = $('.kt-blocks-post-grid-item, article.post').length;
    if (p === '/') homePerPage = $('.wp-block-kadence-postgrid article, article.post').length;
    // logos, favicons
    $('link[rel*="icon"]').each((_, l) => localUrl($(l).attr('href')));
  }

  // Header logo + footer logo
  const homeHtml = await get(ORIGIN + '/', { json: false });
  const $h = cheerio.load(homeHtml);
  const logoImg = $h('header img').first();
  const footerText = $h('footer p').map((_, p) => $h(p).text().trim()).get().filter(Boolean);
  const icons = $h('link[rel*="icon"]').map((_, l) => ({ rel: $h(l).attr('rel'), sizes: $h(l).attr('sizes') || null, href: localUrl($h(l).attr('href')) })).get();

  const site = {
    name: 'Likeable Person Test Online',
    origin: ORIGIN,
    tagline: 'Unlock your social charm. Take the free 5-minute Likeable Person Test and see your score.',
    email: 'info@likeable-person-test.com',
    logo: {
      src: '/wp-content/uploads/2025/12/Header-Logo-Bg.png',
      alt: logoImg.attr('alt') || 'Likeable Person Test Online',
    },
    footerBlurb: footerText.find((t) => t.startsWith('Stop wondering')) || '',
    icons,
    author: { slug: users[0].slug, name: users[0].name, description: users[0].description || '' },
    nav: [
      { label: 'Guide', href: '/complete-guide/' },
      { label: 'Test Results', href: '/likeable-person-test-results/' },
      { label: 'Our Blog', href: '/blog/' },
      { label: 'Privacy Policy', href: '/privacy-policy/' },
      { label: 'Terms & Conditions', href: '/terms-conditions/' },
    ],
    cta: { label: 'Take the test now!', href: '/#take-test' },
    blogPerPage: blogPerPage || 6,
    homePerPage: homePerPage || 6,
  };
  localUrl(ORIGIN + site.logo.src);
  localUrl(ORIGIN + '/wp-content/uploads/2025/12/Likabke-Person-Test-Online-Logo.png');

  const cats = categories
    .filter((c) => c.count > 0)
    .map((c) => ({ id: c.id, slug: c.slug, name: text(c.name), description: c.description, count: c.count, path: `/category/${c.slug}/` }));

  const write = (f, d) => fs.writeFile(path.join(DATA, f), JSON.stringify(d, null, 2) + '\n');
  await write('site.json', site);
  await write('posts.json', postData);
  await write('pages.json', pageData);
  await write('categories.json', cats);
  const homeSchema = $home('script[type="application/ld+json"]').map((_, el) => $home(el).html().trim()).get();
  await write('home.json', { sections: homeSections, blog: homeBlog, schema: homeSchema });
  await write('questions.json', questions);
  await write('seo.json', seo);

  const n = await downloadImages();
  console.log(`posts ${postData.length}, pages ${Object.keys(pageData).length}, categories ${cats.length}, seo ${Object.keys(seo).length}, images ${images.size} (${n} downloaded)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
