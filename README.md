# Likeable Person Test — Social Orbit rebuild

A static rebuild of [likeable-person-test.com](https://likeable-person-test.com) with a 3D "Social Orbit" design. It is built with [Astro](https://astro.build), Three.js, GSAP ScrollTrigger and Lenis. All content, slugs, internal links, images and SEO metadata are imported from the live WordPress site.

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
| `src/scripts/orbit.ts` | The Three.js scene: a shader core with 9 orbiting dimension satellites that react to quiz answers. Lazy-loaded after first paint. |
| `src/scripts/motion.ts` | Site-wide motion: Lenis smooth scroll, drop-from-depth reveals, 3D tilt cards, magnetic buttons, parallax, TOC scroll-spy. |
| `src/scripts/home.ts` | Home page choreography: pinned "drop scroll" cards, horizontal 9-dimension track, orbit modes. |
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

## Performance and accessibility

- The hero headline is the LCP element. The WebGL scene loads on idle and fades in over a CSS fallback orb.
- Initial JS is about 62 KB gzipped; Three.js (about 136 KB gzipped) is a separate lazy chunk.
- Pixel ratio is capped at 1.5, the render loop pauses when the tab is hidden, and low-power devices get fewer particles.
- `prefers-reduced-motion` turns off smooth scroll, pinning and animation. The orb renders still frames only, and all content stays reachable.
- No WebGL means the CSS orb stays. No JS means all content is still visible.
- axe-core (WCAG 2 A/AA) reports no violations on the home page, a post, the guide, the results guide and the blog.
