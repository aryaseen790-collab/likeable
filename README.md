# Likeable Person Test — Social Orbit rebuild

A static rebuild of [likeable-person-test.com](https://likeable-person-test.com) with a 3D emoji "Social Orbit", light and dark themes, and a bento-style homepage. It is built with [Astro](https://astro.build) and Three.js. All content, slugs, internal links, images and SEO metadata are imported from the live WordPress site.

See [`docs/REDESIGN_PLAN.md`](docs/REDESIGN_PLAN.md) for the audit and design plan behind it.

## Quick start

```bash
npm ci
npm run dev        # http://localhost:4321
npm run verify     # type-check + build + link/URL parity check
```

Requires Node 22.12+ (`.nvmrc`).

## What's in the box

| Path | What it is |
|---|---|
| `scripts/import-wp.mjs` | Pulls posts, pages, categories, media, quiz questions and per-URL SEO head tags from the WordPress REST API and rendered pages. It converts Kadence block markup to clean semantic HTML and downloads every image to `public/wp-content/uploads/…` (same paths as WordPress). |
| `src/data/*.json` | Imported content (committed, so builds never depend on WordPress). |
| `src/pages/` | Routes that mirror WordPress exactly: `/`, `/[slug]/`, `/blog/`, `/blog/page/N/`, `/page/N/`, `/category/[slug]/`, `/author/admin/`, plus `/about/` and `/contact/`, which the content links to. |
| `src/pages/*sitemap.xml.ts` | Same sitemap URLs as All in One SEO: `sitemap.xml`, `post-`, `page-`, `category-sitemap.xml`. |
| `src/scripts/orbit.ts` | The Three.js scene: an emoji face (you) with the 9 dimension emojis in orbit. Answers pull each one closer, and the face brightens with your score. Lazy-loaded, rendered only while visible, and moved between the hero, quiz and result panels. |
| `src/scripts/motion.ts` | Site-wide motion with no scroll-jacking: IntersectionObserver reveals (CSS transform/opacity only), hover tilt, TOC scroll-spy, reading-progress bar. |
| `src/scripts/home.ts` | Home page wiring: lazy orbit, quiz ↔ orbit hooks, theme sync. |
| `src/lib/topics.ts` | Rebuilds the imported home sections as bento "topics" (same text, same order). |
| `src/scripts/quiz.ts` | The 25-question test. It keeps the original questions, scoring and feedback copy, and adds keyboard/swipe input, resume, a radar chart, shareable result links (`/?r=…`) and the text report download. |
| `scripts/check-links.mjs` | Fails the build if any internal link, image or legacy WordPress URL is missing. |

## Updating content

Content still lives in WordPress. To pull changes:

```bash
npm run import     # refreshes src/data and downloads any new images
npm run verify
```

The importer caches HTTP responses in `.cache/wp/`. Delete that folder to force a fresh pull.

## Deploying (Cloudflare Pages)

The domain is already on Cloudflare, so Pages is the simplest host:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `NODE_VERSION=22`

`public/_redirects` maps the old `/feed/` URLs to `/rss.xml`. `public/_headers` sets long-lived caching for hashed assets and uploads.

Before switching DNS, run `npm run verify`. Then spot-check a few URLs on the Pages preview domain.

## Themes

Light is the default. The sun/moon button in the header switches themes, and the choice is stored in `localStorage` (`lpt-theme`) and applied before first paint. Colours are CSS custom properties in `src/styles/global.css`, under `:root[data-theme='light']` and `:root[data-theme='dark']`.

## Performance and accessibility

- The hero headline is the LCP element. The WebGL scene loads on idle and fades in over a static CSS emoji orbit.
- Initial JS is about 10 KB gzipped; Three.js (about 134 KB gzipped) is a separate lazy chunk.
- Scrolling is native, with no smooth-scroll library, pinning or scroll-scrubbed tweens. Reveals touch only `transform` and `opacity`, and there is no `backdrop-filter` except on the header.
- Pixel ratio is capped. The render loop runs only while the orbit panel is on screen and the tab is visible.
- `prefers-reduced-motion` turns off reveals and animation; the orbit renders still frames only.
- Without WebGL, a CSS emoji orbit stays in place. Without JS, all content is still visible.
- axe-core (WCAG 2 A/AA) reports no violations on the home page, a post, the guide, the results guide and the blog, in both themes.
